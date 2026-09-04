import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

import { verifyAppCheck } from "@/lib/firebase/admin";
import {
  RATE_LIMITS,
  checkRateLimit,
  clientIp,
  rateLimitedResponse,
} from "@/lib/rate-limit";
import { MAX_OUTPUT_TOKENS, systemPrompt } from "@/lib/chat/prompt";
import { prepareTranscript } from "@/lib/chat/transcript";
import { log } from "@/lib/observability/log";

/**
 * The landing-page assistant.
 *
 * This is the only endpoint in the app that spends money for someone who has
 * not signed up. /api/generate is guarded by auth, email verification, a
 * per-plan quota, a cooldown and a rate limit; none of those exist here,
 * because the visitor is anonymous by design. Everything protecting it is in
 * this file, so each guard is deliberate:
 *
 *  - **App Check** attests the call came from our real web page rather than a
 *    script. It authenticates the APP, not a user, which is exactly the
 *    anonymous-public-endpoint case it exists for. It is the main defence.
 *  - **IP rate limit**, so a single address cannot sit on it.
 *  - **Clamped transcript**, because the browser sends the conversation back
 *    each turn and therefore controls its size.
 *  - **Small model, hard max_tokens**, so the worst case per call is bounded.
 *  - **Prompt caching** on the system block: the corpus is byte-identical on
 *    every request, which is the ideal shape for it.
 *
 * Answers 501 rather than erroring when no key is configured, so the page can
 * fall back to the FAQ instead of showing a broken widget.
 */

export const dynamic = "force-dynamic";

/**
 * Haiku, deliberately, where generation uses Sonnet.
 *
 * The job is answering "does it cover my subject" out of a 4k-token corpus
 * that is entirely in front of the model. That is retrieval and paraphrase,
 * not reasoning, and it is the one endpoint an anonymous stranger can call.
 */
const CHAT_MODEL = "claude-haiku-4-5-20251001";

/**
 * Whether the assistant can answer at all.
 *
 * A separate question from "answer this", and it has to be: the section only
 * used to find out by sending a message and reading the 501, which meant the
 * visitor lost the question they had just typed at the same moment the
 * section vanished. That is worse than the broken widget the 501 exists to
 * avoid.
 *
 * Only a boolean leaves here and it reads one environment variable, so it
 * needs neither App Check nor a rate limit.
 */
export async function GET() {
  return NextResponse.json({
    configured: Boolean(process.env.ANTHROPIC_API_KEY),
  });
}

export async function POST(request: Request) {
  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json(
      { error: "Chat is not available right now.", code: "CHAT_NOT_CONFIGURED" },
      { status: 501 },
    );
  }

  if (!(await verifyAppCheck(request))) {
    return NextResponse.json(
      { error: "This request could not be verified. Please reload the page." },
      { status: 403 },
    );
  }

  const limit = await checkRateLimit(RATE_LIMITS.chat, clientIp(request));
  if (!limit.allowed) return rateLimitedResponse(limit, "messages");

  let body: { messages?: unknown; locale?: unknown };
  try {
    body = (await request.json()) as { messages?: unknown; locale?: unknown };
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const transcript = prepareTranscript(body.messages);
  if (!transcript.ok) {
    return NextResponse.json(
      { error: "That conversation could not be read.", code: transcript.reason },
      { status: 400 },
    );
  }

  try {
    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    const stream = await anthropic.messages.create({
      model: CHAT_MODEL,
      max_tokens: MAX_OUTPUT_TOKENS,
      system: [
        {
          type: "text",
          // The visitor's reading language, so Tala opens in it
          // rather than waiting to be written to in Filipino first.
          text: systemPrompt(body.locale === "fil" ? "fil" : "en"),
          // Identical on every request, so it is cached rather than re-read.
          // This is most of the per-call cost on a corpus this size.
          cache_control: { type: "ephemeral" },
        },
      ],
      messages: transcript.turns,
      stream: true,
    });

    const encoder = new TextEncoder();
    const turns = transcript.turns.length;

    const readable = new ReadableStream<Uint8Array>({
      async start(controller) {
        // Usage rides on the envelope events rather than with the text, so it
        // is accumulated here to keep the per-call cost log the non-streaming
        // version had. Spend is the entire risk on this endpoint, and a log
        // that stopped reporting it would hide exactly the thing worth
        // watching.
        let inputTokens = 0;
        let cachedTokens = 0;
        let outputTokens = 0;
        let chars = 0;

        try {
          for await (const event of stream) {
            if (event.type === "message_start") {
              inputTokens = event.message.usage.input_tokens;
              cachedTokens = event.message.usage.cache_read_input_tokens ?? 0;
            } else if (
              event.type === "content_block_delta" &&
              event.delta.type === "text_delta"
            ) {
              chars += event.delta.text.length;
              controller.enqueue(encoder.encode(event.delta.text));
            } else if (event.type === "message_delta") {
              outputTokens = event.usage.output_tokens;
            }
          }

          if (chars === 0) {
            log.warn({ scope: "chat", event: "empty_reply", turns });
          } else {
            log.info({
              scope: "chat",
              event: "answered",
              turns,
              inputTokens,
              cachedTokens,
              outputTokens,
              chars,
            });
          }
        } catch (error) {
          // The stream is already open, so there is no status code left to
          // change. Close cleanly and let the visitor keep the partial answer:
          // half an answer is more useful than an error that replaces it.
          log.error({ scope: "chat", event: "stream_failed", turns }, error);
        } finally {
          controller.close();
        }
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
    log.error({ scope: "chat", event: "model_call_failed" }, error);
    return NextResponse.json(
      { error: "Could not answer that one. Please try again.", code: "MODEL_FAILED" },
      { status: 502 },
    );
  }
}
