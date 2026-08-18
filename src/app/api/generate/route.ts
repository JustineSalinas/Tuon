import Anthropic from "@anthropic-ai/sdk";
import { NextResponse } from "next/server";
import { FieldValue, Timestamp } from "firebase-admin/firestore";

import { adminConfigError, adminDb, verifyRequest } from "@/lib/firebase/admin";
import {
  AI_MODEL,
  MAX_NOTE_CHARS,
  MAX_OUTPUT_TOKENS,
  MIN_NOTE_CHARS,
  normalisePlan,
} from "@/lib/ai/config";
import { ASSISTANT_PREFILL, SYSTEM_PROMPT, buildUserPrompt } from "@/lib/ai/prompt";
import { parseGeneratedStudySet } from "@/lib/ai/schema";
import { currentPeriodStart, isPeriodExpired, readQuota } from "@/lib/quota";
import { isSeniorHigh } from "@/lib/curriculum";
import type { EducationLevel, Plan, Strand } from "@/lib/types";

/** Generation is a slow call; give it room past the default. */
export const maxDuration = 120;

class QuotaExhaustedError extends Error {
  constructor(public resetsAt: Date | null) {
    super("Monthly AI generation limit reached.");
  }
}

export async function POST(request: Request) {
  const configError = adminConfigError();
  if (configError) {
    console.error("[generate] Firebase Admin is not configured:", configError);
    return NextResponse.json(
      { error: "This server is not fully configured yet. Please try again later." },
      { status: 503 },
    );
  }

  const caller = await verifyRequest(request);
  if (!caller) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    console.error("[generate] ANTHROPIC_API_KEY is not configured.");
    return NextResponse.json(
      { error: "AI generation is not configured on this server." },
      { status: 503 },
    );
  }

  // --- Validate input ------------------------------------------------------
  let noteId: string;
  try {
    const body = (await request.json()) as { noteId?: unknown };
    if (typeof body.noteId !== "string" || !body.noteId.trim()) {
      return NextResponse.json({ error: "A noteId is required." }, { status: 400 });
    }
    noteId = body.noteId.trim();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const db = adminDb();
  const profileRef = db.collection("users").doc(caller.uid);
  const noteRef = profileRef.collection("notes").doc(noteId);

  // --- Load the note -------------------------------------------------------
  const noteSnapshot = await noteRef.get();
  if (!noteSnapshot.exists) {
    return NextResponse.json({ error: "That note no longer exists." }, { status: 404 });
  }
  const note = noteSnapshot.data() as {
    title?: string;
    content?: string;
    courseTag?: string | null;
  };
  const content = (note.content ?? "").trim();

  if (content.length < MIN_NOTE_CHARS) {
    const shortfall = MIN_NOTE_CHARS - content.length;
    return NextResponse.json(
      {
        error: `This note is too short to study from. Add about ${shortfall} more characters.`,
      },
      { status: 422 },
    );
  }

  // --- Reserve one generation atomically -----------------------------------
  // Reserving before the model call (rather than incrementing after) is what
  // stops twenty parallel requests from each reading "4 used" and all passing.
  let profileForPrompt: {
    educationLevel: EducationLevel | null;
    strand: Strand | null;
    courses: string[];
  };

  try {
    profileForPrompt = await db.runTransaction(async (transaction) => {
      const snapshot = await transaction.get(profileRef);
      if (!snapshot.exists) {
        throw new Error("PROFILE_MISSING");
      }
      const data = snapshot.data() as {
        plan?: unknown;
        aiGenerationsUsedThisPeriod?: number;
        generationPeriodStart?: Timestamp;
        educationLevel?: EducationLevel | null;
        strand?: Strand | null;
        courses?: string[];
      };

      const plan: Plan = normalisePlan(data.plan);
      const periodStart = data.generationPeriodStart?.toDate() ?? currentPeriodStart();
      const used = data.aiGenerationsUsedThisPeriod ?? 0;
      const quota = readQuota(plan, used, periodStart);

      if (quota.exhausted) {
        throw new QuotaExhaustedError(quota.resetsAt);
      }

      const rolledOver = isPeriodExpired(periodStart);
      transaction.update(profileRef, {
        aiGenerationsUsedThisPeriod: rolledOver ? 1 : FieldValue.increment(1),
        ...(rolledOver
          ? { generationPeriodStart: Timestamp.fromDate(currentPeriodStart()) }
          : {}),
        updatedAt: FieldValue.serverTimestamp(),
      });

      return {
        educationLevel: data.educationLevel ?? null,
        strand: data.strand ?? null,
        courses: data.courses ?? [],
      };
    });
  } catch (error) {
    if (error instanceof QuotaExhaustedError) {
      return NextResponse.json(
        {
          error: "You have used all your free AI generations for this month.",
          code: "QUOTA_EXHAUSTED",
          resetsAt: error.resetsAt?.toISOString() ?? null,
        },
        { status: 429 },
      );
    }
    if (error instanceof Error && error.message === "PROFILE_MISSING") {
      return NextResponse.json({ error: "Your profile is not set up yet." }, { status: 409 });
    }
    console.error("[generate] quota reservation failed", error);
    return NextResponse.json({ error: "Could not start generation." }, { status: 500 });
  }

  /** Hands the reserved generation back when we fail before producing a set. */
  const refund = async () => {
    try {
      await profileRef.update({
        aiGenerationsUsedThisPeriod: FieldValue.increment(-1),
      });
    } catch (error) {
      console.error("[generate] refund failed", error);
    }
  };

  // --- Call the model ------------------------------------------------------
  const title = (note.title ?? "").trim() || "Untitled note";
  const courseTag = note.courseTag ?? null;

  const userPrompt = buildUserPrompt({
    noteTitle: title,
    noteContent: content.slice(0, MAX_NOTE_CHARS),
    courseTag,
    educationLevel: profileForPrompt.educationLevel,
    strand: profileForPrompt.strand,
    program: isSeniorHigh(profileForPrompt.educationLevel)
      ? null
      : (profileForPrompt.courses[0] ?? null),
  });

  let rawText: string;
  try {
    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    const message = await anthropic.messages.create({
      model: AI_MODEL,
      max_tokens: MAX_OUTPUT_TOKENS,
      system: SYSTEM_PROMPT,
      messages: [
        { role: "user", content: userPrompt },
        // Prefilling with an opening brace is the most reliable way to suppress
        // prose and markdown fences. It is not echoed back, so re-add it below.
        { role: "assistant", content: ASSISTANT_PREFILL },
      ],
    });

    if (message.stop_reason === "max_tokens") {
      await refund();
      return NextResponse.json(
        {
          error:
            "This note produced more material than fits in one study set. Try splitting it into two shorter notes.",
        },
        { status: 422 },
      );
    }

    const text = message.content
      .filter((block): block is Anthropic.TextBlock => block.type === "text")
      .map((block) => block.text)
      .join("");

    rawText = ASSISTANT_PREFILL + text;
  } catch (error) {
    await refund();
    const busy = error instanceof Anthropic.APIError && error.status === 429;
    console.error("[generate] model call failed", error);
    return NextResponse.json(
      {
        error: busy
          ? "The AI service is busy right now. Please try again in a moment."
          : "The AI service could not be reached. Your generation was not counted.",
      },
      { status: busy ? 503 : 502 },
    );
  }

  // --- Parse defensively ---------------------------------------------------
  const parsed = parseGeneratedStudySet(rawText);
  if (!parsed.ok) {
    await refund();
    return NextResponse.json(
      { error: `${parsed.error} Your generation was not counted, so please try again.` },
      { status: 422 },
    );
  }

  // --- Persist -------------------------------------------------------------
  try {
    const studySetRef = profileRef.collection("studySets").doc();
    const batch = db.batch();

    batch.set(studySetRef, {
      noteId,
      title,
      courseTag,
      flashcardCount: parsed.data.flashcards.length,
      quizQuestionCount: parsed.data.quiz.questions.length,
      source: "ai",
      createdAt: FieldValue.serverTimestamp(),
    });

    parsed.data.flashcards.forEach((card, index) => {
      batch.set(studySetRef.collection("flashcards").doc(), {
        front: card.front,
        back: card.back,
        order: index,
      });
    });

    parsed.data.quiz.questions.forEach((question, index) => {
      batch.set(studySetRef.collection("quizQuestions").doc(), {
        question: question.question,
        choices: question.choices,
        correctIndex: question.correct_index,
        order: index,
      });
    });

    batch.update(noteRef, { lastGeneratedAt: FieldValue.serverTimestamp() });

    await batch.commit();

    return NextResponse.json({
      studySetId: studySetRef.id,
      flashcardCount: parsed.data.flashcards.length,
      quizQuestionCount: parsed.data.quiz.questions.length,
    });
  } catch (error) {
    await refund();
    console.error("[generate] persist failed", error);
    return NextResponse.json(
      { error: "The study set was generated but could not be saved. Please try again." },
      { status: 500 },
    );
  }
}
