/**
 * Per-set mastery.
 *
 * The failure this suite guards against is a confident wrong answer: telling a
 * student they have mastered a set that still hides cards they keep failing.
 * That is worse than showing no number, because they will believe it and stop
 * working on exactly the material that will cost them.
 */
import assert from "node:assert/strict";

import {
  MASTERY_LEVELS,
  buildMastery,
  levelFor,
} from "../src/lib/stats/mastery.ts";
import { AT_RISK_EASE } from "../src/lib/stats/retention.ts";

let passed = 0;
function check(name, fn) {
  fn();
  passed++;
  console.log(`  ok  ${name}`);
}

/** A healthy card at the given interval. */
const card = (intervalDays, easeFactor = 2.5) => ({ intervalDays, easeFactor });
const shakyCard = (intervalDays) => ({ intervalDays, easeFactor: AT_RISK_EASE - 0.1 });
const repeat = (value, times) => Array.from({ length: times }, () => value);

console.log("\nMastery of a set");

check("an empty set has no percentage rather than zero", () => {
  // Zero would read as "you have failed at this", when there is nothing there.
  const report = buildMastery([]);
  assert.equal(report.percent, null);
  assert.equal(report.level, "untouched");
  assert.equal(report.nextStep, null);
});

check("a set nobody has touched is 0% and says so", () => {
  const report = buildMastery([null, null, null]);
  assert.equal(report.percent, 0);
  assert.equal(report.level, "untouched");
  assert.equal(report.untouched, 3);
});

check("a fully mature set is 100%", () => {
  const report = buildMastery(repeat(card(45), 5));
  assert.equal(report.percent, 100);
  assert.equal(report.level, "mastered");
  assert.equal(report.strong, 5);
});

check("progress within the pipeline moves the number", () => {
  // A set halfway through must not read the same as one barely started, or
  // the number tells the student nothing about whether to keep going.
  const early = buildMastery(repeat(card(3), 4));
  const middle = buildMastery(repeat(card(14), 4));
  const late = buildMastery(repeat(card(45), 4));
  assert.ok(early.percent < middle.percent);
  assert.ok(middle.percent < late.percent);
});

console.log("\nWhat the level refuses to claim");

check("a high average does not earn Mastered while a card is shaky", () => {
  // The whole point. Four mature cards and one you keep failing averages high,
  // and that one card is what costs you in the exam.
  const report = buildMastery([...repeat(card(60), 9), shakyCard(60)]);
  assert.ok(report.percent >= 85);
  assert.notEqual(report.level, "mastered");
  assert.equal(report.shaky, 1);
});

check("a high average does not earn Mastered while a card is unreviewed", () => {
  const logs = [...repeat(card(90), 20), null];
  const report = buildMastery(logs);
  assert.notEqual(report.level, "mastered");
  assert.equal(report.untouched, 1);
});

check("Mastered needs everything strong and nothing shaky", () => {
  assert.equal(levelFor(90, 0, 0), "mastered");
  assert.equal(levelFor(90, 1, 0), "confident");
  assert.equal(levelFor(90, 0, 1), "confident");
});

check("the levels are ordered and complete", () => {
  assert.deepEqual(MASTERY_LEVELS, [
    "untouched",
    "learning",
    "familiar",
    "confident",
    "mastered",
  ]);
  // Every percentage maps to a level; none falls through.
  for (let percent = 0; percent <= 100; percent += 1) {
    assert.ok(MASTERY_LEVELS.includes(levelFor(percent, 0, 0)));
  }
});

check("any progress at all leaves the untouched level", () => {
  assert.equal(levelFor(0, 5, 0), "untouched");
  assert.equal(levelFor(1, 5, 0), "learning");
});

console.log("\nShaky cards drag the score down");

check("a shaky card scores below a healthy one at the same interval", () => {
  // Its interval says it is fine; its history says otherwise, and the history
  // is the better guide — the same call projectLog makes on the dashboard.
  const healthy = buildMastery([card(45)]);
  const shaky = buildMastery([shakyCard(45)]);
  assert.ok(shaky.percent < healthy.percent);
});

check("a shaky new card cannot score below zero", () => {
  const report = buildMastery([shakyCard(1)]);
  assert.equal(report.percent, 0);
  assert.ok(report.percent >= 0);
});

check("shaky cards are counted separately from strong ones", () => {
  const report = buildMastery([card(60), shakyCard(60), null]);
  assert.equal(report.shaky, 1);
  assert.equal(report.strong, 1);
  assert.equal(report.untouched, 1);
  assert.equal(report.total, 3);
});

check("a missing ease factor is treated as healthy, not as shaky", () => {
  // Older logs may not carry one. Defaulting to shaky would mark whole sets
  // as failing on nothing but their age.
  const report = buildMastery([{ intervalDays: 45 }]);
  assert.equal(report.shaky, 0);
  assert.equal(report.percent, 100);
});

console.log("\nThe thing worth acting on");

check("shaky cards are named before unreviewed ones", () => {
  // A card you keep failing is already costing review time; one you have never
  // seen has cost nothing yet.
  const report = buildMastery([shakyCard(10), null, null, null]);
  assert.equal(report.nextStep.kind, "shaky");
  assert.equal(report.nextStep.count, 1);
});

check("unreviewed cards are named when nothing is shaky", () => {
  const report = buildMastery([card(30), null, null]);
  assert.equal(report.nextStep.kind, "untouched");
  assert.equal(report.nextStep.count, 2);
});

check("a set with nothing to fix says nothing", () => {
  // An app that always has an instruction is an app nobody finishes.
  assert.equal(buildMastery(repeat(card(60), 3)).nextStep, null);
});

check("the step is a key and a count, never a sentence", () => {
  // The module is pure and cannot know what language the student reads, so
  // the words are the view's job.
  const step = buildMastery([shakyCard(5)]).nextStep;
  assert.equal(typeof step.kind, "string");
  assert.equal(typeof step.count, "number");
});

console.log(`\n${passed} checks passed.\n`);
