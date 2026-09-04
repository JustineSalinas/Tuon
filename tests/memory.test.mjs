/**
 * The forgetting curve behind the landing page.
 *
 * This is the only factual claim on the marketing site that is a number rather
 * than a description, so it gets held to the figures the copy states in words.
 * If a test here fails, either the model changed or the page is now lying.
 */
import assert from "node:assert/strict";

import {
  HORIZON_DAYS,
  REVIEW_DAYS,
  asPercent,
  recallWithReviews,
  recallWithoutReview,
  reviewsDoneBy,
} from "../src/lib/marketing/memory.ts";

let passed = 0;
function check(name, fn) {
  fn();
  passed++;
  console.log(`  ok  ${name}`);
}

console.log("\nForgetting, unreviewed");

check("a card just read is fully there", () => {
  assert.equal(asPercent(recallWithoutReview(0)), 100);
});

check("it lands on the one-in-ten the copy claims", () => {
  // The page says "1 card in 10" a month later, in words. If this drifts, the
  // sentence is wrong and has to change with it.
  assert.equal(asPercent(recallWithoutReview(HORIZON_DAYS)), 10);
});

check("most of the loss is in the first few days", () => {
  const dayOne = recallWithoutReview(1);
  const week = recallWithoutReview(7);
  assert.ok(dayOne < 0.7, `day 1 should already be well down, got ${dayOne}`);
  assert.ok(week < 0.3, `a week should be most of the way gone, got ${week}`);
});

check("it only ever falls", () => {
  for (let day = 1; day <= HORIZON_DAYS; day++) {
    assert.ok(
      recallWithoutReview(day) < recallWithoutReview(day - 1),
      `rose between day ${day - 1} and ${day}`,
    );
  }
});

console.log("\nForgetting, reviewed on schedule");

check("nothing is claimed before the first review", () => {
  // The two curves must be identical until something has actually happened.
  for (const day of [0, 0.25, 0.5, 0.99]) {
    assert.equal(recallWithReviews(day), recallWithoutReview(day), `day ${day}`);
  }
});

check("each review lifts the card back up", () => {
  for (const day of REVIEW_DAYS) {
    const before = recallWithReviews(day - 0.01);
    const after = recallWithReviews(day);
    assert.ok(after > before, `review on day ${day} did not recover anything`);
  }
});

check("it holds near the nine-in-ten the copy claims", () => {
  assert.ok(
    asPercent(recallWithReviews(HORIZON_DAYS)) >= 90,
    `ended at ${asPercent(recallWithReviews(HORIZON_DAYS))}`,
  );
});

check("it never dips to where the unreviewed card is", () => {
  // The whole illustration fails if the lines cross anywhere after day one.
  for (let day = 1; day <= HORIZON_DAYS; day++) {
    assert.ok(
      recallWithReviews(day) > recallWithoutReview(day),
      `the reviewed card was not ahead on day ${day}`,
    );
  }
});

check("it stays plausible — never above full, never near empty", () => {
  for (let day = 0; day <= HORIZON_DAYS; day += 0.5) {
    const value = recallWithReviews(day);
    assert.ok(value <= 1, `over 100% on day ${day}`);
    if (day >= 2) assert.ok(value > 0.7, `implausibly low on day ${day}: ${value}`);
  }
});

console.log("\nCounting the reviews");

check("none have happened on day zero", () => {
  assert.equal(reviewsDoneBy(0), 0);
});

check("a review counts on the day it happens", () => {
  assert.equal(reviewsDoneBy(1), 1);
  assert.equal(reviewsDoneBy(0.99), 0);
});

check("all four are done by the end of the month", () => {
  assert.equal(reviewsDoneBy(HORIZON_DAYS), REVIEW_DAYS.length);
  assert.equal(REVIEW_DAYS.length, 4, "the copy says four reviews");
});

console.log(`\n${passed} checks passed.\n`);
