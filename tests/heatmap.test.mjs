/**
 * The study heatmap and the streak.
 *
 * Streak arithmetic is where this kind of feature goes wrong, and it goes
 * wrong in a way that is invisible until it happens to a real person: a
 * timezone slip or an off-by-one wipes a fifty-day run and there is no way to
 * give it back. Most of these are about the boundaries — today, yesterday, a
 * month end, a leap day.
 */
import assert from "node:assert/strict";

import {
  LEVEL_MINUTES,
  buildHeatmap,
  buildStreaks,
  daysBetweenKeys,
  formatHours,
  levelFor,
  shiftDays,
} from "../src/lib/stats/heatmap.ts";

let passed = 0;
function check(name, fn) {
  fn();
  passed++;
  console.log(`  ok  ${name}`);
}

const TODAY = "2026-08-30"; // a Sunday
const days = (...pairs) => new Map(pairs);

console.log("\nWalking days");

check("shifting a day crosses a month end", () => {
  assert.equal(shiftDays("2026-08-31", 1), "2026-09-01");
  assert.equal(shiftDays("2026-09-01", -1), "2026-08-31");
});

check("shifting crosses a year end", () => {
  assert.equal(shiftDays("2026-12-31", 1), "2027-01-01");
  assert.equal(shiftDays("2027-01-01", -1), "2026-12-31");
});

check("a leap day is a real day", () => {
  // 2028 is a leap year. Skipping it would break a streak that ran through it.
  assert.equal(shiftDays("2028-02-28", 1), "2028-02-29");
  assert.equal(shiftDays("2028-02-29", 1), "2028-03-01");
});

check("the distance between two days is whole days", () => {
  assert.equal(daysBetweenKeys("2026-08-30", "2026-09-02"), 3);
  assert.equal(daysBetweenKeys("2026-09-02", "2026-08-30"), -3);
  assert.equal(daysBetweenKeys("2026-08-30", "2026-08-30"), 0);
});

console.log("\nShading");

check("no study is level zero", () => {
  assert.equal(levelFor(0), 0);
});

check("a single minute is already visible", () => {
  // Ten minutes on the bus is a day the habit held. Rendering it as blank
  // would tell the student it did not count.
  assert.equal(levelFor(1), 1);
});

check("the levels step up at the stated thresholds", () => {
  assert.equal(levelFor(LEVEL_MINUTES[1] - 1), 1);
  assert.equal(levelFor(LEVEL_MINUTES[1]), 2);
  assert.equal(levelFor(LEVEL_MINUTES[2]), 3);
  assert.equal(levelFor(LEVEL_MINUTES[3]), 4);
  assert.equal(levelFor(600), 4);
});

console.log("\nThe grid");

check("the grid is whole weeks of seven days", () => {
  const map = buildHeatmap(new Map(), TODAY, 26);
  assert.equal(map.weeks.length, 26);
  assert.ok(map.weeks.every((w) => w.length === 7));
});

check("it ends on the week containing today", () => {
  const map = buildHeatmap(new Map(), TODAY, 4);
  const last = map.weeks[map.weeks.length - 1];
  assert.ok(last.some((d) => d.day === TODAY));
});

check("days after today are holes, not failures", () => {
  // 2026-08-30 is a Sunday, so the rest of its week is still to come. Drawing
  // those as empty study days would accuse someone of missing tomorrow.
  const map = buildHeatmap(new Map(), TODAY, 2);
  const last = map.weeks[map.weeks.length - 1];
  assert.equal(last[0].day, TODAY);
  assert.equal(last[0].future, false);
  assert.ok(last.slice(1).every((d) => d.future));
});

check("minutes land on the right day", () => {
  const map = buildHeatmap(days([TODAY, 45], ["2026-08-29", 20]), TODAY, 2);
  const flat = map.weeks.flat();
  assert.equal(flat.find((d) => d.day === TODAY).minutes, 45);
  assert.equal(flat.find((d) => d.day === "2026-08-29").minutes, 20);
  assert.equal(flat.find((d) => d.day === TODAY).level, 3);
});

check("totals cover only days that have happened", () => {
  const map = buildHeatmap(days([TODAY, 45], ["2026-08-29", 20]), TODAY, 4);
  assert.equal(map.totalMinutes, 65);
  assert.equal(map.activeDays, 2);
  assert.equal(map.bestDayMinutes, 45);
});

check("study outside the window is not counted", () => {
  // A two-week grid must not report a year's total underneath it.
  const map = buildHeatmap(days(["2020-01-01", 500], [TODAY, 30]), TODAY, 2);
  assert.equal(map.totalMinutes, 30);
});

check("month labels appear once, in order", () => {
  const map = buildHeatmap(new Map(), TODAY, 26);
  assert.ok(map.months.length >= 5);
  const columns = map.months.map((m) => m.column);
  assert.deepEqual(columns, [...columns].sort((a, b) => a - b));
  assert.equal(new Set(columns).size, columns.length);
});

console.log("\nThe streak");

check("no study at all is no streak", () => {
  const s = buildStreaks(new Map(), TODAY);
  assert.equal(s.current, 0);
  assert.equal(s.longest, 0);
});

check("consecutive days ending today count", () => {
  const s = buildStreaks(
    days([TODAY, 30], ["2026-08-29", 30], ["2026-08-28", 30]),
    TODAY,
  );
  assert.equal(s.current, 3);
});

check("TODAY DOES NOT BREAK A STREAK BEFORE IT IS OVER", () => {
  // The one that matters. Someone opening the app at nine in the morning has
  // not failed anything yet, and showing a zero because the day is young is
  // both wrong and mean.
  const s = buildStreaks(days(["2026-08-29", 30], ["2026-08-28", 30]), TODAY);
  assert.equal(s.current, 2);
});

check("a gap of one day does end the run", () => {
  // Yesterday is forgiven; the day before is not, or the streak means nothing.
  const s = buildStreaks(days(["2026-08-28", 30], ["2026-08-27", 30]), TODAY);
  assert.equal(s.current, 0);
});

check("a zero-minute entry is not a study day", () => {
  // An edited session set to 0 must not hold a streak together.
  const s = buildStreaks(days([TODAY, 30], ["2026-08-29", 0], ["2026-08-28", 30]), TODAY);
  assert.equal(s.current, 1);
});

check("the best run is remembered after it breaks", () => {
  // The point of showing it: a broken run still leaves something standing.
  const s = buildStreaks(
    days(
      ["2026-07-01", 30],
      ["2026-07-02", 30],
      ["2026-07-03", 30],
      ["2026-07-04", 30],
      [TODAY, 30],
    ),
    TODAY,
  );
  assert.equal(s.current, 1);
  assert.equal(s.longest, 4);
});

check("a streak running across a month end is one streak", () => {
  const s = buildStreaks(
    days(["2026-08-30", 30], ["2026-08-31", 30], ["2026-09-01", 30]),
    "2026-09-01",
  );
  assert.equal(s.current, 3);
});

check("the current run counts as the best when it is the best", () => {
  const s = buildStreaks(days([TODAY, 30], ["2026-08-29", 30]), TODAY);
  assert.equal(s.longest, 2);
});

check("a single day is a streak of one", () => {
  assert.deepEqual(buildStreaks(days([TODAY, 5]), TODAY), { current: 1, longest: 1 });
});

check("days are never counted twice", () => {
  const s = buildStreaks(days([TODAY, 30], ["2026-08-29", 30]), TODAY);
  assert.ok(s.current <= 2);
  assert.ok(s.longest <= 2);
});

console.log("\nHours");

check("hours read the way people say them", () => {
  assert.equal(formatHours(0), "0m");
  assert.equal(formatHours(45), "45m");
  assert.equal(formatHours(60), "1h");
  assert.equal(formatHours(205), "3h 25m");
});

console.log(`\n${passed} checks passed.\n`);
