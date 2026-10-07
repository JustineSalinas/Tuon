/**
 * Which languages Tuón offers, and which are ready to be offered.
 *
 * `PENDING_REVIEW` is the important part. A locale exists in the codebase as
 * soon as it is drafted, so it can be read, diffed and corrected — but it is
 * not put in front of a student until a native speaker has been through it.
 * Shipping stilted Filipino in a Filipino study app is worse than shipping
 * English: it reads as a product built FOR them rather than BY someone like
 * them, and that is the one impression this app cannot afford to give.
 */

import { en, type Messages } from "@/lib/i18n/en";
import { fil } from "@/lib/i18n/fil";

export const LOCALES = [
  {
    id: "en",
    /** Always written in the language itself — nobody looks for "Filipino". */
    label: "English",
    messages: en,
  },
  {
    id: "fil",
    label: "Filipino",
    messages: fil,
  },
] as const;

export type LocaleId = (typeof LOCALES)[number]["id"];

export const DEFAULT_LOCALE: LocaleId = "en";

/**
 * Drafted but not yet reviewed by a native speaker.
 *
 * Remove an entry here to put it in the picker. Nothing else has to change —
 * the translation is already complete and type-checked against English.
 */
export const PENDING_REVIEW: LocaleId[] = ["fil"];

export function isReady(id: LocaleId): boolean {
  return !PENDING_REVIEW.includes(id);
}

/**
 * Locales a student may choose, reviewed ones first.
 *
 * A draft is listed rather than hidden, and marked. Hiding it would make the
 * review impossible — the person checking the Filipino has to read it inside
 * the running app, on the screens the words actually appear on, not in a file.
 * The label is what stops anyone mistaking it for finished.
 */
export function offeredLocales() {
  return [...LOCALES].sort(
    (a, b) => Number(isReady(b.id)) - Number(isReady(a.id)),
  );
}

export function readLocale(value: unknown): LocaleId {
  return LOCALES.some((l) => l.id === value)
    ? (value as LocaleId)
    : DEFAULT_LOCALE;
}

/**
 * Messages for a locale.
 *
 * A draft resolves to its own words, not to English — otherwise selecting it
 * to review it would show English and there would be nothing to review. What
 * keeps an unfinished translation from reaching students is the label in the
 * picker plus the fact that there are none yet, and the one-line change that
 * settles it is removing the id from PENDING_REVIEW.
 */
export function messagesFor(id: LocaleId): Messages {
  return LOCALES.find((l) => l.id === id)?.messages ?? en;
}

/** Mirrored in localStorage for the same reason the palette is. */
export const LOCALE_STORAGE_KEY = "tuon.locale";

/**
 * Pre-paint script for `<html lang>`, run in `<head>` exactly like
 * `paletteScript` — see that one for why this has to happen before React
 * hydrates rather than in an effect. Without it `<html>` was hard-coded to
 * `lang="en"` even for a student who had switched to Filipino, so a screen
 * reader applied English pronunciation rules to Filipino text: a real WCAG
 * 3.1.1 (Language of Page) failure, not a cosmetic one.
 *
 * Every locale id here is already a valid BCP-47 primary language subtag
 * (`"en"`, `"fil"`, …), so it is used directly with no separate mapping table
 * to drift out of sync with `LOCALES` above. The allow-list is generated from
 * `LOCALES` itself rather than hard-coded, so a third language dropped in
 * there is covered here automatically — the first version of this checked
 * `l==="en"||l==="fil"` literally, which would have silently left `<html>` on
 * its default language for anyone who picked a locale added later.
 */
const LOCALE_IDS = LOCALES.map((l) => l.id);
export const localeScript = `(function(){try{var l=localStorage.getItem(${JSON.stringify(
  LOCALE_STORAGE_KEY,
)});if(${JSON.stringify(LOCALE_IDS)}.indexOf(l)!==-1){document.documentElement.setAttribute('lang',l)}}catch(e){}})()`;
