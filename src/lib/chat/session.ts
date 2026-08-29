"use client";

import { MAX_TURNS } from "@/lib/chat/prompt";

/**
 * The landing conversation, stored in the tab rather than in React state.
 *
 * `sessionStorage`, not `localStorage`: a question asked while deciding whether
 * to sign up is not something to still be sitting there in a week, and on a
 * shared computer — a school lab, a computer shop, which is how a lot of this
 * audience gets online — it should not outlive the tab.
 *
 * Exposed as an external store so the component can read it with
 * `useSyncExternalStore`, the same way OfflineIndicator reads `navigator`.
 * Restoring with setState-in-an-effect both trips React 19's cascading-render
 * rule and, on a section that is always on screen, would flash an empty
 * conversation before filling it in. A lazy `useState` initialiser cannot work
 * either: sessionStorage does not exist during SSR, so the server would render
 * empty and the client something else, which is a hydration mismatch.
 *
 * Every read and write is wrapped. Private windows, cleared site data and
 * browsers set to block storage throw on ACCESS, not just on failure, and a
 * marketing page must never break because of it.
 */

const KEY = "tuon.chat.v1";

export interface StoredTurn {
  role: "user" | "assistant";
  content: string;
}

/**
 * One shared empty array, deliberately.
 *
 * `useSyncExternalStore` re-renders whenever the snapshot is a new reference,
 * so returning a fresh `[]` on every read would loop forever.
 */
const EMPTY: StoredTurn[] = [];

const listeners = new Set<() => void>();

/**
 * The live conversation. Memory is the source of truth and storage is a
 * best-effort side-channel, not the other way round.
 *
 * That ordering matters: in a private window `sessionStorage.getItem` THROWS,
 * and if the store read from storage every time, those users would watch their
 * own conversation fail to appear. This way blocked storage degrades to
 * "works, but does not survive a reload", which nobody notices.
 */
let current: StoredTurn[] = EMPTY;
/** Storage is read once per page load, on the first snapshot. */
let hydrated = false;

function parse(raw: string | null): StoredTurn[] {
  if (!raw) return EMPTY;
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return EMPTY;

    // Anything in sessionStorage is editable from devtools, so it is validated
    // on the way in exactly as if it came off the network. The server clamps
    // again regardless; this is about never rendering nonsense.
    const turns: StoredTurn[] = [];
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

export function subscribeSession(onChange: () => void): () => void {
  listeners.add(onChange);
  return () => listeners.delete(onChange);
}

export function getSessionSnapshot(): StoredTurn[] {
  if (!hydrated) {
    hydrated = true;
    try {
      current = parse(sessionStorage.getItem(KEY));
    } catch {
      current = EMPTY;
    }
  }
  return current;
}

/** The server has no tab, so it always renders the empty conversation. */
export function getServerSessionSnapshot(): StoredTurn[] {
  return EMPTY;
}

export function saveSession(turns: StoredTurn[]): void {
  const next = turns.slice(-MAX_TURNS);
  current = next.length ? next : EMPTY;
  hydrated = true;

  try {
    if (next.length === 0) sessionStorage.removeItem(KEY);
    else sessionStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    // Storage full, blocked, or unavailable. The conversation still works for
    // this page view; it just will not survive a reload.
  }

  listeners.forEach((listener) => listener());
}

/** Test-only: forget that storage was already read this page load. */
export function resetSessionForTests(): void {
  current = EMPTY;
  hydrated = false;
}

export function clearSession(): void {
  saveSession([]);
}
