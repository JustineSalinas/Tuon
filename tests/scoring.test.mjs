/**
 * Group standings.
 *
 * The design question here was not "how do we rank people" but "on what",
 * because the obvious axis — hours — rewards leaving a timer running. These
 * pin down that XP can only come from recall, and that the table never invents
 * a winner between two people who are level.
 */
import assert from "node:assert/strict";

import {
  MASTERED_XP,
  MAX_XP,
  buildScore,
  isWorthPublishing,
  rankMembers,
} from "../src/lib/groups/scoring.ts";

let passed = 0;
function check(name, fn) {
  fn();
  passed++;
  console.log(`  ok  ${name}`);
}

/** A healthy card at the given interval and recall count. */
const card = (repetitions, intervalDays = 1, easeFactor = 2.5) => ({
  repetitions,
  intervalDays,
  easeFactor,
});

console.log("\nWhat earns XP");

check("an untouched account scores nothing", () => {
  const score = buildScore([]);
  assert.equal(score.xp, 0);
  assert.equal(score.recalls, 0);
  assert.equal(score.mastered, 0);
});

check("XP comes from successful recalls", () => {
  const score = buildScore([card(3), card(2)]);
  assert.equal(score.recalls, 5);
  assert.equal(score.xp, 5);
});

check("a mastered card is worth far more than a recall", () => {
  // Seeing a card through until it holds for a month is the behaviour worth
  // rewarding, and a raw review count would punish it.
  const grinder = buildScore([card(10, 2), card(10, 2)]);
  const finisher = buildScore([card(5, 60), card(5, 60)]);
  assert.equal(finisher.mastered, 2);
  assert.ok(finisher.xp > grinder.xp, `${finisher.xp} should beat ${grinder.xp}`);
  assert.equal(MASTERED_XP, 10);
});

check("a shaky card earns no mastery bonus however long its interval", () => {
  // Its interval says it is fine; its ease says it has been failed repeatedly,
  // and the same call is made on the dashboard.
  const score = buildScore([{ repetitions: 4, intervalDays: 90, easeFactor: 1.6 }]);
  assert.equal(score.mastered, 0);
  assert.equal(score.xp, 4);
});

check("a card is not mastered until a month out", () => {
  assert.equal(buildScore([card(1, 29)]).mastered, 0);
  assert.equal(buildScore([card(1, 30)]).mastered, 1);
});

check("time spent earns nothing at all", () => {
  // The whole point. There is no input here that hours could arrive through,
  // so no amount of sitting with the app open moves the number.
  const score = buildScore([card(0, 0)]);
  assert.equal(score.xp, 0);
  assert.equal(score.studied, 1);
});

check("junk in a log cannot produce NaN or negative XP", () => {
  const score = buildScore([
    { repetitions: undefined },
    { repetitions: -5 },
    { repetitions: 2.7, intervalDays: 40 },
  ]);
  assert.ok(Number.isFinite(score.xp));
  assert.ok(score.xp >= 0);
});

check("XP is capped", () => {
  const many = Array.from({ length: 200 }, () => card(999_999, 60));
  assert.equal(buildScore(many).xp, MAX_XP);
});

console.log("\nThe table");

check("the group is ordered by XP, highest first", () => {
  const ranked = rankMembers([
    { id: "a", displayName: "Ana", xp: 40 },
    { id: "b", displayName: "Ben", xp: 120 },
    { id: "c", displayName: "Cy", xp: 80 },
  ]);
  assert.deepEqual(ranked.map((r) => r.id), ["b", "c", "a"]);
  assert.deepEqual(ranked.map((r) => r.rank), [1, 2, 3]);
});

check("people on the same XP share a rank", () => {
  // Inventing a winner between two people who are level is a lie the table
  // would tell every time it rendered.
  const ranked = rankMembers([
    { id: "a", displayName: "Ana", xp: 100 },
    { id: "b", displayName: "Ben", xp: 100 },
    { id: "c", displayName: "Cy", xp: 50 },
  ]);
  assert.deepEqual(ranked.map((r) => r.rank), [1, 1, 3]);
});

check("everyone appears, including a member with nothing yet", () => {
  // Dropping them would make the group look smaller than it is, and the person
  // who has not started is the one most worth still seeing their name.
  const ranked = rankMembers([
    { id: "a", displayName: "Ana", xp: 30 },
    { id: "b", displayName: "New" },
  ]);
  assert.equal(ranked.length, 2);
  assert.equal(ranked[1].xp, 0);
});

check("a forged negative or fractional score is normalised", () => {
  const ranked = rankMembers([{ id: "a", displayName: "Ana", xp: -50 }]);
  assert.equal(ranked[0].xp, 0);
});

check("an empty group produces an empty table", () => {
  assert.deepEqual(rankMembers([]), []);
});

console.log("\nWhen to publish");

check("a first real score is published", () => {
  assert.equal(isWorthPublishing({ xp: 12, mastered: 0, recalls: 12, studied: 4 }, null), true);
});

check("nothing is published for an account with no progress", () => {
  // Otherwise opening the page writes a row of zeroes for everyone who has
  // never studied.
  assert.equal(isWorthPublishing({ xp: 0, mastered: 0, recalls: 0, studied: 0 }, null), false);
});

check("an unchanged score is not written again", () => {
  // Every member's page open would otherwise be a write for a number that has
  // not moved.
  const previous = { id: "a", displayName: "Ana", xp: 40, mastered: 2 };
  assert.equal(
    isWorthPublishing({ xp: 40, mastered: 2, recalls: 20, studied: 9 }, previous),
    false,
  );
});

check("a changed score is written", () => {
  const previous = { id: "a", displayName: "Ana", xp: 40, mastered: 2 };
  assert.equal(
    isWorthPublishing({ xp: 55, mastered: 2, recalls: 35, studied: 9 }, previous),
    true,
  );
});

console.log(`\n${passed} checks passed.\n`);
