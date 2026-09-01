"use client";

/**
 * The locale mirror, held outside React.
 *
 * Same shape as the Pomodoro's timer store, and for the same reason: this is
 * external browser state, and reading it through an effect that calls setState
 * is what React 19 flags as a cascading render — correctly, because the first
 * paint then shows English and the second shows Filipino.
 *
 * The profile remains the source of truth. This exists only so the very first
 * client render is already in the right language, and so that a change made on
 * another device still wins once the profile arrives.
 */

import { DEFAULT_LOCALE, LOCALE_STORAGE_KEY, readLocale, type LocaleId } from "@/lib/i18n/locales";

let locale: LocaleId = DEFAULT_LOCALE;
let hydrated = false;
const listeners = new Set<() => void>();

/**
 * Pulled from storage once, lazily, on the first read in the browser.
 *
 * Not at module scope: this file is imported during SSR, where localStorage
 * does not exist, and a top-level read would take the route down.
 */
function hydrate(): void {
  if (hydrated) return;
  hydrated = true;
  try {
    const raw = window.localStorage.getItem(LOCALE_STORAGE_KEY);
    if (raw) locale = readLocale(raw);
  } catch {
    // A private window. English is a fine outcome.
  }
}

export function setStoredLocale(next: LocaleId): void {
  hydrated = true;
  locale = next;
  try {
    window.localStorage.setItem(LOCALE_STORAGE_KEY, next);
  } catch {
    // Best effort; the in-memory value above is what the UI reads.
  }
  for (const listener of listeners) listener();
}

export function subscribeToLocale(onChange: () => void): () => void {
  listeners.add(onChange);
  return () => {
    listeners.delete(onChange);
  };
}

export function getLocaleSnapshot(): LocaleId {
  hydrate();
  return locale;
}

/** The server cannot know what is in a browser's storage. */
export function getLocaleServerSnapshot(): LocaleId {
  return DEFAULT_LOCALE;
}
