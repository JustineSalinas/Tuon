/**
 * Readiness projection.
 *
 * This is the number the dashboard leads with, so it has to be defensible. The
 * risk is not that it crashes — it is that it quietly says "on track" about a
 * student who is not, which nobody would notice until the exam.
 */
import assert from "node:assert/strict";

import {
  buildReadiness,
  projectLog,
  resolveHorizon,
  DEFAULT_HORIZON_DAYS,
} from "../src/lib/stats/readiness.ts";

const NOW = new Date("2026-08-18T04:00:00.000Z"); // noon in Manila
const DAY = 24 * 60 * 60 * 1000;

let passed = 0;
function check(name, fn) {
  fn();
  passed++;
  console.log(`  ok  ${name}`);
}

/** Firestore Timestamps only need toDate() here. */
const ts = (date) => ({ toDate: () => date });

function log({
  set = "s1",
  ease = 2.5,
  interval = 10,
  reps = 3,
  lastReviewed = new Date(NOW.getTime() - 1 * DAY),
  nextReview = new Date(NOW.getTime() + 9 * DAY),
} = {}) {
  return {
    studySetId: set,
    easeFactor: ease,
    intervalDays: interval,
    repetitions: reps,
    lastReviewedAt: ts(lastReviewed),
    nextReviewAt: ts(nextReview),
  };
}

const set = (id, courseTag, flashcardCount) => ({ id, courseTag, flashcardCount });

console.log("\nReadiness projection");

check("a card in healthy rotation is on track", () => {
  const horizon = new Date(NOW.getTime() + 30 * DAY);
  assert.equal(projectLog(log(), horizon, NOW), "onTrack");
});

check("a struggling card is at risk however good its schedule looks", () => {
  // Ease below the at-risk floor means SM-2 itself thinks this card is hard.
  // Calling it ready because the dates line up would be the exact silent
  // failure this projection exists to catch.
  const horizon = new Date(NOW.getTime() + 30 * DAY);
  assert.equal(projectLog(log({ ease: 1.6 }), horizon, NOW), "atRisk");
});

check("a card last seen longer ago than its interval is at risk", () => {
  // Next review falls past the horizon, so nothing more happens before the
  // day — readiness then depends purely on whether it still holds.
  const horizon = new Date(NOW.getTime() + 5 * DAY);
  const stale = log({
    interval: 3,
    lastReviewed: new Date(NOW.getTime() - 20 * DAY),
    nextReview: new Date(NOW.getTime() + 400 * DAY),
  });
  assert.equal(projectLog(stale, horizon, NOW), "atRisk");
});

check("a long-interval card seen recently still holds through the horizon", () => {
  const horizon = new Date(NOW.getTime() + 5 * DAY);
  const solid = log({
    interval: 200,
    lastReviewed: new Date(NOW.getTime() - 2 * DAY),
    nextReview: new Date(NOW.getTime() + 198 * DAY),
  });
  assert.equal(projectLog(solid, horizon, NOW), "onTrack");
});

check("projection terminates on a card whose schedule barely moves", () => {
  // A pathological card with a tiny interval over a ten-year horizon must not
  // spin forever; the walk is capped.
  const horizon = new Date(NOW.getTime() + 3650 * DAY);
  const started = Date.now();
  projectLog(log({ interval: 1, reps: 0 }), horizon, NOW);
  assert.ok(Date.now() - started < 1000, "projection should be fast");
});

console.log("\nHorizon");

check("a future exam date becomes the horizon", () => {
  const exam = new Date(NOW.getTime() + 60 * DAY);
  const { horizon, hasExam } = resolveHorizon(exam, NOW);
  assert.equal(hasExam, true);
  assert.equal(horizon.getTime(), exam.getTime());
});

check("no exam date falls back to a rolling window", () => {
  const { horizon, hasExam } = resolveHorizon(null, NOW);
  assert.equal(hasExam, false);
  assert.equal(
    Math.round((horizon.getTime() - NOW.getTime()) / DAY),
    DEFAULT_HORIZON_DAYS,
  );
});

check("an exam date already past falls back rather than reporting doom", () => {
  const { hasExam } = resolveHorizon(new Date(NOW.getTime() - 5 * DAY), NOW);
  assert.equal(hasExam, false);
});

console.log("\nReadiness report");

check("buckets always add up to the total", () => {
  const sets = [set("s1", "FAR", 5)];
  const logs = [log(), log({ ease: 1.5 })];
  const r = buildReadiness(sets, logs, null, NOW);
  assert.equal(r.total, 5);
  assert.equal(r.onTrack + r.atRisk + r.notStarted, r.total);
  assert.equal(r.needsWork, r.atRisk + r.notStarted);
});

check("cards with no review log yet count as not started", () => {
  const r = buildReadiness([set("s1", "FAR", 10)], [log()], null, NOW);
  assert.equal(r.notStarted, 9);
  assert.equal(r.onTrack, 1);
});

check("a set with more logs than its stated card count never goes negative", () => {
  // flashcardCount is denormalised, so it can lag behind reality.
  const logs = [log(), log(), log()];
  const r = buildReadiness([set("s1", "FAR", 1)], logs, null, NOW);
  assert.equal(r.notStarted, 0);
  assert.equal(r.total, 3);
});

check("a log whose study set is gone is ignored rather than counted", () => {
  // Otherwise the totals disagree with everything the student can actually see.
  const r = buildReadiness(
    [set("s1", "FAR", 1)],
    [log(), log({ set: "deleted" })],
    null,
    NOW,
  );
  assert.equal(r.total, 1);
});

check("subjects are sorted weakest first", () => {
  const sets = [
    set("strong", "Strong", 2),
    set("weak", "Weak", 2),
    set("mid", "Middling", 2),
  ];
  const logs = [
    log({ set: "strong" }),
    log({ set: "strong" }),
    log({ set: "weak", ease: 1.5 }),
    log({ set: "weak", ease: 1.5 }),
    log({ set: "mid" }),
    log({ set: "mid", ease: 1.5 }),
  ];
  const r = buildReadiness(sets, logs, null, NOW);
  assert.deepEqual(
    r.bySubject.map((s) => s.subject),
    ["Weak", "Middling", "Strong"],
  );
});

check("subjects tied on share are ordered by size, biggest problem first", () => {
  const sets = [set("small", "Small", 1), set("big", "Big", 5)];
  const logs = [
    log({ set: "small", ease: 1.5 }),
    ...Array.from({ length: 5 }, () => log({ set: "big", ease: 1.5 })),
  ];
  const r = buildReadiness(sets, logs, null, NOW);
  assert.equal(r.bySubject[0].subject, "Big");
});

check("several sets sharing a subject roll up into one row", () => {
  const sets = [set("a", "FAR", 2), set("b", "FAR", 2)];
  const logs = [log({ set: "a" }), log({ set: "b" })];
  const r = buildReadiness(sets, logs, null, NOW);
  assert.equal(r.bySubject.length, 1);
  assert.equal(r.bySubject[0].total, 4);
});

check("untagged sets count in the total but invent no subject row", () => {
  const sets = [set("a", null, 1), set("b", "FAR", 1)];
  const logs = [log({ set: "a" }), log({ set: "b" })];
  const r = buildReadiness(sets, logs, null, NOW);
  assert.equal(r.total, 2);
  assert.deepEqual(
    r.bySubject.map((s) => s.subject),
    ["FAR"],
  );
});

check("an empty library reports a null share rather than a misleading zero", () => {
  const r = buildReadiness([], [], null, NOW);
  assert.equal(r.total, 0);
  assert.equal(r.share, null);
  assert.deepEqual(r.bySubject, []);
});

check("an empty set contributes no subject row", () => {
  const r = buildReadiness([set("a", "FAR", 0)], [], null, NOW);
  assert.deepEqual(r.bySubject, []);
});

check("an exam date shortens the horizon and can change the verdict", () => {
  // The same card judged against a near exam. Nothing about the card changes;
  // only what it is being asked to survive.
  const stale = log({
    interval: 3,
    lastReviewed: new Date(NOW.getTime() - 20 * DAY),
    nextReview: new Date(NOW.getTime() + 400 * DAY),
  });
  const r = buildReadiness(
    [set("s1", "FAR", 1)],
    [stale],
    new Date(NOW.getTime() + 2 * DAY),
    NOW,
  );
  assert.equal(r.hasExam, true);
  assert.equal(r.atRisk, 1);
});

console.log(`\n${passed} checks passed.\n`);
