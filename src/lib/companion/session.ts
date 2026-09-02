"use client";

/**
 * The conversation with Tala, held on the device and nowhere else.
 *
 * `localStorage`, not Firestore, and that is a decision rather than a
 * shortcut. A companion that forgets everything when the tab closes is barely
 * a companion — "you said you have a bio exam Friday" is most of what makes it
 * feel like one. But storing conversations on the server would mean holding
 * free-text written by minors, which brings a retention policy, an export
 * obligation, a deletion path and a moderation question, for a feature whose
 * value is mostly in the last ten minutes of it.
 *
 * Keeping it on the device gets the continuity and none of that: it survives a
 * reload, it does not follow them to another machine, it is covered by the
 * existing "delete your account" story because there is nothing of it to
 * delete, and the clear button genuinely clears it.
 *
 * The trade is real and worth naming: a student who opens Tuón on the library
 * desktop starts a fresh conversation. That is acceptable because the STUDY
 * STATE is re-sent on every message, so Tala is never confused about how they
 * are doing — only about what they said yesterday.
 *
 * Read through `useSyncExternalStore`, the house pattern for browser state:
 * localStorage does not exist during SSR, so a lazy `useState` initialiser
 * would render one thing on the server and another on the client.
 */

import { MAX_TURNS } from "@/lib/companion/prompt";

const KEY = "tuon.tala.v1";

export interface CompanionMessage {
  role: "user" | "assistant";
  content: string;
}

/**
 * One shared empty array.
 *
 * `useSyncExternalStore` re-renders whenever the snapshot is a new reference,
 * so a fresh `[]` per read would loop forever.
 */
const EMPTY: CompanionMessage[] = [];

const listeners = new Set<() => void>();

let current: CompanionMessage[] = EMPTY;
let hydrated = false;

function parse(raw: string | null): CompanionMessage[] {
  if (!raw) return EMPTY;
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return EMPTY;

    // Anything in localStorage is editable from devtools, so it is validated
    // on the way in exactly as if it came off the network.
    const turns: CompanionMessage[] = [];
    for (const item of parsed) {
      if (!item || typeof item !== "object") continue;
      const { role, content } = item as { role?: unknown; content?: unknown };
      if (role !== "user" && role !== "assistant") continue;
      if (typeof content !== "string" || !content.trim()) continue;
      turns.push({ role, content });
    }
    return turns.length ? turns.slice(-MAX_TURNS) : EMPTY;
  } catch {
    return EMPTY;
  }
}

export function subscribeCompanion(onChange: () => void): () => void {
  listeners.add(onChange);
  return () => {
    listeners.delete(onChange);
  };
}

export function getCompanionSnapshot(): CompanionMessage[] {
  if (!hydrated) {
    hydrated = true;
    try {
      current = parse(window.localStorage.getItem(KEY));
    } catch {
      // A private window, or storage blocked entirely. Memory is the source of
      // truth, so the conversation still works — it just will not survive a
      // reload, which nobody notices.
      current = EMPTY;
    }
  }
  return current;
}

/** The server has no device, so it always renders an empty conversation. */
export function getCompanionServerSnapshot(): CompanionMessage[] {
  return EMPTY;
}

export function saveCompanion(turns: CompanionMessage[]): void {
  const next = turns.slice(-MAX_TURNS);
  current = next.length ? next : EMPTY;
  hydrated = true;

  try {
    if (next.length === 0) window.localStorage.removeItem(KEY);
    else window.localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    // Best effort; the in-memory value above is what the UI reads.
  }

  for (const listener of listeners) listener();
}

export function clearCompanion(): void {
  saveCompanion([]);
}

/** Test-only: forget that storage was already read this page load. */
export function resetCompanionForTests(): void {
  current = EMPTY;
  hydrated = false;
}
