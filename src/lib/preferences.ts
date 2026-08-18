/**
 * Pure preference logic, deliberately free of React and Firebase imports so it
 * can be unit-tested without booting a Firebase app.
 */

/** Cards a session aims for when the student has not chosen a number. */
export const DEFAULT_DAILY_CARD_GOAL = 20;

/** Bounds on the goal. Below 5 is not a session; above 200 is not a day. */
export const MIN_DAILY_CARD_GOAL = 5;
export const MAX_DAILY_CARD_GOAL = 200;

export function clampGoal(value: unknown): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return DEFAULT_DAILY_CARD_GOAL;
  }
  return Math.min(MAX_DAILY_CARD_GOAL, Math.max(MIN_DAILY_CARD_GOAL, Math.round(value)));
}
