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

  let body: { messages?: unknown };
  try {
    body = (await request.json()) as { messages?: unknown };
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
    const message = await anthropic.messages.create({
      model: CHAT_MODEL,
      max_tokens: MAX_OUTPUT_TOKENS,
      system: [
        {
          type: "text",
          text: systemPrompt(),
          // Identical on every request, so it is cached rather than re-read.
          // This is most of the per-call cost on a corpus this size.
          cache_control: { type: "ephemeral" },
        },
      ],
      messages: transcript.turns,
    });

    const reply = message.content
      .filter((block): block is Anthropic.TextBlock => block.type === "text")
      .map((block) => block.text)
      .join("")
      .trim();

    if (!reply) {
      log.warn({ scope: "chat", event: "empty_reply", stop: message.stop_reason });
      return NextResponse.json(
        { error: "Could not answer that one.", code: "EMPTY_REPLY" },
        { status: 502 },
      );
    }

    log.info({
      scope: "chat",
      event: "answered",
      turns: transcript.turns.length,
      inputTokens: message.usage.input_tokens,
      cachedTokens: message.usage.cache_read_input_tokens ?? 0,
      outputTokens: message.usage.output_tokens,
    });

    return NextResponse.json({ reply });
  } catch (error) {
    log.error({ scope: "chat", event: "model_call_failed" }, error);
    return NextResponse.json(
      { error: "Could not answer that one. Please try again.", code: "MODEL_FAILED" },
      { status: 502 },
    );
  }
}
