import assert from "node:assert/strict";
import {
  DEFAULT_TIME_ZONE,
  dayKeyIn,
  normaliseTimeZone,
  offsetLabel,
} from "../src/lib/time-zone.ts";
import {
  DEFAULT_DAILY_CARD_GOAL,
  MAX_DAILY_CARD_GOAL,
  MIN_DAILY_CARD_GOAL,
  clampGoal,
  DEFAULT_TYPED_RECALL,
  readTypedRecall,
} from "../src/lib/preferences.ts";

let passed = 0;
function check(name, fn) {
  fn();
  passed += 1;
  console.log(`  ok  ${name}`);
}

console.log("\nTime zone");

check("a corrupt stored zone falls back instead of throwing", () => {
  // The failure this guards: one bad profile field would otherwise throw
  // inside Intl on every render of the calendar.
  assert.equal(normaliseTimeZone("Mars/Olympus_Mons"), DEFAULT_TIME_ZONE);
  assert.equal(normaliseTimeZone(""), DEFAULT_TIME_ZONE);
  assert.equal(normaliseTimeZone(null), DEFAULT_TIME_ZONE);
  assert.equal(normaliseTimeZone(42), DEFAULT_TIME_ZONE);
});

check("a real zone is kept", () => {
  assert.equal(normaliseTimeZone("Europe/London"), "Europe/London");
  assert.equal(normaliseTimeZone("UTC"), "UTC");
});

check("the day boundary follows the zone, not the server", () => {
  // 2026-03-01T17:30Z is already the 2nd in Manila (UTC+8) and still the 1st
  // in London. This is exactly the off-by-one that silently shifts a whole
  // review schedule.
  const instant = new Date("2026-03-01T17:30:00Z");
  assert.equal(dayKeyIn(instant, "Asia/Manila"), "2026-03-02");
  assert.equal(dayKeyIn(instant, "Europe/London"), "2026-03-01");
  assert.equal(dayKeyIn(instant, "UTC"), "2026-03-01");
});

check("a day key is always sortable as a string", () => {
  const earlier = dayKeyIn(new Date("2026-03-09T00:00:00Z"), "UTC");
  const later = dayKeyIn(new Date("2026-03-10T00:00:00Z"), "UTC");
  assert.ok(earlier < later, "zero-padded so lexical order is date order");
});

check("Manila reports UTC+8", () => {
  assert.match(offsetLabel("Asia/Manila"), /\+8/);
});

console.log("\nDaily card goal");

check("a missing or nonsense goal falls back to the default", () => {
  assert.equal(clampGoal(undefined), DEFAULT_DAILY_CARD_GOAL);
  assert.equal(clampGoal(null), DEFAULT_DAILY_CARD_GOAL);
  assert.equal(clampGoal(Number.NaN), DEFAULT_DAILY_CARD_GOAL);
  assert.equal(clampGoal("30"), DEFAULT_DAILY_CARD_GOAL);
});

check("the goal is clamped to a session a person could finish", () => {
  assert.equal(clampGoal(0), MIN_DAILY_CARD_GOAL);
  assert.equal(clampGoal(-10), MIN_DAILY_CARD_GOAL);
  assert.equal(clampGoal(100_000), MAX_DAILY_CARD_GOAL);
});

check("a sensible goal survives, rounded", () => {
  assert.equal(clampGoal(40), 40);
  assert.equal(clampGoal(40.4), 40);
  assert.equal(clampGoal(40.6), 41);
});

check("typing the answer is on unless it was turned off", () => {
  // Absent means on: every account created before the setting existed should
  // get the better default, not the old behaviour frozen in place.
  assert.equal(readTypedRecall(undefined), DEFAULT_TYPED_RECALL);
  assert.equal(readTypedRecall(null), DEFAULT_TYPED_RECALL);
  assert.equal(DEFAULT_TYPED_RECALL, true);
});

check("an explicit false is respected", () => {
  // The one value that must survive a round trip - if `false` fell back to the
  // default, turning it off would silently do nothing.
  assert.equal(readTypedRecall(false), false);
  assert.equal(readTypedRecall(true), true);
});

check("a junk value falls back rather than being truthy", () => {
  assert.equal(readTypedRecall("no"), DEFAULT_TYPED_RECALL);
  assert.equal(readTypedRecall(0), DEFAULT_TYPED_RECALL);
});


console.log(`\n${passed} checks passed.\n`);
