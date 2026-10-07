import Anthropic from "@anthropic-ai/sdk";
import { NextResponse } from "next/server";

import { adminConfigError, verifyAppCheck, verifyRequest } from "@/lib/firebase/admin";
import { RATE_LIMITS, checkRateLimit, clientIp, rateLimitedResponse } from "@/lib/rate-limit";
import { AI_MODEL } from "@/lib/ai/config";
import { log } from "@/lib/observability/log";

/**
 * Turns a photo of handwritten or printed notes into plain text.
 *
 * One step before a generation, not a generation itself: the output is
 * pasted into a note, same as a PDF or Word import, and the student still
 * presses Generate on it afterward. So this does not touch the monthly
 * quota — it has its own rate limit instead, see `RATE_LIMITS.transcribePhoto`.
 *
 * The image never touches Firestore or Storage. It is read into the model
 * call and discarded; nothing here persists it.
 */

export const maxDuration = 60;

/** Base64 JPEG, downscaled client-side — see lib/photo/prepare.ts. Comfortably
    under Vercel's 4.5MB request body limit even before that downscaling. */
const MAX_BASE64_CHARS = 8 * 1024 * 1024;

const TRANSCRIBE_PROMPT = `Transcribe every word of legible text in this photo, exactly as written. This is a photo of a student's class notes, a textbook page, or a whiteboard.

Rules:
- Output the text only. No commentary, no "here is the transcription", no markdown formatting.
- Preserve the original structure: headings, bullet points, numbered lists, line breaks.
- If handwriting is genuinely illegible, write [illegible] in its place rather than guessing.
- Do not summarise, correct, or add anything that is not in the photo.
- If the photo contains no readable text at all, output exactly: NO_TEXT_FOUND`;

export async function POST(request: Request) {
  const configError = adminConfigError();
  if (configError) {
    log.error({ scope: "photo", event: "transcribe.not_configured", configError });
    return NextResponse.json(
      { error: "This server is not fully configured yet. Please try again later." },
      { status: 503 },
    );
  }

  if (!(await verifyAppCheck(request))) {
    return NextResponse.json(
      { error: "This request could not be verified. Please reload and try again." },
      { status: 403 },
    );
  }

  const ipLimit = await checkRateLimit(RATE_LIMITS.generate, clientIp(request));
  if (!ipLimit.allowed) return rateLimitedResponse(ipLimit, "photo imports");

  const caller = await verifyRequest(request);
  if (!caller) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  const accountLimit = await checkRateLimit(RATE_LIMITS.transcribePhoto, caller.uid);
  if (!accountLimit.allowed) return rateLimitedResponse(accountLimit, "photo imports");

  // Same bar as /api/generate: this spends money, so it gates on the same
  // proof of a real inbox.
  if (!caller.emailVerified) {
    return NextResponse.json(
      {
        error: "Please confirm your email address before importing a photo.",
        code: "EMAIL_NOT_VERIFIED",
      },
      { status: 403 },
    );
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    log.error({ scope: "photo", event: "transcribe.no_api_key" });
    return NextResponse.json(
      { error: "Photo import is not configured on this server." },
      { status: 503 },
    );
  }

  let base64: string;
  let mediaType: string;
  try {
    const body = (await request.json()) as { base64?: unknown; mediaType?: unknown };
    if (typeof body.base64 !== "string" || !body.base64) {
      return NextResponse.json({ error: "No image was sent." }, { status: 400 });
    }
    if (body.base64.length > MAX_BASE64_CHARS) {
      return NextResponse.json({ error: "That image is too large." }, { status: 413 });
    }
    base64 = body.base64;
    mediaType = typeof body.mediaType === "string" ? body.mediaType : "image/jpeg";
    if (mediaType !== "image/jpeg" && mediaType !== "image/png" && mediaType !== "image/webp") {
      return NextResponse.json({ error: "Unsupported image type." }, { status: 400 });
    }
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  try {
    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    const message = await anthropic.messages.create({
      model: AI_MODEL,
      max_tokens: 4096,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "image",
              source: {
                type: "base64",
                media_type: mediaType as "image/jpeg" | "image/png" | "image/webp",
                data: base64,
              },
            },
            { type: "text", text: TRANSCRIBE_PROMPT },
          ],
        },
      ],
    });

    const text = message.content
      .filter((block): block is Anthropic.TextBlock => block.type === "text")
      .map((block) => block.text)
      .join("")
      .trim();

    if (!text || text === "NO_TEXT_FOUND") {
      return NextResponse.json(
        { error: "No readable text was found in that photo." },
        { status: 422 },
      );
    }

    return NextResponse.json({ text });
  } catch (error) {
    const busy = error instanceof Anthropic.APIError && error.status === 429;
    log.error({ scope: "photo", event: "transcribe.failed", uid: caller.uid }, error);
    return NextResponse.json(
      {
        error: busy
          ? "The AI service is busy right now. Please try again in a moment."
          : "Could not read that photo. Please try again.",
      },
      { status: busy ? 503 : 502 },
    );
  }
}
