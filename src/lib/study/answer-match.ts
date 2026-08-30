/**
 * Grading a typed answer against a flashcard's back.
 *
 * Self-rated flashcards have a known flaw: you read the answer, feel the click
 * of recognition, and rate yourself "Good" on a card you could not have
 * produced. Typing first closes that gap — you either retrieved it or you did
 * not, and you find out before you see the answer.
 *
 * The whole feature lives or dies on being lenient. A student who writes the
 * right answer with a typo, or in a different word order, or without the
 * article, has recalled the card; failing them teaches nothing except that the
 * app is pedantic, and after two of those they turn typing off. So the grader
 * forgives spelling, order, punctuation, accents and filler words, and reserves
 * "wrong" for answers that are actually missing the content.
 *
 * It is deliberately not an AI call: grading must be instant, free, and
 * identical offline, and a model that occasionally disagrees with itself about
 * the same answer would be worse than a strict matcher.
 *
 * Pure, with no React or Firebase imports, so it can be unit-tested directly.
 */

import type { SrsRating } from "@/lib/types";

/**
 * Words dropped from both sides before comparing.
 *
 * English articles and prepositions plus the Filipino markers that carry no
 * content in a one-line answer: "in the thylakoid membrane" and "thylakoid
 * membrane" are the same recall, and "sa loob ng chloroplast" should not fail
 * because the student wrote "chloroplast".
 */
const FILLER = new Set([
  "a",
  "an",
  "the",
  "of",
  "in",
  "on",
  "at",
  "to",
  "into",
  "from",
  "for",
  "by",
  "is",
  "are",
  "was",
  "were",
  "it",
  "its",
  "and",
  "or",
  "that",
  "this",
  "ang",
  "mga",
  "ng",
  "sa",
  "ay",
  "na",
  "si",
]);

/**
 * Longest answer worth typing.
 *
 * Past roughly a line, typing stops being retrieval practice and becomes
 * transcription — and no matcher can fairly grade a 30-word sentence, because
 * a student who recalled it perfectly will still phrase it differently. Those
 * cards keep the plain flip, which is the honest tool for them.
 */
export const MAX_TYPEABLE_CHARS = 80;
export const MAX_TYPEABLE_WORDS = 8;

export function isTypeable(back: string): boolean {
  const trimmed = back.trim();
  if (!trimmed) return false;
  if (trimmed.length > MAX_TYPEABLE_CHARS) return false;
  return normalise(trimmed).split(" ").filter(Boolean).length <= MAX_TYPEABLE_WORDS;
}

/**
 * Strips everything that is not content.
 *
 * NFKD rather than NFD so compatibility forms collapse too: it is what turns
 * the subscript in "O₂" into a plain "2", which matters because nobody types
 * a subscript.
 */
function normalise(text: string): string {
  return text
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "") // combining accents, now separated
    .toLowerCase()
    .replace(/[^a-z0-9\s]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Content words, in the order written. */
function contentWords(normalised: string): string[] {
  const words = normalised.split(" ").filter(Boolean);
  const kept = words.filter((w) => !FILLER.has(w));
  // An answer that is nothing but filler — "it is" — would otherwise compare
  // as empty and match anything.
  return kept.length > 0 ? kept : words;
}

/**
 * The forms of an expected answer we are willing to accept.
 *
 * A back like "Oxygen (O₂)." should accept "oxygen", "O2", or both together:
 * the parenthetical is a gloss, and which half the student writes says nothing
 * about whether they knew it. Same for a "/" list, where each side is a
 * complete alternative rather than part of one phrase.
 */
function acceptedForms(expected: string): string[] {
  const forms = new Set<string>([expected]);

  const withoutParens = expected.replace(/\([^)]*\)/g, " ");
  if (normalise(withoutParens)) forms.add(withoutParens);

  for (const inner of expected.matchAll(/\(([^)]*)\)/g)) {
    if (normalise(inner[1])) forms.add(inner[1]);
  }

  // Only the unambiguous case: a handful of single-word alternatives, as in
  // "acid/base" or "mitosis/meiosis". Once a side is a phrase the slash is
  // usually punctuation inside one answer — "the rate of change / per unit of
  // time" — and splitting there would accept half an answer as the whole.
  // The three-letter floor keeps "km/h" together, where "h" alone is a unit
  // rather than an alternative.
  const parts = expected.split("/");
  const sides = parts.map((p) => contentWords(normalise(p)));
  if (
    parts.length >= 2 &&
    parts.length <= 3 &&
    sides.every((words) => words.length === 1 && words[0].length >= 3)
  ) {
    for (const part of parts) forms.add(part);
  }

  return [...forms];
}

/**
 * How many single-character mistakes to forgive, by answer length.
 *
 * Short answers get almost no slack, because at four characters a single edit
 * is a different word. Longer ones get more, because the chance of a genuine
 * typo grows with every keystroke.
 */
export function typoTolerance(length: number): number {
  if (length < 5) return 0;
  if (length < 10) return 1;
  if (length < 20) return 2;
  if (length < 32) return 3;
  return 4;
}

/** Standard Levenshtein, two rows rather than a full matrix. */
export function editDistance(a: string, b: string): number {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;

  let prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  let curr = new Array<number>(b.length + 1);

  for (let i = 1; i <= a.length; i++) {
    curr[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      curr[j] = Math.min(prev[j] + 1, curr[j - 1] + 1, prev[j - 1] + cost);
    }
    [prev, curr] = [curr, prev];
  }

  return prev[b.length];
}

/** Two words are "the same word" if one is a plausible typo of the other. */
function sameWord(a: string, b: string): boolean {
  if (a === b) return true;
  const tolerance = Math.min(typoTolerance(Math.max(a.length, b.length)), 2);
  return tolerance > 0 && editDistance(a, b) <= tolerance;
}

export type AnswerGrade = "correct" | "close" | "wrong";

export interface GradedAnswer {
  grade: AnswerGrade;
  /** Whether the typed text matched the expected answer character for character. */
  exact: boolean;
}

function gradeAgainstForm(typed: string, expected: string): GradedAnswer {
  const typedNorm = normalise(typed);
  const expectedNorm = normalise(expected);

  if (!typedNorm || !expectedNorm) return { grade: "wrong", exact: false };
  if (typedNorm === expectedNorm) {
    return { grade: "correct", exact: typed.trim() === expected.trim() };
  }

  const typedWords = contentWords(typedNorm);
  const expectedWords = contentWords(expectedNorm);

  // Word order and filler forgiven: compare the content words as a set.
  const typedSorted = [...typedWords].sort().join(" ");
  const expectedSorted = [...expectedWords].sort().join(" ");
  if (typedSorted === expectedSorted) return { grade: "correct", exact: false };

  // Spelling forgiven, scaled to how much there was to get wrong.
  if (editDistance(typedSorted, expectedSorted) <= typoTolerance(expectedSorted.length)) {
    return { grade: "correct", exact: false };
  }

  // Partial recall: how much of the expected answer is actually there. Each
  // expected word is consumed at most once, so writing "membrane membrane"
  // does not cover a two-word answer.
  const unmatched = [...typedWords];
  let covered = 0;
  for (const word of expectedWords) {
    const at = unmatched.findIndex((t) => sameWord(t, word));
    if (at !== -1) {
      unmatched.splice(at, 1);
      covered++;
    }
  }

  const coverage = covered / expectedWords.length;
  // Everything asked for is present, plus extra words — they knew it and said
  // more. Padding is not a memory failure.
  if (coverage === 1) return { grade: "correct", exact: false };
  // Half the content, and nothing invented: on the way there.
  if (coverage >= 0.5 && unmatched.length <= expectedWords.length) {
    return { grade: "close", exact: false };
  }

  return { grade: "wrong", exact: false };
}

const GRADE_RANK: Record<AnswerGrade, number> = { wrong: 0, close: 1, correct: 2 };

/**
 * Grades a typed answer, taking the best result across every accepted form of
 * the expected one.
 */
export function gradeAnswer(typed: string, expected: string): GradedAnswer {
  let best: GradedAnswer = { grade: "wrong", exact: false };
  for (const form of acceptedForms(expected)) {
    const result = gradeAgainstForm(typed, form);
    if (
      GRADE_RANK[result.grade] > GRADE_RANK[best.grade] ||
      (result.grade === best.grade && result.exact && !best.exact)
    ) {
      best = result;
    }
    if (best.grade === "correct" && best.exact) break;
  }
  return best;
}

/**
 * Progressive hints.
 *
 * The thing that kills a review session is a card you half-know: you can feel
 * the answer, you cannot produce it, and the only options are to guess wildly
 * or give up. Both waste the card. A hint turns that into a retrieval that
 * actually happens - which is the whole point of the exercise.
 *
 * It has to cost something, or every card gets hinted and the schedule becomes
 * fiction. So the levels reveal as little as will unstick you, and using one
 * demotes the rating the answer suggests.
 *
 * Level 1 is the SHAPE - how many words, how long each is. Often that alone is
 * enough ("oh, it is two words") without giving away which words.
 * Level 2 adds the FIRST LETTER of each word, which is the strongest cue that
 * still requires you to produce the rest.
 */
export const MAX_HINT_LEVEL = 2;

const HINT_MASK = "•";

export function hintFor(answer: string, level: number): string {
  const text = answer.trim();
  if (!text || level < 1) return "";

  const revealFirst = level >= 2;
  let atWordStart = true;

  return [...text]
    .map((char) => {
      // Anything that is not a letter or digit is structure, not content:
      // spaces, hyphens and brackets are shown so the shape reads truthfully.
      if (!/[\p{L}\p{N}]/u.test(char)) {
        atWordStart = true;
        return char;
      }
      const first = atWordStart;
      atWordStart = false;
      return revealFirst && first ? char : HINT_MASK;
    })
    .join("");
}

/**
 * What the grade suggests, not what it decides.
 *
 * The student still presses the button. The grader knows whether the words
 * matched; only they know whether it came instantly or after ten seconds of
 * digging, and that difference is most of what SM-2 is reading. So this picks
 * the default and they can move it.
 *
 * "Correct" suggests Good rather than Easy on purpose - Easy should mean the
 * card was effortless, which typing it out rather argues against.
 *
 * A hinted answer is demoted one step. Recalling something after being shown
 * its first letters is real, but it is not the same memory as producing it
 * cold, and scheduling the two identically would push a shaky card out on the
 * strength of a cue that will not be there next time.
 */
export function suggestedRating(grade: AnswerGrade, hinted = false): SrsRating {
  const clean: SrsRating = grade === "correct" ? "good" : grade === "close" ? "hard" : "again";
  if (!hinted) return clean;
  return clean === "good" ? "hard" : "again";
}
