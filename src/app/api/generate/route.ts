import Anthropic from "@anthropic-ai/sdk";
import { NextResponse } from "next/server";
import { FieldValue, Timestamp } from "firebase-admin/firestore";

import {
  adminConfigError,
  adminDb,
  verifyAppCheck,
  verifyRequest,
} from "@/lib/firebase/admin";
import {
  RATE_LIMITS,
  checkRateLimit,
  clientIp,
  rateLimitedResponse,
} from "@/lib/rate-limit";
import {
  AI_MODEL,
  MAX_OUTPUT_TOKENS,
  MIN_NOTE_CHARS,
  PLANS,
  cooldownSecondsFor,
  maxNoteCharsFor,
  normalisePlan,
} from "@/lib/ai/config";
import { SYSTEM_PROMPT, buildUserPrompt } from "@/lib/ai/prompt";
import { STUDY_SET_JSON_SCHEMA, parseGeneratedStudySet } from "@/lib/ai/schema";
import { currentPeriodStart, isPeriodExpired, readQuota } from "@/lib/quota";
import { effectiveAccess, readPlanState } from "@/lib/billing/plan-state";
import { isSeniorHigh } from "@/lib/curriculum";
import type { EducationLevel, Plan, Strand } from "@/lib/types";

/** Generation is a slow call; give it room past the default. */
export const maxDuration = 120;

class QuotaExhaustedError extends Error {
  constructor(public resetsAt: Date | null) {
    super("Monthly AI generation limit reached.");
  }
}

/**
 * What "priority generation" actually is: paid plans wait less between sets.
 * Enforced here rather than in the UI so it cannot be clicked around.
 */
class CooldownError extends Error {
  constructor(public secondsRemaining: number) {
    super("Still cooling down.");
  }
}

class NoteTooLongError extends Error {
  constructor(
    public limit: number,
    public actual: number,
  ) {
    super("Note exceeds the plan limit.");
  }
}

/**
 * Key for deciding "this is the same card".
 *
 * Front text only: a regeneration often rewords an answer while asking the
 * same question, and treating that as a new card would duplicate it and split
 * its review history in two.
 */
function normaliseFront(front: string): string {
  return front.trim().toLowerCase().replace(/\s+/g, " ");
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

  // Attestation that the call came from our app, not a script with a token.
  // No-op until APP_CHECK_ENFORCED is turned on.
  if (!(await verifyAppCheck(request))) {
    return NextResponse.json(
      { error: "This request could not be verified. Please reload and try again." },
      { status: 403 },
    );
  }

  // Per-address ceiling. The per-account quota below bounds what one student
  // costs; this bounds how many accounts one connection can create and spend.
  const limit = await checkRateLimit(RATE_LIMITS.generate, clientIp(request));
  if (!limit.allowed) return rateLimitedResponse(limit, "study sets");

  const caller = await verifyRequest(request);
  if (!caller) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  // Verification gates the one endpoint that costs money. Signing in, writing
  // notes, and reviewing all work unverified — this exists to stop a script
  // minting throwaway accounts and farming free generations, not to obstruct
  // a real student.
  if (!caller.emailVerified) {
    return NextResponse.json(
      {
        error:
          "Please confirm your email address before generating a study set. Check your inbox for the link — you can resend it from Settings.",
        code: "EMAIL_NOT_VERIFIED",
      },
      { status: 403 },
    );
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
  /** When present, merge into this set instead of creating another one. */
  let intoStudySetId: string | null = null;
  try {
    const body = (await request.json()) as {
      noteId?: unknown;
      studySetId?: unknown;
    };
    if (typeof body.noteId !== "string" || !body.noteId.trim()) {
      return NextResponse.json({ error: "A noteId is required." }, { status: 400 });
    }
    noteId = body.noteId.trim();
    if (typeof body.studySetId === "string" && body.studySetId.trim()) {
      intoStudySetId = body.studySetId.trim();
    }
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
    maxNoteChars: number;
    plan: Plan;
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
        lastGenerationAt?: Timestamp;
        educationLevel?: EducationLevel | null;
        strand?: Strand | null;
        courses?: string[];
      };

      // The *effective* plan, not the stored one: a subscription that lapsed
      // (past its grace window) must fall back to free limits even though no
      // job has rewritten the profile. A stored "is active" flag would go
      // stale silently and keep serving Pro limits for free.
      const plan: Plan = effectiveAccess(readPlanState(data)).plan;

      // Note length is plan-dependent, so it can only be checked once the
      // profile has been read — hence inside the transaction rather than
      // alongside the MIN_NOTE_CHARS check above.
      const maxNoteChars = maxNoteCharsFor(plan);
      if (content.length > maxNoteChars) {
        throw new NoteTooLongError(maxNoteChars, content.length);
      }

      const cooldown = cooldownSecondsFor(plan);
      if (cooldown > 0) {
        const last = data.lastGenerationAt?.toDate();
        if (last) {
          const elapsed = (Date.now() - last.getTime()) / 1000;
          if (elapsed < cooldown) {
            throw new CooldownError(Math.ceil(cooldown - elapsed));
          }
        }
      }

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
        lastGenerationAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      });

      return {
        educationLevel: data.educationLevel ?? null,
        strand: data.strand ?? null,
        courses: data.courses ?? [],
        maxNoteChars,
        plan,
      };
    });
  } catch (error) {
    if (error instanceof NoteTooLongError) {
      return NextResponse.json(
        {
          error: `This note is ${error.actual.toLocaleString()} characters. Your plan allows ${error.limit.toLocaleString()} per study set — split it, or upgrade for longer notes.`,
          code: "NOTE_TOO_LONG",
          limit: error.limit,
        },
        { status: 422 },
      );
    }
    if (error instanceof CooldownError) {
      return NextResponse.json(
        {
          error: `Just a moment — you can generate again in ${error.secondsRemaining}s. ${PLANS.pro.name} removes the wait entirely.`,
          code: "COOLDOWN",
          retryAfterSeconds: error.secondsRemaining,
        },
        { status: 429, headers: { "Retry-After": String(error.secondsRemaining) } },
      );
    }
    if (error instanceof QuotaExhaustedError) {
      return NextResponse.json(
        {
          error: "That's all your study sets for this month.",
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
    noteContent: content.slice(0, profileForPrompt.maxNoteChars),
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
      messages: [{ role: "user", content: userPrompt }],
      // Constrains the response to the exact shape we parse, so the model
      // cannot wrap it in prose or fences. Replaces the assistant prefill,
      // which newer models reject with a 400.
      output_config: {
        format: { type: "json_schema", schema: STUDY_SET_JSON_SCHEMA },
      },
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

    rawText = text;
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
  //
  // Two paths. A fresh note gets a new set. A note the student has since
  // added to can regenerate INTO its existing set, which is the common case
  // during a term: they append after each lecture and would otherwise choose
  // between a stale set and a duplicate.
  //
  // The merge keeps every existing card. A card's id is the key its review
  // log is stored under, so replacing cards would silently destroy the
  // spaced-repetition history the student built — the one thing here that
  // cannot be regenerated. New cards are appended; nothing is deleted.
  try {
    // Branch on the value, not a boolean derived from it — the latter does
    // not narrow the type.
    const studySetRef = intoStudySetId
      ? profileRef.collection("studySets").doc(intoStudySetId)
      : profileRef.collection("studySets").doc();
    const isMerge = intoStudySetId !== null;

    let existingFronts = new Set<string>();
    let nextOrder = 0;

    if (isMerge) {
      const target = await studySetRef.get();
      if (!target.exists) {
        await refund();
        return NextResponse.json(
          { error: "That study set no longer exists." },
          { status: 404 },
        );
      }
      // Only ever merge a set back into the note it came from, or a student
      // could fold one subject's cards into another's set.
      if (target.get("noteId") !== noteId) {
        await refund();
        return NextResponse.json(
          { error: "That study set was not made from this note." },
          { status: 400 },
        );
      }

      const cards = await studySetRef.collection("flashcards").get();
      existingFronts = new Set(
        cards.docs.map((d) => normaliseFront(String(d.get("front") ?? ""))),
      );
      nextOrder = cards.docs.reduce(
        (max, d) => Math.max(max, Number(d.get("order") ?? 0) + 1),
        0,
      );
    }

    // Anything already present stays as it is, history and all.
    const freshCards = parsed.data.flashcards.filter(
      (card) => !existingFronts.has(normaliseFront(card.front)),
    );

    const batch = db.batch();

    if (isMerge) {
      batch.update(studySetRef, {
        flashcardCount: existingFronts.size + freshCards.length,
        quizQuestionCount: parsed.data.quiz.questions.length,
      });
      // The quiz carries no review history, so replacing it is free and keeps
      // it matched to the note as it reads now.
      const oldQuestions = await studySetRef.collection("quizQuestions").get();
      oldQuestions.docs.forEach((d) => batch.delete(d.ref));
    } else {
      batch.set(studySetRef, {
        noteId,
        title,
        courseTag,
        flashcardCount: parsed.data.flashcards.length,
        quizQuestionCount: parsed.data.quiz.questions.length,
        source: "ai",
        createdAt: FieldValue.serverTimestamp(),
      });
    }

    freshCards.forEach((card, index) => {
      batch.set(studySetRef.collection("flashcards").doc(), {
        front: card.front,
        back: card.back,
        order: nextOrder + index,
        // Denormalised so the review queue can pull every card the student
        // owns in ONE collection-group query instead of one query per set.
        ownerId: caller.uid,
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
      merged: isMerge,
      // What actually changed, so the client can say something true rather
      // than "done".
      addedCount: freshCards.length,
      keptCount: existingFronts.size,
      flashcardCount: existingFronts.size + freshCards.length,
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
