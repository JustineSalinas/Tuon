/**
 * Pure preference logic, deliberately free of React and Firebase imports so it
 * can be unit-tested without booting a Firebase app.
 */

/** Cards a session aims for when the student has not chosen a number. */
export const DEFAULT_DAILY_CARD_GOAL = 20;

/** Bounds on the goal. Below 5 is not a session; above 200 is not a day. */
export const MIN_DAILY_CARD_GOAL = 5;
export const MAX_DAILY_CARD_GOAL = 200;

/**
 * Typing the answer is the default.
 *
 * Recognition flatters you - you see the back, feel the click, and rate
 * yourself Good on a card you could not have produced. Typing is the better
 * default for that reason, and it only ever applies to answers short enough
 * to type. Anyone who dislikes it can turn it off, or skip it per card.
 */
export const DEFAULT_TYPED_RECALL = true;

export function readTypedRecall(value: unknown): boolean {
  return typeof value === "boolean" ? value : DEFAULT_TYPED_RECALL;
}

export function clampGoal(value: unknown): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return DEFAULT_DAILY_CARD_GOAL;
  }
  return Math.min(MAX_DAILY_CARD_GOAL, Math.max(MIN_DAILY_CARD_GOAL, Math.round(value)));
}
