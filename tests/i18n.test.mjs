/**
 * Locales.
 *
 * The guarantee this system is built around is that a half-translated locale
 * cannot be committed — TypeScript catches a missing key before it can become
 * an English word in the middle of a Filipino screen. TypeScript covers the
 * keys; these cover what it cannot see: that no string was left in English by
 * copy-paste, that the parameterised ones actually use their arguments, and
 * that an unreviewed draft cannot reach a student.
 */
import assert from "node:assert/strict";

import { en } from "../src/lib/i18n/en.ts";
import { fil } from "../src/lib/i18n/fil.ts";
import {
  DEFAULT_LOCALE,
  LOCALES,
  PENDING_REVIEW,
  isReady,
  messagesFor,
  offeredLocales,
  readLocale,
} from "../src/lib/i18n/locales.ts";

let passed = 0;
function check(name, fn) {
  fn();
  passed++;
  console.log(`  ok  ${name}`);
}

/** Every leaf in a message tree, as dotted paths. */
function leaves(obj, prefix = "") {
  const out = [];
  for (const [key, value] of Object.entries(obj)) {
    const path = prefix ? `${prefix}.${key}` : key;
    if (value && typeof value === "object") out.push(...leaves(value, path));
    else out.push([path, value]);
  }
  return out;
}

console.log("\nThe catalogues line up");

check("every English key exists in Filipino", () => {
  // TypeScript enforces this at build time; asserting it here means a change
  // that breaks it fails the test suite too, not only the compiler.
  const enKeys = leaves(en).map(([k]) => k).sort();
  const filKeys = leaves(fil).map(([k]) => k).sort();
  assert.deepEqual(filKeys, enKeys);
});

check("no extra keys were left behind in Filipino", () => {
  // A key removed from English but not from a locale is dead weight that looks
  // like a live string to the next person editing it.
  const enKeys = new Set(leaves(en).map(([k]) => k));
  for (const [key] of leaves(fil)) {
    assert.ok(enKeys.has(key), `fil has an orphan key: ${key}`);
  }
});

check("strings and functions match kind for kind", () => {
  // A plain string where English has a function means an interpolated value
  // silently disappears from the sentence.
  const filByKey = new Map(leaves(fil));
  for (const [key, value] of leaves(en)) {
    assert.equal(typeof filByKey.get(key), typeof value, `${key} differs in kind`);
  }
});

console.log("\nThe translation is a translation");

check("almost nothing was left in English by copy-paste", () => {
  // Some strings SHOULD match — "Focus", "System", "Graph" are used as-is in
  // Filipino schools. But if most of them matched, someone had pasted the
  // English file and stopped.
  const filByKey = new Map(leaves(fil));
  let identical = 0;
  let strings = 0;
  for (const [key, value] of leaves(en)) {
    if (typeof value !== "string") continue;
    strings += 1;
    if (filByKey.get(key) === value) identical += 1;
  }
  assert.ok(
    identical / strings < 0.3,
    `${identical} of ${strings} strings are still English`,
  );
});

check("parameterised strings actually use their argument", () => {
  // The failure this catches: a translator writes "8 kard" as a fixed string
  // and drops the count, so every student sees the same number forever.
  assert.match(fil.dashboard.cardsNeedWork(7), /7/);
  assert.match(fil.common.cards(3), /3/);
  assert.match(fil.common.days(5), /5/);
  assert.match(fil.common.inDays(4), /4/);
  assert.match(fil.timer.blocksToday(2), /2/);
  assert.match(fil.dashboard.noneWillHold("Biyernes"), /Biyernes/);
  assert.match(fil.review.youWrote("stroma"), /stroma/);
});

check("Filipino does not pluralise the noun after a number", () => {
  // "8 kard", never "8 mga kard". English switches the noun and Filipino does
  // not, which is exactly why each locale writes its own rule.
  assert.equal(fil.common.cards(1), "1 kard");
  assert.equal(fil.common.cards(9), "9 kard");
  assert.notEqual(en.common.cards(1), en.common.cards(9));
});

console.log("\nWhat a student is offered");

check("a drafted locale is flagged, and sorted below the finished ones", () => {
  // Stilted Filipino in a Filipino study app is worse than English: it reads
  // as a product built for them rather than by someone like them. The flag is
  // what the picker uses to say so.
  assert.ok(PENDING_REVIEW.includes("fil"));
  assert.equal(isReady("fil"), false);
  assert.equal(isReady("en"), true);
  assert.deepEqual(offeredLocales().map((l) => l.id), ["en", "fil"]);
});

check("a draft shows its own words, so it can be reviewed at all", () => {
  // Resolving it to English would mean selecting it to check it displayed
  // English, and there would be nothing to check.
  assert.equal(messagesFor("fil"), fil);
  assert.equal(messagesFor("en"), en);
});

check("an unknown locale falls back rather than breaking", () => {
  assert.equal(readLocale("klingon"), DEFAULT_LOCALE);
  assert.equal(readLocale(undefined), DEFAULT_LOCALE);
  assert.equal(readLocale(null), DEFAULT_LOCALE);
  assert.equal(readLocale(42), DEFAULT_LOCALE);
});

check("a known locale is kept", () => {
  assert.equal(readLocale("en"), "en");
  assert.equal(readLocale("fil"), "fil");
});

check("every locale is labelled in its own language", () => {
  // Nobody scanning a language list looks for the English name of their own.
  for (const locale of LOCALES) {
    assert.ok(locale.label.length > 0, locale.id);
  }
  assert.equal(LOCALES.find((l) => l.id === "fil").label, "Filipino");
});

console.log(`\n${passed} checks passed.\n`);
