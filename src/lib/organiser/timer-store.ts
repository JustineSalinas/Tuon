"use client";

/**
 * The Pomodoro timer's live state, held outside React.
 *
 * A module-level store rather than component state for one reason: the timer
 * has to survive being unmounted. A student starts a 25-minute block, goes to
 * their notes, comes back to the calendar — with component state that is a
 * lost session, and losing a session is exactly the failure that makes people
 * stop trusting a study log.
 *
 * `useSyncExternalStore` is the house pattern for this (see OfflineIndicator):
 * it is external state, and reading it through an effect both trips React 19's
 * cascading-render rule and flashes the wrong value on first paint.
 *
 * localStorage is a best-effort MIRROR, never the source of truth — the same
 * inversion the chat session store uses. Private windows throw on access, and
 * a timer that cannot start in a private window would be a worse bug than one
 * that forgets across a reload.
 */

import {
  initialPomodoro,
  readStoredState,
  type PomodoroState,
} from "@/lib/organiser/pomodoro";

const STORAGE_KEY = "tuon.pomodoro.v1";

let state: PomodoroState = initialPomodoro();
let hydrated = false;
const listeners = new Set<() => void>();

/**
 * Pulled from storage once, lazily, on the first read in the browser.
 *
 * Not at module scope: this file is imported during SSR, where `localStorage`
 * does not exist, and a top-level read would take the whole route down.
 */
function hydrate(): void {
  if (hydrated) return;
  hydrated = true;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    const restored = readStoredState(JSON.parse(raw));
    if (restored) state = restored;
  } catch {
    // A private window, a quota error, or something else's key in our slot.
    // A fresh timer is a fine outcome; a crash is not.
  }
}

function persist(): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Best effort. The in-memory state above is what the UI actually reads.
  }
}

export function setTimerState(next: PomodoroState): void {
  state = next;
  persist();
  for (const listener of listeners) listener();
}

export function updateTimerState(
  change: (current: PomodoroState) => PomodoroState,
): void {
  hydrate();
  setTimerState(change(state));
}

export function subscribeToTimer(onChange: () => void): () => void {
  listeners.add(onChange);
  return () => {
    listeners.delete(onChange);
  };
}

export function getTimerSnapshot(): PomodoroState {
  hydrate();
  return state;
}

/**
 * The server renders a stopped timer.
 *
 * It cannot know what is in a browser's storage, and a referentially stable
 * object is required here — returning a fresh one each call makes
 * useSyncExternalStore loop forever.
 */
const SERVER_STATE: PomodoroState = initialPomodoro();

export function getTimerServerSnapshot(): PomodoroState {
  return SERVER_STATE;
}
