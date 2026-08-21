import assert from "node:assert/strict";
import {
  reminderIsDue,
  reminderMessage,
} from "file:///c:/Users/ASUS/tuonapp/src/lib/reminders.ts";

let passed = 0;
function check(name, fn) {
  fn();
  passed += 1;
  console.log(`  ok  ${name}`);
}

const at = (h, m = 0) => new Date(2026, 7, 21, h, m, 0);

const base = {
  now: at(19, 30),
  time: "19:00",
  lastShown: null,
  enabled: true,
  dueCount: 12,
};

console.log("\nReminder timing");

check("fires once the chosen time has passed", () => {
  assert.equal(reminderIsDue(base), true);
});

check("stays quiet before the chosen time", () => {
  assert.equal(reminderIsDue({ ...base, now: at(18, 59) }), false);
});

check("fires exactly on the minute", () => {
  assert.equal(reminderIsDue({ ...base, now: at(19, 0) }), true);
});

check("never fires twice in one day", () => {
  assert.equal(reminderIsDue({ ...base, lastShown: "2026-08-21" }), false);
});

check("yesterday's showing does not suppress today", () => {
  assert.equal(reminderIsDue({ ...base, lastShown: "2026-08-20" }), true);
});

check("does not interrupt when nothing is due", () => {
  // Being nagged with no work waiting is how a reminder gets switched off.
  assert.equal(reminderIsDue({ ...base, dueCount: 0 }), false);
});

check("respects the off switch", () => {
  assert.equal(reminderIsDue({ ...base, enabled: false }), false);
});

check("a malformed time never fires rather than firing at midnight", () => {
  assert.equal(reminderIsDue({ ...base, time: "not-a-time" }), false);
});

console.log("\nReminder wording");

check("counts cards, and never mentions streaks or days", () => {
  const one = reminderMessage(1);
  const many = reminderMessage(12);
  assert.equal(one, "1 card is ready for review.");
  assert.equal(many, "12 cards are ready for review.");
  for (const text of [one, many]) {
    assert.ok(!/streak|day|row|don't|lose/i.test(text), `no scolding in: ${text}`);
  }
});

console.log(`\n${passed} checks passed.\n`);
