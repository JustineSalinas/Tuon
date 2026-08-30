/**
 * Test mode assembly.
 *
 * The thing that makes this different from the existing quiz is that it picks
 * the weakest material, so most of these check the ranking. If it ever falls
 * back to "whatever order the cards were in", the mode is just a longer quiz
 * and the student ends up revising what they already know — which is what they
 * would have done unaided.
 */
import assert from "node:assert/strict";

import {
  DEFAULT_TEST_LENGTH,
  SECONDS_PER_ITEM,
  buildTest,
  formatClock,
  remainingMs,
  scoreTest,
  testDurationMs,
  weaknessOf,
} from "../src/lib/study/test-mode.ts";

let passed = 0;
function check(name, fn) {
  fn();
  passed++;
  console.log(`  ok  ${name}`);
}

const NOW = new Date("2026-08-30T04:00:00.000Z");
const DAY = 24 * 60 * 60 * 1000;
const at = (offsetDays) => ({ toDate: () => new Date(NOW.getTime() + offsetDays * DAY) });

/** Short back, so it is typeable; long backs are used explicitly below. */
const card = (id, back = "Chlorophyll") => ({ id, front: `What is ${id}?`, back });
const LONG_BACK =
  "It is split during photolysis, releasing oxygen as a by-product and supplying electrons to photosystem II.";

console.log("\nWhich cards a test is built from");

check("a card you keep failing outranks everything", () => {
  // Given the choice students revise what they already know. This is the whole
  // reason the mode picks for them.
  const logs = new Map([
    ["shaky", { easeFactor: 1.7, intervalDays: 40, nextReviewAt: at(10) }],
    ["overdue", { easeFactor: 2.5, intervalDays: 10, nextReviewAt: at(-3) }],
    ["settled", { easeFactor: 2.6, intervalDays: 60, nextReviewAt: at(30) }],
  ]);
  assert.ok(weaknessOf(logs.get("shaky"), NOW) > weaknessOf(logs.get("overdue"), NOW));
  assert.ok(weaknessOf(logs.get("overdue"), NOW) > weaknessOf(logs.get("settled"), NOW));
});

check("an unreviewed card ranks above a settled one but below an overdue one", () => {
  // Never seen is unknown, not weak. Overdue is actively being forgotten.
  const never = weaknessOf(null, NOW);
  const overdue = weaknessOf({ easeFactor: 2.5, nextReviewAt: at(-1) }, NOW);
  const settled = weaknessOf({ easeFactor: 2.5, intervalDays: 60, nextReviewAt: at(30) }, NOW);
  assert.ok(never > settled);
  assert.ok(overdue > never);
});

check("the weakest cards are the ones that end up in the test", () => {
  const cards = [card("settled"), card("shaky"), card("new")];
  const logs = new Map([
    ["settled", { easeFactor: 2.6, intervalDays: 60, nextReviewAt: at(30) }],
    ["shaky", { easeFactor: 1.6, intervalDays: 5, nextReviewAt: at(9) }],
  ]);
  const items = buildTest({ cards, questions: [], logs, length: 2, now: NOW });
  const ids = items.map((i) => i.flashcardId);
  assert.deepEqual(ids, ["shaky", "new"]);
  assert.equal(ids.includes("settled"), false);
});

check("a short set is not padded out", () => {
  const items = buildTest({
    cards: [card("a"), card("b")],
    questions: [],
    logs: new Map(),
    length: 10,
    now: NOW,
  });
  assert.equal(items.length, 2);
});

check("an empty set produces no test rather than throwing", () => {
  assert.deepEqual(buildTest({ cards: [], questions: [], logs: new Map() }), []);
});

check("the same seed always builds the same test", () => {
  // A student who reloads mid-test must not get a different one.
  const cards = [card("a"), card("b"), card("c"), card("d")];
  const args = { cards, questions: [], logs: new Map(), length: 3, now: NOW, seed: 7 };
  assert.deepEqual(
    buildTest(args).map((i) => i.flashcardId),
    buildTest(args).map((i) => i.flashcardId),
  );
});

check("different seeds vary the test among equally weak cards", () => {
  // Two attempts on a set where everything is equally weak should not be
  // identical, or the second attempt teaches nothing new.
  const cards = Array.from({ length: 12 }, (_, i) => card(`c${i}`));
  const base = { cards, questions: [], logs: new Map(), length: 6, now: NOW };
  const a = buildTest({ ...base, seed: 1 }).map((i) => i.flashcardId);
  const b = buildTest({ ...base, seed: 99 }).map((i) => i.flashcardId);
  assert.notDeepEqual(a, b);
});

check("weakness still beats the seed", () => {
  // Variety must never override the ranking, or the mode stops being useful.
  const cards = [card("strong"), card("shaky")];
  const logs = new Map([
    ["strong", { easeFactor: 2.8, intervalDays: 90, nextReviewAt: at(60) }],
    ["shaky", { easeFactor: 1.5, intervalDays: 3, nextReviewAt: at(2) }],
  ]);
  for (const seed of [1, 2, 3, 42, 1000]) {
    const first = buildTest({ cards, questions: [], logs, length: 1, now: NOW, seed })[0];
    assert.equal(first.flashcardId, "shaky", `seed ${seed}`);
  }
});

console.log("\nMixing the formats");

check("a short answer with no question is typed", () => {
  const items = buildTest({
    cards: [card("a")],
    questions: [],
    logs: new Map(),
    now: NOW,
  });
  assert.equal(items[0].kind, "typed");
});

check("a long answer with a question uses the question", () => {
  const items = buildTest({
    cards: [card("a", LONG_BACK)],
    questions: [
      { id: "q", question: "Which?", choices: ["x", "y"], correctIndex: 0, flashcardId: "a" },
    ],
    logs: new Map(),
    now: NOW,
  });
  assert.equal(items[0].kind, "mcq");
  assert.deepEqual(items[0].choices, ["x", "y"]);
  assert.equal(items[0].correctIndex, 0);
});

check("a long answer with no question is still asked", () => {
  // Silently dropping it would exclude all the long-form material from every
  // test, which is the material a board exam is most likely to ask about.
  const items = buildTest({
    cards: [card("a", LONG_BACK)],
    questions: [],
    logs: new Map(),
    now: NOW,
  });
  assert.equal(items[0].kind, "recall");
});

check("cards that support both formats alternate", () => {
  // Otherwise a test comes out as ten typed answers in a row, which is a
  // typing exercise rather than a mixed exam.
  const cards = Array.from({ length: 6 }, (_, i) => card(`c${i}`));
  const questions = cards.map((c) => ({
    id: `q${c.id}`,
    question: "Which?",
    choices: ["x", "y"],
    correctIndex: 0,
    flashcardId: c.id,
  }));
  const kinds = buildTest({ cards, questions, logs: new Map(), length: 6, now: NOW }).map(
    (i) => i.kind,
  );
  assert.ok(kinds.includes("typed"));
  assert.ok(kinds.includes("mcq"));
  // No three of the same kind in a row.
  for (let i = 2; i < kinds.length; i += 1) {
    assert.ok(
      !(kinds[i] === kinds[i - 1] && kinds[i] === kinds[i - 2]),
      `run of ${kinds[i]} at ${i}`,
    );
  }
});

check("a question with no card link is never used", () => {
  // It cannot feed the scheduler, and an unattributed question in a test that
  // claims to target weak material would be neither.
  const items = buildTest({
    cards: [card("a", LONG_BACK)],
    questions: [{ id: "q", question: "Which?", choices: ["x", "y"], correctIndex: 0 }],
    logs: new Map(),
    now: NOW,
  });
  assert.equal(items[0].kind, "recall");
});

console.log("\nThe clock");

check("a test is as long as it has questions", () => {
  assert.equal(testDurationMs(10), 10 * SECONDS_PER_ITEM * 1000);
  assert.equal(DEFAULT_TEST_LENGTH, 10);
});

check("time left is read from the start instant", () => {
  // Same rule as the Pomodoro timer: a test whose clock pauses when the tab
  // loses focus is not a test.
  const started = 1_000_000;
  const full = testDurationMs(4);
  assert.equal(remainingMs(started, 4, started), full);
  assert.equal(remainingMs(started, 4, started + 60_000), full - 60_000);
});

check("time left never goes negative", () => {
  assert.equal(remainingMs(0, 2, 999_999_999), 0);
});

check("the clock reads m:ss", () => {
  assert.equal(formatClock(7 * 60 * 1000 + 30_000), "7:30");
  assert.equal(formatClock(9000), "0:09");
  assert.equal(formatClock(0), "0:00");
  assert.equal(formatClock(-1), "0:00");
});

console.log("\nScoring");

check("unanswered questions count as wrong", () => {
  // Running out of time on a question you never reached is, in an exam,
  // exactly as costly as getting it wrong. Scoring only what was attempted
  // would flatter the student the timing exists to expose.
  const score = scoreTest([{ correct: true }, { correct: false }], 10);
  assert.equal(score.correct, 1);
  assert.equal(score.total, 10);
  assert.equal(score.percent, 10);
});

check("a perfect test is 100%", () => {
  const results = Array.from({ length: 5 }, () => ({ correct: true }));
  assert.equal(scoreTest(results, 5).percent, 100);
});

check("an empty test scores zero rather than dividing by zero", () => {
  assert.equal(scoreTest([], 0).percent, 0);
});

console.log(`\n${passed} checks passed.\n`);
