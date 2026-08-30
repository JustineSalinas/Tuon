import assert from "node:assert/strict";
import {
  extractJson,
  parseGeneratedStudySet,
} from "../src/lib/ai/schema.ts";

let passed = 0;
function check(name, fn) {
  fn();
  passed += 1;
  console.log(`  ok  ${name}`);
}

/** Builds a valid payload with n flashcards and m questions. */
function payload(n = 8, m = 5) {
  return {
    flashcards: Array.from({ length: n }, (_, i) => ({
      front: `Front ${i}`,
      back: `Back ${i}`,
    })),
    quiz: {
      questions: Array.from({ length: m }, (_, i) => ({
        question: `Q${i}`,
        choices: [`${i}a`, `${i}b`, `${i}c`, `${i}d`],
        correct_index: i % 4,
      })),
    },
  };
}

console.log("\nJSON extraction");

check("plain JSON passes through", () => {
  assert.equal(extractJson('{"a":1}'), '{"a":1}');
});

check("```json fences are stripped", () => {
  assert.equal(extractJson('```json\n{"a":1}\n```'), '{"a":1}');
});

check("bare ``` fences are stripped", () => {
  assert.equal(extractJson('```\n{"a":1}\n```'), '{"a":1}');
});

check("surrounding prose is discarded", () => {
  assert.equal(
    extractJson('Sure! Here is your study set:\n{"a":1}\nHope that helps!'),
    '{"a":1}',
  );
});

check("no JSON at all returns null", () => {
  assert.equal(extractJson("I cannot help with that."), null);
  assert.equal(extractJson("   "), null);
});

console.log("\nValidation and normalisation");

check("a clean payload parses", () => {
  const r = parseGeneratedStudySet(JSON.stringify(payload()));
  assert.equal(r.ok, true);
  assert.equal(r.data.flashcards.length, 8);
  assert.equal(r.data.quiz.questions.length, 5);
});

check("a fenced payload parses", () => {
  const r = parseGeneratedStudySet("```json\n" + JSON.stringify(payload()) + "\n```");
  assert.equal(r.ok, true);
});

check("truncation with no closing brace fails cleanly", () => {
  const r = parseGeneratedStudySet('{"flashcards":[{"front":"a","back":');
  assert.equal(r.ok, false);
  assert.match(r.error, /did not contain any JSON/);
});

check("malformed JSON that still has braces fails cleanly", () => {
  const r = parseGeneratedStudySet('{"flashcards":[{"front":"a","back":}]}');
  assert.equal(r.ok, false);
  assert.match(r.error, /not valid JSON/);
});

check("a question whose answer key is out of range is dropped", () => {
  const p = payload(8, 5);
  p.quiz.questions[0].correct_index = 9; // points at nothing
  const r = parseGeneratedStudySet(JSON.stringify(p));
  assert.equal(r.ok, true);
  assert.equal(r.data.quiz.questions.length, 4, "the bad question must be dropped");
});

check("a question with duplicate choices is dropped", () => {
  const p = payload(8, 5);
  p.quiz.questions[1].choices = ["same", "same", "c", "d"];
  const r = parseGeneratedStudySet(JSON.stringify(p));
  assert.equal(r.data.quiz.questions.length, 4);
});

check("a question with the wrong number of choices is dropped", () => {
  const p = payload(8, 5);
  p.quiz.questions[2].choices = ["only", "three", "here"];
  const r = parseGeneratedStudySet(JSON.stringify(p));
  assert.equal(r.data.quiz.questions.length, 4);
});

check("duplicate flashcard fronts are collapsed", () => {
  const p = payload(8, 5);
  p.flashcards[1].front = p.flashcards[0].front;
  const r = parseGeneratedStudySet(JSON.stringify(p));
  assert.equal(r.data.flashcards.length, 7);
});

check("flashcards are capped at 15", () => {
  const r = parseGeneratedStudySet(JSON.stringify(payload(40, 5)));
  assert.equal(r.data.flashcards.length, 15);
});

check("too few usable flashcards is an error, not a bad study set", () => {
  const r = parseGeneratedStudySet(JSON.stringify(payload(2, 5)));
  assert.equal(r.ok, false);
  assert.match(r.error, /usable flashcard/);
});

check("too few usable questions is an error", () => {
  const p = payload(8, 5);
  for (const q of p.quiz.questions) q.correct_index = 99;
  const r = parseGeneratedStudySet(JSON.stringify(p));
  assert.equal(r.ok, false);
  assert.match(r.error, /usable quiz question/);
});

check("wrong shape entirely is rejected", () => {
  const r = parseGeneratedStudySet('{"cards":[],"test":{}}');
  assert.equal(r.ok, false);
  assert.match(r.error, /unexpected shape/);
});

check("whitespace is trimmed off every field", () => {
  const p = payload();
  p.flashcards[0].front = "  padded  ";
  const r = parseGeneratedStudySet(JSON.stringify(p));
  assert.equal(r.data.flashcards[0].front, "padded");
});

check("a refusal in prose does not crash the parser", () => {
  const r = parseGeneratedStudySet("I'm sorry, I can't do that.");
  assert.equal(r.ok, false);
  assert.match(r.error, /did not contain any JSON/);
});

console.log("\nQuiz-to-card links");

/** A payload whose questions each point at a specific card index. */
function linked(cards, links) {
  return {
    flashcards: cards.map((front, i) => ({ front, back: `Back ${i}` })),
    quiz: {
      questions: links.map((tests_card_index, i) => ({
        question: `Q${i}`,
        choices: [`${i}a`, `${i}b`, `${i}c`, `${i}d`],
        correct_index: 0,
        tests_card_index,
      })),
    },
  };
}

check("a straightforward link survives parsing", () => {
  const raw = JSON.stringify(
    linked(["A", "B", "C", "D", "E"], [0, 4, 2]),
  );
  const r = parseGeneratedStudySet(raw);
  assert.equal(r.ok, true);
  assert.deepEqual(
    r.data.quiz.questions.map((q) => q.tests_card_index),
    [0, 4, 2],
  );
});

check("links are remapped around a dropped duplicate card", () => {
  // THE trap. The parser drops duplicate fronts, which shifts every later
  // card down one. A link resolved against the model's original numbering
  // would then quietly grade the wrong card — and nothing downstream could
  // detect it, because the index is still perfectly valid.
  //
  // Model sees:  0:A  1:A(dup)  2:B  3:C  4:D
  // After drop:  0:A  1:B       2:C  3:D
  const raw = JSON.stringify(linked(["A", "A", "B", "C", "D"], [2, 3, 4]));
  const r = parseGeneratedStudySet(raw);
  assert.equal(r.ok, true);
  assert.deepEqual(
    r.data.flashcards.map((c) => c.front),
    ["A", "B", "C", "D"],
  );
  assert.deepEqual(
    r.data.quiz.questions.map((q) => q.tests_card_index),
    [1, 2, 3],
    "B, C and D must still be the cards being tested",
  );
});

check("links are remapped around a card dropped for being empty", () => {
  const payloadWithBlank = {
    flashcards: [
      { front: "A", back: "Back A" },
      { front: "   ", back: "Back blank" },
      { front: "B", back: "Back B" },
    ],
    quiz: {
      questions: [0, 1, 2].map((tests_card_index, i) => ({
        question: `Q${i}`,
        choices: ["a", "b", "c", "d"],
        correct_index: 0,
        tests_card_index,
      })),
    },
  };
  const r = parseGeneratedStudySet(JSON.stringify(payloadWithBlank));
  // Only two cards survive, which is under the usable floor, so the whole
  // generation is refused — the link behaviour is not what is asserted here.
  assert.equal(r.ok, false);
});

check("a link pointing at a dropped card becomes null, not a wrong card", () => {
  // Model sees: 0:A 1:A(dup) 2:B ... and one question tests the duplicate.
  // Silently retargeting that question at some other card would be worse than
  // losing the link.
  const raw = JSON.stringify(
    linked(["A", "A", "B", "C", "D", "E"], [1, 2]),
  );
  const r = parseGeneratedStudySet(raw);
  assert.equal(r.ok, true);
  assert.equal(r.data.quiz.questions[0].tests_card_index, null);
  assert.equal(r.data.quiz.questions[1].tests_card_index, 1, "B is now index 1");
});

check("a link past the end of the array becomes null", () => {
  const raw = JSON.stringify(linked(["A", "B", "C", "D", "E"], [99, 0]));
  const r = parseGeneratedStudySet(raw);
  assert.equal(r.ok, true);
  assert.equal(r.data.quiz.questions[0].tests_card_index, null);
  assert.equal(r.data.quiz.questions[1].tests_card_index, 0);
});

check("a model that omits the link still produces a usable set", () => {
  // Optional on purpose: losing the link is a missing feature, losing the
  // whole generation is a refunded quota and an angry student.
  const p = payload(8, 5);
  p.quiz.questions.forEach((q) => delete q.tests_card_index);
  const r = parseGeneratedStudySet(JSON.stringify(p));
  assert.equal(r.ok, true);
  assert.ok(r.data.quiz.questions.every((q) => q.tests_card_index === null));
});

check("every link resolves to a card that actually exists", () => {
  // The invariant the whole feature rests on: a non-null index must always be
  // addressable in the returned flashcards array.
  const raw = JSON.stringify(
    linked(["A", "A", "B", "C", "D", "E", "F"], [0, 1, 2, 3, 4, 5, 6, 99]),
  );
  const r = parseGeneratedStudySet(raw);
  assert.equal(r.ok, true);
  for (const q of r.data.quiz.questions) {
    if (q.tests_card_index === null) continue;
    assert.ok(
      r.data.flashcards[q.tests_card_index] !== undefined,
      `index ${q.tests_card_index} is out of range`,
    );
  }
});


console.log(`\n${passed} checks passed.\n`);
