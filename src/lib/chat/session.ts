"use client";

import { MAX_TURNS } from "@/lib/chat/prompt";

/**
 * Keeps a landing-page conversation alive across a reload.
 *
 * `sessionStorage`, not `localStorage`: a question asked while deciding whether
 * to sign up is not something to still be sitting there in a week, and on a
 * shared computer — a school lab, a computer shop, which is how a lot of this
 * audience gets online — it should not outlive the tab.
 *
 * Every read and write is wrapped: private windows, cleared site data, and
 * browsers set to block storage all throw on ACCESS, not just on failure, and
 * a marketing page must never break because of it.
 */

const KEY = "tuon.chat.v1";

export interface StoredTurn {
  role: "user" | "assistant";
  content: string;
}

export function loadSession(): StoredTurn[] {
  try {
    const raw = sessionStorage.getItem(KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];

    // Anything in sessionStorage is user-editable, so it is validated on the
    // way in exactly as if it came off the network. The server clamps again
    // regardless; this is about not rendering nonsense.
    const turns: StoredTurn[] = [];
    for (const item of parsed) {
      if (!item || typeof item !== "object") continue;
      const { role, content } = item as { role?: unknown; content?: unknown };
      if (role !== "user" && role !== "assistant") continue;
      if (typeof content !== "string" || !content.trim()) continue;
      turns.push({ role, content });
    }
    return turns.slice(-MAX_TURNS);
  } catch {
    return [];
  }
}

export function saveSession(turns: StoredTurn[]): void {
  try {
    if (turns.length === 0) {
      sessionStorage.removeItem(KEY);
      return;
    }
    sessionStorage.setItem(KEY, JSON.stringify(turns.slice(-MAX_TURNS)));
  } catch {
    // Storage full, blocked, or unavailable. The conversation still works for
    // this page view; it just will not survive a reload.
  }
}

export function clearSession(): void {
  try {
    sessionStorage.removeItem(KEY);
  } catch {
    // Nothing to do; the caller is clearing its own state either way.
  }
}
