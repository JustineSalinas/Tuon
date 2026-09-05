/**
 * When a student is free.
 *
 * This decides what the dashboard tells someone to do with their afternoon,
 * off a timetable they typed in by hand. Getting it wrong is worse than
 * saying nothing: a suggestion to study during a class they are sitting in
 * teaches them the feature does not work, and they never fill the timetable
 * in again.
 */
import assert from "node:assert/strict";

import {
  DAY_END,
  DAY_START,
  freeBlocks,
  minutesForCards,
  nextBusy,
  suggestWindow,
} from "../src/lib/organiser/free-time.ts";

let passed = 0;
function check(name, fn) {
  fn();
  passed++;
  console.log(`  ok  ${name}`);
}

const at = (h, m = 0) => h * 60 + m;
/** A class, the two fields that matter. */
const cls = (fromH, toH) => ({ startMinute: at(fromH), endMinute: at(toH) });

console.log("\nGaps");

check("an empty day is one block", () => {
  const [block] = freeBlocks([]);
  assert.equal(block.startMinute, DAY_START);
  assert.equal(block.endMinute, DAY_END);
  assert.equal(block.minutes, DAY_END - DAY_START);
});

check("classes cut the day into the gaps between them", () => {
  // 8-10 and 13-15 leaves 06-08, 10-13, 15-22.
  const blocks = freeBlocks([cls(8, 10), cls(13, 15)]);
  assert.deepEqual(
    blocks.map((b) => [b.startMinute, b.endMinute]),
    [
      [at(6), at(8)],
      [at(10), at(13)],
      [at(15), at(22)],
    ],
  );
});

check("classes given out of order still cut correctly", () => {
  // The timetable is grouped by weekday, not sorted by time, and a student
  // adds their 8am class after their 1pm one as often as not.
  const blocks = freeBlocks([cls(13, 15), cls(8, 10)]);
  assert.equal(blocks.length, 3);
  assert.equal(blocks[1].startMinute, at(10));
});

check("overlapping classes count once", () => {
  // Two classes 9-11 and 10-12 is one busy run 9-12, not a negative gap.
  const blocks = freeBlocks([cls(9, 11), cls(10, 12)]);
  assert.deepEqual(
    blocks.map((b) => [b.startMinute, b.endMinute]),
    [
      [at(6), at(9)],
      [at(12), at(22)],
    ],
  );
});

check("back-to-back classes leave no block between them", () => {
  const blocks = freeBlocks([cls(9, 10), cls(10, 11)]);
  assert.ok(
    !blocks.some((b) => b.startMinute === at(10) && b.endMinute === at(10)),
    "a zero-minute gap was offered as a study block",
  );
});

check("a gap shorter than the floor is not a block", () => {
  // 10:00-10:15 between two classes is a corridor.
  const blocks = freeBlocks([cls(8, 10), { startMinute: at(10, 15), endMinute: at(12) }]);
  assert.ok(!blocks.some((b) => b.minutes < 20));
});

check("nothing outside the studying window", () => {
  for (const block of freeBlocks([cls(9, 10)])) {
    assert.ok(block.startMinute >= DAY_START, "before 06:00");
    assert.ok(block.endMinute <= DAY_END, "after 22:00");
  }
});

console.log("\nThe day already half gone");

check("blocks that have passed are dropped", () => {
  // At 4pm, this morning is not a suggestion.
  const blocks = freeBlocks([cls(8, 10)], { nowMinute: at(16) });
  assert.equal(blocks.length, 1);
  assert.equal(blocks[0].startMinute, at(16));
});

check("the block in progress is clipped to now", () => {
  const blocks = freeBlocks([cls(8, 10), cls(18, 19)], { nowMinute: at(11) });
  assert.equal(blocks[0].startMinute, at(11), "offered time already spent");
  assert.equal(blocks[0].endMinute, at(18));
});

check("late at night there is nothing left", () => {
  assert.deepEqual(freeBlocks([], { nowMinute: at(23) }), []);
});

check("now during a class does not produce a block inside it", () => {
  const blocks = freeBlocks([cls(9, 12)], { nowMinute: at(10) });
  assert.ok(
    !blocks.some((b) => b.startMinute < at(12)),
    "suggested studying during the class they are sitting in",
  );
});

console.log("\nPicking one");

check("the earliest block that fits wins", () => {
  // 10-13 fits 40 minutes, so the roomier evening is not the answer: a plan
  // you can act on now beats one the evening will eat.
  const window = suggestWindow([cls(8, 10), cls(13, 15)], 40);
  assert.equal(window.startMinute, at(6));
});

check("a block too small is skipped for one that fits", () => {
  const window = suggestWindow(
    [{ startMinute: at(6, 30), endMinute: at(9) }, cls(10, 11)],
    90,
    { nowMinute: at(6, 30) },
  );
  assert.ok(window.minutes >= 90, `got ${window.minutes} minutes`);
});

check("when nothing fits, the roomiest is offered and marked tight", () => {
  // Class solidly 06:00-21:00, so the only gap left is the last hour of the
  // evening, and the review wants two. Saying "21:00, an hour" beats silence.
  const window = suggestWindow([cls(6, 12), cls(12, 18), cls(18, 21)], 120, {
    nowMinute: at(6),
  });
  assert.equal(window.startMinute, at(21));
  assert.equal(window.minutes, 60);
  assert.equal(window.tight, true);
  assert.ok(window.minutes > 0);
});

check("a full day is not tight", () => {
  assert.equal(suggestWindow([], 60).tight, false);
});

check("no room at all returns null rather than a bad suggestion", () => {
  assert.equal(suggestWindow([{ startMinute: DAY_START, endMinute: DAY_END }], 30), null);
});

console.log("\nThe reason, as a key");

check("an empty timetable says so rather than inventing a gap", () => {
  assert.equal(suggestWindow([], 30).reason, "wholeDay");
});

check("before, between and after are told apart", () => {
  assert.equal(suggestWindow([cls(9, 11)], 60, { nowMinute: at(6) }).reason, "beforeFirstClass");
  assert.equal(
    suggestWindow([cls(6, 9), cls(13, 15)], 60, { nowMinute: at(6) }).reason,
    "betweenClasses",
  );
  assert.equal(
    suggestWindow([cls(9, 11)], 60, { nowMinute: at(11) }).reason,
    "afterClasses",
  );
});

console.log("\nHow long a review takes");

check("no cards needs no time", () => {
  assert.equal(minutesForCards(0), 0);
  assert.equal(minutesForCards(-3), 0);
});

check("a handful still gets a floor", () => {
  // One card is not a one-minute appointment.
  assert.equal(minutesForCards(1), 5);
});

check("it rounds up to five, never down", () => {
  // 30 cards at 12s is 6 minutes -> 10. Rounding down would promise a block
  // that cannot hold the work.
  assert.equal(minutesForCards(30), 10);
  assert.ok(minutesForCards(100) >= (100 * 12) / 60);
});

console.log("\nThe next class");

check("the class in progress is the next one", () => {
  // It has not finished, so it is still what is between you and studying.
  const now = at(9, 30);
  assert.equal(nextBusy([cls(9, 11), cls(13, 15)], now).startMinute, at(9));
});

check("finished classes are behind you", () => {
  assert.equal(nextBusy([cls(8, 9), cls(13, 15)], at(10)).startMinute, at(13));
});

check("after the last class there is no next", () => {
  assert.equal(nextBusy([cls(8, 9)], at(10)), null);
});

console.log(`\n${passed} checks passed.\n`);
