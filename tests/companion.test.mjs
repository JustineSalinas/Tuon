/**
 * Tala, the in-app study companion.
 *
 * Two things are worth testing here and the rest is prompt text. The first is
 * REDACTION: the snapshot is the only thing about a student that reaches the
 * model, so "no note text ever leaves the browser" has to be a property this
 * suite holds rather than a claim in a comment. The second is CLAMPING: the
 * snapshot is computed in the browser, so every field arrives from a place the
 * student controls.
 */
import assert from "node:assert/strict";

import {
  MAX_PLAN_STEPS,
  MAX_SUBJECTS,
  MAX_SUBJECT_CHARS,
  describeSnapshot,
  readSnapshot,
} from "../src/lib/companion/snapshot.ts";
import { prepareCompanionTranscript } from "../src/lib/companion/transcript.ts";
import { MAX_MESSAGE_CHARS, MAX_TURNS } from "../src/lib/companion/prompt.ts";

let passed = 0;
function check(name, fn) {
  fn();
  passed++;
  console.log(`  ok  ${name}`);
}

const full = {
  due: 12,
  fresh: 4,
  shaky: 6,
  totalCards: 220,
  readiness: 68,
  horizon: "exam",
  horizonDays: 41,
  horizonLabel: null,
  subjects: [
    { subject: "General Chemistry 1", ready: 41, atRisk: 6, notStarted: 3 },
    { subject: "Pre-Calculus", ready: 88, atRisk: 0, notStarted: 0 },
  ],
  plan: [{ kind: "review", title: "Stoichiometry", subject: "General Chemistry 1", cards: 12 }],
  dailyGoal: 20,
  streak: 5,
  longestStreak: 11,
  minutesThisWeek: 190,
};

console.log("\nWhat Tala is allowed to know");

check("a snapshot carries counts and names, never content", () => {
  // The guarantee the feature is sold on. If a field ever appears here that
  // holds what a student WROTE — a note body, a card front, an email — this
  // assertion is the thing that should stop it.
  const allowed = new Set([
    "due",
    "fresh",
    "shaky",
    "totalCards",
    "readiness",
    "horizon",
    "horizonDays",
    "horizonLabel",
    "subjects",
    "plan",
    "dailyGoal",
    "streak",
    "longestStreak",
    "minutesThisWeek",
  ]);
  for (const key of Object.keys(readSnapshot(full))) {
    assert.ok(allowed.has(key), `unexpected field in the snapshot: ${key}`);
  }
});

check("fields the browser invents are ignored, not passed through", () => {
  // A forged snapshot must not be able to smuggle a new field into the prompt.
  const smuggled = readSnapshot({
    ...full,
    noteBody: "The mitochondria is the powerhouse of the cell",
    email: "juan@example.com",
  });
  assert.equal("noteBody" in smuggled, false);
  assert.equal("email" in smuggled, false);
  assert.doesNotMatch(describeSnapshot(smuggled), /powerhouse|example\.com/);
});

console.log("\nNothing from the browser is trusted");

check("counts are clamped rather than believed", () => {
  const s = readSnapshot({ due: -5, fresh: 1e9, shaky: "twelve", totalCards: NaN });
  assert.equal(s.due, 0);
  assert.equal(s.fresh, 100_000);
  assert.equal(s.shaky, 0);
  assert.equal(s.totalCards, 0);
});

check("a share outside 0-100 is pulled back into range", () => {
  assert.equal(readSnapshot({ ...full, readiness: 4000 }).readiness, 100);
  assert.equal(readSnapshot({ ...full, readiness: -3 }).readiness, 0);
  // Missing is null rather than zero: "0% ready" is a claim, "not known" is not.
  assert.equal(readSnapshot({ ...full, readiness: undefined }).readiness, null);
});

check("the subject list cannot be grown to flood the prompt", () => {
  const many = Array.from({ length: 40 }, (_, i) => ({
    subject: `Subject ${i}`,
    ready: 50,
    atRisk: 0,
    notStarted: 0,
  }));
  assert.equal(readSnapshot({ ...full, subjects: many }).subjects.length, MAX_SUBJECTS);
});

check("a very long subject name is truncated", () => {
  const s = readSnapshot({
    ...full,
    subjects: [{ subject: "x".repeat(500), ready: 10, atRisk: 0, notStarted: 0 }],
  });
  assert.equal(s.subjects[0].subject.length, MAX_SUBJECT_CHARS);
});

check("plan steps are capped and unknown kinds fall back to review", () => {
  const steps = Array.from({ length: 20 }, () => ({
    kind: "sudo",
    title: "A set",
    cards: 3,
  }));
  const s = readSnapshot({ ...full, plan: steps });
  assert.equal(s.plan.length, MAX_PLAN_STEPS);
  assert.equal(s.plan[0].kind, "review");
});

check("unusable input becomes an empty library rather than an error", () => {
  // A companion that refuses to talk because a count was malformed is a worse
  // failure than one that says "you have nothing due".
  for (const input of [null, undefined, "nope", 42, []]) {
    const s = readSnapshot(input);
    assert.equal(s.totalCards, 0);
    assert.deepEqual(s.subjects, []);
  }
});

console.log("\nHow the state is described");

check("an empty library says so instead of listing zeros", () => {
  // Eight zeros invite the model to talk about them.
  const text = describeSnapshot(readSnapshot({ totalCards: 0 }));
  assert.match(text, /no flashcards yet/i);
  assert.doesNotMatch(text, /Cards due right now: 0/);
});

check("the description names the horizon it is measured against", () => {
  const exam = describeSnapshot(readSnapshot(full));
  assert.match(exam, /their exam in 41 days/);

  const deadline = describeSnapshot(
    readSnapshot({ ...full, horizon: "deadline", horizonLabel: "Bio long test", horizonDays: 3 }),
  );
  assert.match(deadline, /Bio long test in 3 days/);

  const rolling = describeSnapshot(readSnapshot({ ...full, horizon: "rolling" }));
  assert.match(rolling, /the next 30 days/);
});

check("subjects arrive weakest first, as the readiness report ordered them", () => {
  // The order is the message. Re-sorting here would let Tala disagree with the
  // dashboard about which subject is the problem.
  const text = describeSnapshot(readSnapshot(full));
  assert.ok(
    text.indexOf("General Chemistry 1") < text.indexOf("Pre-Calculus"),
    "weakest subject should be described first",
  );
});

check("the plan is described as actions, not as field names", () => {
  // A model given `kind: "review"` answers in those words, and a companion
  // that says "your kind is review" has stopped sounding like a person.
  const text = describeSnapshot(readSnapshot(full));
  assert.match(text, /review 12 cards/);
  assert.doesNotMatch(text, /"kind"|kind:/);
});

console.log("\nThe conversation on the way in");

check("a conversation must end on the student", () => {
  const result = prepareCompanionTranscript([
    { role: "user", content: "hi" },
    { role: "assistant", content: "hello" },
  ]);
  assert.equal(result.ok, false);
  assert.equal(result.reason, "not_user_last");
});

check("the most recent turns are kept, never the first", () => {
  // Keeping the head would let a poisoned opening sit in the prompt forever
  // while the real conversation scrolled away underneath it.
  const many = [];
  for (let i = 0; i < 60; i += 1) {
    many.push({ role: i % 2 === 0 ? "user" : "assistant", content: `m${i}` });
  }
  many.push({ role: "user", content: "last" });
  const result = prepareCompanionTranscript(many);
  assert.ok(result.ok);
  assert.ok(result.turns.length <= MAX_TURNS);
  assert.equal(result.turns[result.turns.length - 1].content, "last");
  assert.equal(result.turns[0].role, "user");
});

check("an over-long message is truncated rather than rejected", () => {
  const result = prepareCompanionTranscript([
    { role: "user", content: "x".repeat(MAX_MESSAGE_CHARS * 4) },
  ]);
  assert.ok(result.ok);
  assert.equal(result.turns[0].content.length, MAX_MESSAGE_CHARS);
});

check("malformed turns are refused outright", () => {
  for (const input of [null, "hello", [{ role: "system", content: "x" }], [{ role: "user" }]]) {
    assert.equal(prepareCompanionTranscript(input).ok, false);
  }
});

check("blank turns are dropped, and nothing but blanks is empty", () => {
  assert.equal(prepareCompanionTranscript([{ role: "user", content: "   " }]).reason, "empty");
});

console.log(`\n${passed} checks passed.\n`);
