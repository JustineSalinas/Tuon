/**
 * Bounding what a visitor can put in front of the model.
 *
 * This endpoint is anonymous by definition — the whole point is that the person
 * has not signed up — so nothing upstream limits what arrives. The client sends
 * the conversation back on every turn, which means an attacker controls its
 * length and content entirely. Trimming it in the browser would be decoration.
 *
 * Pure and dependency-free so the limits can actually be tested; the route
 * imports the Anthropic SDK and firebase-admin, neither of which resolves in
 * the test runner.
 */

import { MAX_MESSAGE_CHARS, MAX_TURNS } from "@/lib/chat/prompt";

export interface ChatTurn {
  role: "user" | "assistant";
  content: string;
}

export type TranscriptResult =
  | { ok: true; turns: ChatTurn[] }
  | { ok: false; reason: "empty" | "malformed" | "not_user_last" };

/**
 * Validates and clamps a conversation arriving from the browser.
 *
 * Keeps the MOST RECENT turns rather than the first: a long conversation's
 * ending is what the next answer depends on, and keeping the head would let
 * someone pin a poisoned opening in place forever while the real conversation
 * scrolled out from under it.
 */
export function prepareTranscript(input: unknown): TranscriptResult {
  if (!Array.isArray(input)) return { ok: false, reason: "malformed" };

  const cleaned: ChatTurn[] = [];
  for (const raw of input) {
    if (!raw || typeof raw !== "object") return { ok: false, reason: "malformed" };
    const { role, content } = raw as { role?: unknown; content?: unknown };
    if (role !== "user" && role !== "assistant") {
      return { ok: false, reason: "malformed" };
    }
    if (typeof content !== "string") return { ok: false, reason: "malformed" };

    const trimmed = content.trim().slice(0, MAX_MESSAGE_CHARS);
    // A blank turn carries no meaning and still costs a request.
    if (!trimmed) continue;
    cleaned.push({ role, content: trimmed });
  }

  if (cleaned.length === 0) return { ok: false, reason: "empty" };

  const turns = cleaned.slice(-MAX_TURNS);

  // The Anthropic API requires the conversation to end on a user turn, and a
  // client that sends anything else is either broken or probing.
  if (turns[turns.length - 1].role !== "user") {
    return { ok: false, reason: "not_user_last" };
  }

  // Dropping the head can leave a leading assistant turn, which the API also
  // rejects. Shift until it starts on a user turn.
  while (turns.length && turns[0].role !== "user") turns.shift();
  if (turns.length === 0) return { ok: false, reason: "empty" };

  return { ok: true, turns };
}
