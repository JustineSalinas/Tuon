/**
 * The forgetting curve, as numbers the landing page can draw.
 *
 * Pure and separate from the component for the same reason the schedulers are:
 * this is the one claim on the marketing page that is a factual assertion
 * rather than a description, so it should be readable, testable, and easy to
 * correct if it is ever wrong.
 *
 * HONESTY: these are the classic Ebbinghaus proportions, drawn to show the
 * mechanism — not measurements of Tuón users. The page says so, and it must
 * keep saying so until there is real retention data to replace this with.
 *
 * A power law rather than a single exponential, because that is the shape
 * memory research keeps finding: a steep drop in the first day or two and a
 * long, flat tail. A single exponential has to choose between getting the
 * first day right and getting the first month right, and gets the other
 * visibly wrong.
 */

/** How far the demo runs. */
export const HORIZON_DAYS = 30;

/** When Tuón would bring the card back, over that month. */
export const REVIEW_DAYS = [1, 3, 7, 21] as const;

/**
 * How much longer the memory holds after each review.
 *
 * Index 0 is a card that has only been read once. Every entry after it is the
 * state after the review at the matching position in `REVIEW_DAYS`, and the
 * growth is the point: the fourth review buys forty times the durability of
 * the first reading, which is why four of them cover a month.
 */
const STRENGTH = [1, 5, 12, 30, 80] as const;

/**
 * Chosen so a card read once and never revisited lands at one in ten after a
 * month, which is the figure the page states in words.
 */
const DECAY = 0.67;

function recall(daysSince: number, strength: number): number {
  return Math.pow(1 + Math.max(0, daysSince) / strength, -DECAY);
}

/** A card read once, never seen again. */
export function recallWithoutReview(day: number): number {
  return recall(day, STRENGTH[0]);
}

/** How many of the scheduled reviews have happened by this day. */
export function reviewsDoneBy(day: number): number {
  return REVIEW_DAYS.filter((d) => d <= day).length;
}

/**
 * The same card, met again on schedule.
 *
 * Before the first review the two curves are identical, deliberately: nothing
 * has happened yet, and a demo that separated them on day zero would be
 * claiming something untrue in the one place a reader can check it by eye.
 */
export function recallWithReviews(day: number): number {
  const done = reviewsDoneBy(day);
  const lastReview = done === 0 ? 0 : REVIEW_DAYS[done - 1];
  return recall(day - lastReview, STRENGTH[done]);
}

/** 0–100, for display. */
export function asPercent(value: number): number {
  return Math.round(value * 100);
}
