import Anthropic from "@anthropic-ai/sdk";

import { verifyAppCheck, verifyRequest } from "@/lib/firebase/admin";
import {
  RATE_LIMITS,
  checkRateLimit,
  rateLimitedResponse,
} from "@/lib/rate-limit";
import {
  MAX_OUTPUT_TOKENS,
  companionSystem,
  studyStateBlock,
} from "@/lib/companion/prompt";
import { readSnapshot } from "@/lib/companion/snapshot";
import { prepareCompanionTranscript } from "@/lib/companion/transcript";
import { CREATURE_NAME } from "@/lib/brand";
import { log } from "@/lib/observability/log";

/**
 * Tala, talking to a signed-in student.
 *
 * Two things separate this from the landing-page assistant, and both are
 * deliberate rather than incidental.
 *
 * IT IS AUTHENTICATED, so the guards differ. The landing bot's whole risk is
 * that an anonymous stranger can spend money; App Check is its main defence.
 * Here there is a real account behind every call, which means a per-user rate
 * limit is available and is the right ceiling — an IP limit would punish a
 * whole computer lab for one student. App Check still runs, because a stolen
 * ID token is a thing that happens and attesting the app costs nothing.
 *
 * IT STREAMS. Not for speed — the first token arrives at much the same time
 * either way — but because this feature is a character talking to you. A
 * spinner followed by a wall of text is a chatbot; words arriving as she says
 * them is a conversation, and the animation on the other end is keyed to it.
 * The response is a plain text stream rather than SSE: there is exactly one
 * kind of event, and inventing a frame format for it would be ceremony.
 *
 * Answers 501 rather than erroring when no key is configured, so the screen
 * can explain itself instead of showing a broken box.
 */

export const dynamic = "force-dynamic";

/**
 * Haiku, like the landing bot and unlike generation.
 *
 * The work here is reading a short structured summary and answering in a few
 * sentences. That is comprehension and phrasing rather than the multi-step
 * extraction that writing twelve flashcards from a lecture needs, and this is
 * the endpoint a student can call all evening for free.
 */
const COMPANION_MODEL = "claude-haiku-4-5-20251001";

function json(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

export async function POST(request: Request) {
  if (!process.env.ANTHROPIC_API_KEY) {
    return json(
      { error: "Tala is not available right now.", code: "CHAT_NOT_CONFIGURED" },
      501,
    );
  }

  if (!(await verifyAppCheck(request))) {
    return json(
      {
        error: "This request could not be verified. Please reload the page.",
        code: "UNVERIFIED",
      },
      403,
    );
  }

  const caller = await verifyRequest(request);
  if (!caller) return json({ error: "Not signed in.", code: "NOT_SIGNED_IN" }, 401);

  // Keyed on the account rather than the address: a school lab shares one IP,
  // and one student holding a conversation must not lock out the room.
  const limit = await checkRateLimit(RATE_LIMITS.companion, caller.uid);
  if (!limit.allowed) return rateLimitedResponse(limit, "messages");

  let body: { messages?: unknown; snapshot?: unknown; locale?: unknown };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return json({ error: "Malformed request.", code: "MALFORMED" }, 400);
  }

  const transcript = prepareCompanionTranscript(body.messages);
  if (!transcript.ok) {
    return json(
      { error: "That conversation could not be read.", code: transcript.reason },
      400,
    );
  }

  const snapshot = readSnapshot(body.snapshot);
  const locale = body.locale === "fil" ? "fil" : "en";

  try {
    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

    const stream = await anthropic.messages.create({
      model: COMPANION_MODEL,
      max_tokens: MAX_OUTPUT_TOKENS,
      system: [
        {
          type: "text",
          // Byte-identical per locale on every request, so it caches. The
          // cache breakpoint goes here and not on the block below, because
          // the block below changes with every message.
          text: companionSystem(CREATURE_NAME, locale),
          cache_control: { type: "ephemeral" },
        },
        { type: "text", text: studyStateBlock(snapshot) },
      ],
      messages: transcript.turns,
      stream: true,
    });

    const encoder = new TextEncoder();
    const readable = new ReadableStream<Uint8Array>({
      async start(controller) {
        try {
          for await (const event of stream) {
            if (
              event.type === "content_block_delta" &&
              event.delta.type === "text_delta"
            ) {
              controller.enqueue(encoder.encode(event.delta.text));
            }
          }
        } catch (error) {
          // The stream has already begun, so there is no status code left to
          // change. Close cleanly and let the client keep the partial answer:
          // half an answer is more useful than an error that replaces it.
          log.error({
            scope: "companion",
            event: "stream_failed",
            uid: caller.uid,
            detail: error instanceof Error ? error.message : String(error),
          });
        } finally {
          controller.close();
        }
      },
      cancel() {
        // The student navigated away or pressed stop. Nothing to unwind: the
        // SDK's iterator is abandoned and the request is billed for what was
        // generated, which is the same either way.
      },
    });

    return new Response(readable, {
      headers: {
        "content-type": "text/plain; charset=utf-8",
        // Proxies that buffer a stream turn it back into a wall of text.
        "cache-control": "no-store, no-transform",
        "x-accel-buffering": "no",
      },
    });
  } catch (error) {
    log.error({
      scope: "companion",
      event: "failed",
      uid: caller.uid,
      detail: error instanceof Error ? error.message : String(error),
    });
    return json(
      { error: "Tala could not answer that one.", code: "COMPANION_FAILED" },
      502,
    );
  }
}
