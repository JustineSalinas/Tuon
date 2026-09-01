"use client";

/**
 * Serves the current locale's messages to the app.
 *
 * NO STATE OF ITS OWN, deliberately. The locale is derived during render from
 * two sources that already exist: the profile, which is authoritative and
 * carries the choice between devices, and a localStorage mirror read through
 * `useSyncExternalStore` so the very first paint is already in the right
 * language.
 *
 * The obvious version of this — hold locale in state, set it from an effect
 * when the profile arrives — is what React 19 flags as a cascading render, and
 * it is right to: it paints English and then repaints Filipino. Deriving
 * instead means there is never a wrong frame to correct.
 *
 * Context rather than a module store for the messages themselves, because
 * unlike the palette or the timer this must re-render the tree when it
 * changes; that is the entire point of it.
 */

import { createContext, useContext, useEffect, useMemo, useSyncExternalStore } from "react";

import { useAuth } from "@/components/providers/auth-provider";
import { en, type Messages } from "@/lib/i18n/en";
import { messagesFor, readLocale, type LocaleId } from "@/lib/i18n/locales";
import {
  getLocaleServerSnapshot,
  getLocaleSnapshot,
  setStoredLocale,
  subscribeToLocale,
} from "@/lib/i18n/locale-store";

interface I18nValue {
  locale: LocaleId;
  t: Messages;
}

const I18nContext = createContext<I18nValue>({ locale: "en", t: en });

/**
 * The one hook components use.
 *
 * Destructured as `t`, so a call site reads `t.review.showAnswer` — a typed
 * property access rather than a string key, where a typo is a compile error
 * instead of a blank space on the screen.
 */
export function useI18n(): I18nValue {
  return useContext(I18nContext);
}

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const { profile } = useAuth();

  const mirrored = useSyncExternalStore(
    subscribeToLocale,
    getLocaleSnapshot,
    getLocaleServerSnapshot,
  );

  // The profile wins the moment it exists; until then the mirror stands in.
  const locale =
    profile?.locale === undefined ? mirrored : readLocale(profile.locale);

  // Writing to storage is a side effect on an external system, which is what
  // an effect is actually for — unlike setState, which this no longer does.
  useEffect(() => {
    if (locale !== mirrored) setStoredLocale(locale);
  }, [locale, mirrored]);

  const value = useMemo(() => ({ locale, t: messagesFor(locale) }), [locale]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}
