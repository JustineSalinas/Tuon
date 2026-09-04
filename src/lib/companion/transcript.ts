/**
 * Bounding a companion conversation on the way in.
 *
 * The same job the landing assistant's transcript module does, and a separate
 * file rather than a shared one because the two have different limits and will
 * keep diverging: a signed-in student writing about a chapter they are stuck
 * on needs a longer message than a visitor asking whether it covers ABM, and
 * a companion earns a longer memory than a sales conversation.
 *
 * Pure and dependency-free, so the clamping can be tested without the
 * Anthropic SDK or firebase-admin — neither of which resolves in the runner.
 */

import { MAX_MESSAGE_CHARS, MAX_TURNS } from "@/lib/companion/prompt";

export interface CompanionTurn {
  role: "user" | "assistant";
  content: string;
}

export type CompanionTranscript =
  | { ok: true; turns: CompanionTurn[] }
  | { ok: false; reason: "empty" | "malformed" | "not_user_last" };

/**
 * Validates and clamps a conversation arriving from the browser.
 *
 * Keeps the most recent turns. A companion conversation is the one place in
 * this app where dropping the head is slightly lossy — "I have a bio exam
 * Friday" scrolls out eventually — but keeping the head instead would let a
 * poisoned opening sit in the prompt forever while the real conversation
 * scrolled away underneath it, which is worse. The study state is re-sent
 * every turn, so the facts that matter never depend on memory.
 */
export function prepareCompanionTranscript(input: unknown): CompanionTranscript {
  if (!Array.isArray(input)) return { ok: false, reason: "malformed" };

  const cleaned: CompanionTurn[] = [];
  for (const raw of input) {
    if (!raw || typeof raw !== "object") return { ok: false, reason: "malformed" };
    const { role, content } = raw as { role?: unknown; content?: unknown };
    if (role !== "user" && role !== "assistant") {
      return { ok: false, reason: "malformed" };
    }
    if (typeof content !== "string") return { ok: false, reason: "malformed" };

    const trimmed = content.trim().slice(0, MAX_MESSAGE_CHARS);
    if (!trimmed) continue;
    cleaned.push({ role, content: trimmed });
  }

  if (cleaned.length === 0) return { ok: false, reason: "empty" };

  const turns = cleaned.slice(-MAX_TURNS);

  if (turns[turns.length - 1].role !== "user") {
    return { ok: false, reason: "not_user_last" };
  }

  // Dropping the head can leave a leading assistant turn, which the API
  // rejects outright.
  while (turns.length && turns[0].role !== "user") turns.shift();
  if (turns.length === 0) return { ok: false, reason: "empty" };

  return { ok: true, turns };
}
