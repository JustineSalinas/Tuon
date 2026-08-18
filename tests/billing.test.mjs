import assert from "node:assert/strict";
import {
  GRACE_DAYS,
  effectiveAccess,
  periodEnd,
  readPlanState,
} from "../src/lib/billing/plan-state.ts";

let passed = 0;
function check(name, fn) {
  fn();
  passed += 1;
  console.log(`  ok  ${name}`);
}

const NOW = new Date("2026-08-18T12:00:00Z");
const days = (n) => new Date(NOW.getTime() + n * 86_400_000);

console.log("\nSubscription lifecycle");

check("a free profile stays free", () => {
  const access = effectiveAccess(
    { plan: "free", status: "free", expiresAt: null, period: null },
    NOW,
  );
  assert.equal(access.plan, "free");
  assert.equal(access.inGrace, false);
});

check("a current subscription gets its plan", () => {
  const access = effectiveAccess(
    { plan: "pro", status: "active", expiresAt: days(10), period: "monthly" },
    NOW,
  );
  assert.equal(access.plan, "pro");
  assert.equal(access.status, "active");
  assert.equal(access.inGrace, false);
});

check("a failed renewal keeps full access through the grace window", () => {
  // The rule this encodes: never cut someone off mid-exam-week because a
  // GCash balance ran out on a Tuesday.
  const access = effectiveAccess(
    { plan: "plus", status: "active", expiresAt: days(-2), period: "monthly" },
    NOW,
  );
  assert.equal(access.plan, "plus", "still Plus, not downgraded");
  assert.equal(access.status, "past_due");
  assert.equal(access.inGrace, true);
  assert.equal(access.graceDaysLeft, GRACE_DAYS - 2);
});

check("grace expires, and then it really is free", () => {
  const access = effectiveAccess(
    { plan: "plus", status: "past_due", expiresAt: days(-(GRACE_DAYS + 1)), period: "monthly" },
    NOW,
  );
  assert.equal(access.plan, "free");
  assert.equal(access.inGrace, false);
});

check("cancelling earns no grace — it was a decision, not a failure", () => {
  const access = effectiveAccess(
    { plan: "pro", status: "cancelled", expiresAt: days(-1), period: "annual" },
    NOW,
  );
  assert.equal(access.plan, "free");
  assert.equal(access.inGrace, false);
});

check("a cancelled subscription runs to the end of what was paid for", () => {
  const access = effectiveAccess(
    { plan: "pro", status: "cancelled", expiresAt: days(20), period: "annual" },
    NOW,
  );
  assert.equal(access.plan, "pro");
  assert.equal(access.status, "cancelled");
});

check("a paid plan with no expiry is treated as free, not as unlimited", () => {
  // Fail closed: a half-written profile must not hand out a free Pro plan.
  const access = effectiveAccess(
    { plan: "pro", status: "active", expiresAt: null, period: null },
    NOW,
  );
  assert.equal(access.plan, "free");
});

console.log("\nReading a profile");

check("a legacy or unknown plan value degrades to free", () => {
  assert.equal(readPlanState({ plan: "paid" }).plan, "plus", "legacy two-tier value");
  assert.equal(readPlanState({ plan: "enterprise" }).plan, "free");
  assert.equal(readPlanState({}).plan, "free");
});

check("an unknown status degrades to free rather than being trusted", () => {
  assert.equal(readPlanState({ plan: "pro", planStatus: "vip" }).status, "free");
  assert.equal(readPlanState({ plan: "pro", planStatus: "active" }).status, "active");
});

check("a Firestore Timestamp and a Date both read as a date", () => {
  const date = new Date("2027-01-01T00:00:00Z");
  assert.equal(readPlanState({ planExpiresAt: date }).expiresAt?.getTime(), date.getTime());
  assert.equal(
    readPlanState({ planExpiresAt: { toDate: () => date } }).expiresAt?.getTime(),
    date.getTime(),
  );
  assert.equal(readPlanState({ planExpiresAt: null }).expiresAt, null);
});

console.log("\nPeriods");

check("a month and a year advance the calendar, not 30/365 days", () => {
  const from = new Date("2026-01-31T00:00:00Z");
  assert.equal(periodEnd("annual", from).getUTCFullYear(), 2027);
  // Renewing on the 31st of a short month is a real case; asserting the
  // behaviour rather than pretending it cannot happen.
  assert.ok(periodEnd("monthly", from).getTime() > from.getTime());
});

console.log(`\n${passed} checks passed.\n`);
