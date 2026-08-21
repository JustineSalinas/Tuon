import assert from "node:assert/strict";
import {
  DEFAULT_EASE_FACTOR,
  MIN_EASE_FACTOR,
  initialSrsState,
  scheduleNextReview,
  formatInterval,
  previewIntervals,
  clampToExam,
  parseExamDate,
  daysUntil,
} from "../src/lib/srs/sm2.ts";

import {
  currentPeriodStart,
  isPeriodExpired,
  readQuota,
} from "../src/lib/quota.ts";

const NOW = new Date("2026-08-18T04:00:00.000Z"); // noon in Manila
let passed = 0;
function check(name, fn) {
  fn();
  passed += 1;
  console.log(`  ok  ${name}`);
}

console.log("\nSM-2 scheduling");

check("first successful review schedules 1 day out", () => {
  const r = scheduleNextReview(initialSrsState(), "good", NOW);
  assert.equal(r.intervalDays, 1);
  assert.equal(r.repetitions, 1);
  assert.equal(r.easeFactor, 2.5); // q=4 leaves EF unchanged
});

check("second successful review schedules 6 days out", () => {
  const first = scheduleNextReview(initialSrsState(), "good", NOW);
  const second = scheduleNextReview(first, "good", NOW);
  assert.equal(second.intervalDays, 6);
  assert.equal(second.repetitions, 2);
});

check("third review multiplies interval by ease factor", () => {
  let s = initialSrsState();
  s = scheduleNextReview(s, "good", NOW);
  s = scheduleNextReview(s, "good", NOW);
  const third = scheduleNextReview(s, "good", NOW);
  assert.equal(third.intervalDays, Math.round(6 * 2.5)); // 15
  assert.equal(third.repetitions, 3);
});

check("easy raises the ease factor", () => {
  const r = scheduleNextReview(initialSrsState(), "easy", NOW);
  assert.equal(r.easeFactor, 2.6); // 2.5 + 0.1
});

check("hard lowers the ease factor but still counts as a pass", () => {
  const r = scheduleNextReview(initialSrsState(), "hard", NOW);
  assert.equal(r.easeFactor, 2.36); // 2.5 + (0.1 - 2*(0.08 + 2*0.02))
  assert.equal(r.repetitions, 1, "hard must advance the repetition count");
});

check("again resets repetitions and drops ease factor by 0.8", () => {
  let s = initialSrsState();
  s = scheduleNextReview(s, "good", NOW);
  s = scheduleNextReview(s, "good", NOW);
  s = scheduleNextReview(s, "good", NOW); // mature: 15 days
  assert.equal(s.intervalDays, 15);

  const lapsed = scheduleNextReview(s, "again", NOW);
  assert.equal(lapsed.repetitions, 0);
  assert.equal(lapsed.intervalDays, 1);
  assert.equal(lapsed.easeFactor, 1.7); // 2.5 - 0.8
});

check("ease factor never falls below the 1.3 floor", () => {
  let s = initialSrsState();
  for (let i = 0; i < 30; i += 1) s = scheduleNextReview(s, "again", NOW);
  assert.equal(s.easeFactor, MIN_EASE_FACTOR);
  assert.ok(s.easeFactor >= 1.3);
});

check("interval never degenerates to zero", () => {
  let s = { easeFactor: MIN_EASE_FACTOR, intervalDays: 1, repetitions: 5 };
  for (let i = 0; i < 10; i += 1) {
    s = scheduleNextReview(s, "good", NOW);
    assert.ok(s.intervalDays >= 1, `interval was ${s.intervalDays}`);
  }
});

check("nextReviewAt matches the interval", () => {
  const r = scheduleNextReview(initialSrsState(), "good", NOW);
  const days = Math.round((r.nextReviewAt - NOW) / 86_400_000);
  assert.equal(days, r.intervalDays);
});

check("a long streak of Good grows intervals monotonically", () => {
  let s = initialSrsState();
  const seen = [];
  for (let i = 0; i < 8; i += 1) {
    s = scheduleNextReview(s, "good", NOW);
    seen.push(s.intervalDays);
  }
  assert.deepEqual(seen.slice(0, 4), [1, 6, 15, 38]);
  for (let i = 1; i < seen.length; i += 1) {
    assert.ok(seen[i] >= seen[i - 1], "intervals must not shrink on success");
  }
});

check("rating previews describe what happens next, not the stored date", () => {
  // Again and Hard requeue inside the session, so labelling them with the
  // persisted interval told the student "Tomorrow" about a card they were
  // about to see again in a minute — and made all four buttons identical on
  // a brand-new card.
  const preview = previewIntervals(initialSrsState());
  assert.equal(preview.again, "Again this session");
  assert.equal(preview.hard, "Again this session");
  assert.equal(preview.good, "Tomorrow");
  assert.notEqual(preview.again, preview.good, "the buttons must differ");
});

check("formatInterval reads naturally", () => {
  assert.equal(formatInterval(1), "Tomorrow");
  assert.equal(formatInterval(4), "in 4 days");
  assert.equal(formatInterval(14), "in 2 weeks");
  assert.equal(formatInterval(60), "in 2 months");
});

// ---------------------------------------------------------------------------
// Exam-date clamping.
//
// Plain SM-2 has no upper bound on the interval, so a well-known card lands
// past a fixed exam date and is never seen again before it counts. These pin
// down the fix, including the property that actually matters: repeated
// application converges on the date instead of overshooting it.
// ---------------------------------------------------------------------------

check("no exam date leaves the interval untouched", () => {
  assert.equal(clampToExam(180, NOW, null), 180);
  assert.equal(clampToExam(180, NOW, undefined), 180);
});

check("an interval that already fits inside the runway is untouched", () => {
  const exam = new Date("2026-11-16T04:00:00.000Z"); // 90 days out
  assert.equal(clampToExam(30, NOW, exam), 30);
});

check("a card is never scheduled past the exam, however long its interval", () => {
  const exam = new Date("2026-11-16T04:00:00.000Z"); // 90 days out
  for (const interval of [90, 120, 365, 10000]) {
    const clamped = clampToExam(interval, NOW, exam);
    assert.ok(
      clamped >= 1 && clamped < 90,
      `interval ${interval} clamped to ${clamped}, which is not before the exam`,
    );
  }
});

check("repeated clamping converges on the exam instead of overshooting", () => {
  // Walk a card forward the way a reviewee actually would: each review pulls
  // the next one closer, and the gaps must keep shrinking rather than stalling
  // or stepping past the date.
  const exam = new Date("2026-11-16T04:00:00.000Z");
  let cursor = new Date(NOW);
  let interval = 200;
  const gaps = [];
  for (let i = 0; i < 20 && daysUntil(exam, cursor) > 0; i++) {
    const gap = clampToExam(interval, cursor, exam);
    gaps.push(gap);
    cursor = new Date(cursor.getTime() + gap * 24 * 60 * 60 * 1000);
    interval = Math.round(interval * 2.5); // SM-2 keeps growing underneath
  }
  assert.ok(gaps.length >= 4, `expected several reviews, got ${gaps.length}`);
  assert.ok(
    gaps.every((g, i) => i === 0 || g <= gaps[i - 1]),
    `gaps should shrink, got ${gaps.join(", ")}`,
  );
  assert.equal(gaps.at(-1), 1, "final gap should close to a single day");
  assert.ok(cursor <= exam, "the walk must not step past the exam");
});

check("an exam already past stops clamping", () => {
  const exam = new Date("2026-08-01T04:00:00.000Z"); // behind us
  assert.equal(clampToExam(200, NOW, exam), 200);
});

check("the clamp moves the due date but never SM-2's own belief", () => {
  // intervalDays is the memory model and gets persisted. If the clamp wrote
  // into it, every pulled-forward review would shrink the model too, and the
  // card would restart at a beginner interval once the exam was over.
  const state = { easeFactor: 2.5, intervalDays: 100, repetitions: 6 };
  const exam = new Date("2026-09-07T04:00:00.000Z"); // 20 days out
  const next = scheduleNextReview(state, "good", NOW, exam);
  assert.equal(next.intervalDays, 250, "SM-2 interval must be preserved");
  assert.ok(next.dueInDays < 20, "the due date must land before the exam");
  assert.ok(next.dueInDays < next.intervalDays);
});

check("without an exam date dueInDays just equals the interval", () => {
  const state = { easeFactor: 2.5, intervalDays: 100, repetitions: 6 };
  const next = scheduleNextReview(state, "good", NOW);
  assert.equal(next.dueInDays, next.intervalDays);
});

check("a failed card still resets to tomorrow under an exam date", () => {
  const state = { easeFactor: 2.5, intervalDays: 100, repetitions: 6 };
  const exam = new Date("2026-09-07T04:00:00.000Z");
  const next = scheduleNextReview(state, "again", NOW, exam);
  assert.equal(next.intervalDays, 1);
  assert.equal(next.dueInDays, 1);
  assert.equal(next.repetitions, 0);
});

check("the rating buttons show the clamped gap, not the SM-2 interval", () => {
  // Labelling a button "9 months" for a card that returns in 12 days is a lie
  // the student cannot detect.
  const state = { easeFactor: 2.5, intervalDays: 100, repetitions: 6 };
  const exam = new Date("2026-09-07T04:00:00.000Z"); // 20 days out
  const labels = previewIntervals(state, NOW, exam);
  assert.notEqual(labels.good, previewIntervals(state, NOW).good);
  assert.equal(labels.good, formatInterval(12));
});

check("an exam date is read as a local day, not shifted through UTC", () => {
  // new Date("2026-10-05") is UTC midnight, which is 8am in Manila and can
  // move daysUntil by a whole day. Being one day wrong about an exam is the
  // exact failure this feature exists to prevent.
  const parsed = parseExamDate("2026-10-05");
  assert.equal(parsed.getFullYear(), 2026);
  assert.equal(parsed.getMonth(), 9);
  assert.equal(parsed.getDate(), 5);
  assert.equal(parsed.getHours(), 0);
});

check("a malformed or missing exam date parses to null rather than throwing", () => {
  assert.equal(parseExamDate(null), null);
  assert.equal(parseExamDate(undefined), null);
  assert.equal(parseExamDate(""), null);
  assert.equal(parseExamDate("05/10/2026"), null);
  assert.equal(parseExamDate("2026-10"), null);
  // A bad value must disable the clamp, never crash a review.
  assert.equal(clampToExam(200, NOW, parseExamDate("nonsense")), 200);
});


console.log("\nQuota periods (Manila time)");

check("period start is the 1st of the month in Manila", () => {
  const start = currentPeriodStart(new Date("2026-08-18T04:00:00.000Z"));
  // 2026-08-01 00:00 +08:00 == 2026-07-31 16:00 UTC
  assert.equal(start.toISOString(), "2026-07-31T16:00:00.000Z");
});

check("9am Manila on the 1st already counts as the new period", () => {
  // 2026-09-01 09:00 +08:00 == 2026-09-01 01:00 UTC (still Aug 31 in UTC)
  const augustStart = currentPeriodStart(new Date("2026-08-18T04:00:00.000Z"));
  const septMorning = new Date("2026-09-01T01:00:00.000Z");
  assert.ok(
    isPeriodExpired(augustStart, septMorning),
    "August allowance must have rolled over",
  );
});

check("free plan exhausts at the configured cap", () => {
  const start = currentPeriodStart(NOW);
  assert.equal(readQuota("free", 0, start, NOW).remaining, 5);
  assert.equal(readQuota("free", 4, start, NOW).exhausted, false);
  assert.equal(readQuota("free", 5, start, NOW).exhausted, true);
  assert.equal(readQuota("free", 99, start, NOW).remaining, 0);
});

check("a stale period reads as zero used even before any reset write", () => {
  const julyStart = new Date("2026-06-30T16:00:00.000Z");
  const q = readQuota("free", 5, julyStart, NOW);
  assert.equal(q.used, 0);
  assert.equal(q.exhausted, false);
});

// The pricing model deliberately changed: "paid = unlimited" was replaced by
// per-tier caps, because unlimited generation loses money on heavy users.
check("paid tiers have a real cap rather than being unlimited", () => {
  const start = currentPeriodStart(NOW);
  const plus = readQuota("plus", 0, start, NOW);
  assert.ok(plus.limit > readQuota("free", 0, start, NOW).limit);
  assert.equal(readQuota("plus", plus.limit, start, NOW).exhausted, true);

  const pro = readQuota("pro", 0, start, NOW);
  assert.ok(pro.limit > plus.limit);
  assert.equal(readQuota("pro", pro.limit, start, NOW).exhausted, true);
});

console.log(`\n${passed} checks passed.\n`);
