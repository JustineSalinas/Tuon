import assert from "node:assert/strict";
import {
  DEFAULT_EASE_FACTOR,
  MIN_EASE_FACTOR,
  initialSrsState,
  scheduleNextReview,
  formatInterval,
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

check("formatInterval reads naturally", () => {
  assert.equal(formatInterval(1), "Tomorrow");
  assert.equal(formatInterval(4), "in 4 days");
  assert.equal(formatInterval(14), "in 2 weeks");
  assert.equal(formatInterval(60), "in 2 months");
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
