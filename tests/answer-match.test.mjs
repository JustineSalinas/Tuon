/**
 * Typed-recall grading.
 *
 * The risk this suite exists for is one-sided. A grader that is too strict
 * fails students who knew the answer, and they turn typing off after the
 * second unfair "wrong" — so most of these are leniency checks. But a grader
 * that accepts anything is worse than none at all, because it quietly inflates
 * every interval, so the last group pins down what must still fail.
 */
import assert from "node:assert/strict";

import {
  MAX_HINT_LEVEL,
  MAX_TYPEABLE_CHARS,
  editDistance,
  hintFor,
  gradeAnswer,
  isTypeable,
  suggestedRating,
  typoTolerance,
} from "../src/lib/study/answer-match.ts";

let passed = 0;
function check(name, fn) {
  fn();
  passed++;
  console.log(`  ok  ${name}`);
}

const grade = (typed, expected) => gradeAnswer(typed, expected).grade;

console.log("\nWhich cards can be typed");

check("a short answer is typeable", () => {
  assert.equal(isTypeable("ATP and NADPH."), true);
  assert.equal(isTypeable("In the thylakoid membrane of the chloroplast."), true);
});

check("a paragraph is not", () => {
  // Nobody transcribes a sentence from memory word for word, and no matcher
  // could fairly judge it if they tried. Those cards keep the plain flip.
  assert.equal(
    isTypeable(
      "It is split - photolysis - releasing oxygen as a by-product and supplying electrons to photosystem II.",
    ),
    false,
  );
});

check("an empty back is not typeable", () => {
  assert.equal(isTypeable(""), false);
  assert.equal(isTypeable("   "), false);
});

check("the length limit is measured on the real string", () => {
  assert.equal(isTypeable("x".repeat(MAX_TYPEABLE_CHARS)), true);
  assert.equal(isTypeable("x".repeat(MAX_TYPEABLE_CHARS + 1)), false);
});

check("many short words are rejected even under the character limit", () => {
  // Twelve words is a sentence regardless of how short each one is.
  assert.equal(isTypeable("a b c d e f g h i j k l"), false);
});

console.log("\nWhat must be forgiven");

check("an exact answer is correct", () => {
  assert.equal(grade("ATP and NADPH", "ATP and NADPH"), "correct");
});

check("case and punctuation are ignored", () => {
  assert.equal(grade("atp and nadph!!", "ATP and NADPH."), "correct");
});

check("surrounding whitespace is ignored", () => {
  assert.equal(grade("   chlorophyll  ", "Chlorophyll"), "correct");
});

check("a typo does not fail you", () => {
  assert.equal(grade("chlorophyl", "Chlorophyll"), "correct");
  assert.equal(grade("mitochondira", "Mitochondria"), "correct");
});

check("word order does not fail you", () => {
  assert.equal(grade("NADPH and ATP", "ATP and NADPH"), "correct");
});

check("missing articles and prepositions do not fail you", () => {
  assert.equal(
    grade("thylakoid membrane", "In the thylakoid membrane of the chloroplast"),
    "close",
  );
  assert.equal(grade("the stroma", "Stroma"), "correct");
  assert.equal(grade("stroma", "In the stroma"), "correct");
});

check("Filipino markers are treated as filler too", () => {
  // A student answering in Taglish writes the markers; they carry no content
  // in a one-line answer and must not be the difference between right and
  // wrong.
  assert.equal(grade("sa stroma", "Stroma"), "correct");
  assert.equal(grade("ang chlorophyll", "Chlorophyll"), "correct");
});

check("accents are ignored", () => {
  assert.equal(grade("resume", "résumé"), "correct");
  assert.equal(grade("Niño", "nino"), "correct");
});

check("a subscript is matched by the plain digit", () => {
  // Nobody types a subscript, and the card says "Oxygen (O₂)".
  assert.equal(grade("O2", "O₂"), "correct");
});

check("either half of a glossed answer is accepted", () => {
  assert.equal(grade("oxygen", "Oxygen (O2)"), "correct");
  assert.equal(grade("O2", "Oxygen (O2)"), "correct");
  assert.equal(grade("oxygen (O2)", "Oxygen (O2)"), "correct");
});

check("either side of a short slash alternative is accepted", () => {
  assert.equal(grade("acid", "acid/base"), "correct");
  assert.equal(grade("base", "acid/base"), "correct");
});

check("a slash inside one long phrase is not split", () => {
  // "the rate of change / per unit time" is one answer that happens to use a
  // slash. Accepting half of it would pass someone who wrote half of it.
  assert.equal(grade("per unit of time", "the rate of change / per unit of time"), "close");
});

check("saying more than was asked still counts", () => {
  assert.equal(
    grade("in the thylakoid membrane inside the chloroplast", "thylakoid membrane"),
    "correct",
  );
});

console.log("\nWhat must still fail");

check("a blank answer is wrong", () => {
  assert.equal(grade("", "Chlorophyll"), "wrong");
  assert.equal(grade("   ", "Chlorophyll"), "wrong");
});

check("a different answer is wrong", () => {
  assert.equal(grade("the stroma", "the thylakoid membrane"), "wrong");
  assert.equal(grade("mitochondria", "chloroplast"), "wrong");
});

check("a short wrong word is not forgiven as a typo", () => {
  // At four characters one edit is a different word, so the tolerance is zero.
  assert.equal(typoTolerance(4), 0);
  assert.equal(grade("cell", "bell"), "wrong");
});

check("typing the question back is wrong", () => {
  assert.equal(
    grade("where do the light reactions occur", "the thylakoid membrane"),
    "wrong",
  );
});

check("one word of a two-word answer is close, not correct", () => {
  // Half an answer is real progress and must not be graded the same as a
  // blank, but it is not recall either.
  assert.equal(grade("thylakoid", "thylakoid membrane"), "close");
});

check("an answer made only of filler cannot match everything", () => {
  // "it is" normalises to nothing; if filler-stripping left it empty it would
  // compare equal to any other empty-after-stripping answer.
  assert.equal(grade("it is", "Chlorophyll"), "wrong");
});

console.log("\nEdit distance");

check("distance counts single-character edits", () => {
  assert.equal(editDistance("kitten", "sitting"), 3);
  assert.equal(editDistance("", "abc"), 3);
  assert.equal(editDistance("abc", "abc"), 0);
});

check("tolerance grows with length but is capped", () => {
  assert.equal(typoTolerance(3), 0);
  assert.ok(typoTolerance(12) > typoTolerance(6));
  assert.ok(typoTolerance(200) <= 4);
});

console.log("\nWhat the grade suggests");

check("each grade suggests a rating the student can override", () => {
  assert.equal(suggestedRating("correct"), "good");
  assert.equal(suggestedRating("close"), "hard");
  assert.equal(suggestedRating("wrong"), "again");
});

check("a typed correct answer suggests Good, never Easy", () => {
  // Easy should mean the card was effortless. Having just typed it out is an
  // argument against that, and Easy stretches the interval hardest.
  assert.notEqual(suggestedRating("correct"), "easy");
});

console.log("\nHints");

const DOT = String.fromCharCode(0x2022);

check("level 1 shows the shape and nothing else", () => {
  // How many words, and how long each is. Often that alone is the unstick,
  // and it gives away no letters at all.
  assert.equal(hintFor("ATP and NADPH", 1), `${DOT.repeat(3)} ${DOT.repeat(3)} ${DOT.repeat(5)}`);
});

check("level 2 adds the first letter of each word", () => {
  assert.equal(hintFor("ATP and NADPH", 2), `A${DOT.repeat(2)} a${DOT.repeat(2)} N${DOT.repeat(4)}`);
});

check("punctuation is structure, so it is shown", () => {
  // A masked hyphen would misrepresent the shape as one longer word.
  assert.equal(hintFor("by-product", 1), `${DOT.repeat(2)}-${DOT.repeat(7)}`);
  assert.equal(hintFor("by-product", 2), `b${DOT}-p${DOT.repeat(6)}`);
});

check("a hyphen starts a new word for the first-letter hint", () => {
  assert.equal(hintFor("well-known", 2), `w${DOT.repeat(3)}-k${DOT.repeat(4)}`);
});

check("digits are masked like letters", () => {
  assert.equal(hintFor("O2", 1), DOT.repeat(2));
});

check("accented letters are masked as one character each", () => {
  // Not as their decomposed forms - the shape must match what you type.
  assert.equal(hintFor("Tuón", 1).length, 4);
});

check("no hint at level 0", () => {
  assert.equal(hintFor("Chlorophyll", 0), "");
});

check("an empty answer yields no hint", () => {
  assert.equal(hintFor("   ", 2), "");
});

check("there are exactly two levels", () => {
  // Level 3 would be the answer itself, which is what "show me" is for.
  assert.equal(MAX_HINT_LEVEL, 2);
});

console.log("\nWhat a hint costs");

check("a hinted correct answer rates lower than a clean one", () => {
  // Recalling it after seeing the first letters is real, but the cue will not
  // be there next time; scheduling both as Good pushes a shaky card out.
  assert.equal(suggestedRating("correct", false), "good");
  assert.equal(suggestedRating("correct", true), "hard");
});

check("a hinted near-miss drops to Again", () => {
  assert.equal(suggestedRating("close", true), "again");
});

check("a hinted wrong answer is still just wrong", () => {
  assert.equal(suggestedRating("wrong", true), "again");
});

check("no hint means no demotion", () => {
  // The default has to stay the unhinted one, or every card would be demoted.
  assert.equal(suggestedRating("close"), suggestedRating("close", false));
});


console.log(`\n${passed} checks passed.\n`);
