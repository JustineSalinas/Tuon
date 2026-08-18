import type { SrsRating } from "@/lib/types";

/**
 * SM-2 (SuperMemo 2), Piotr Wozniak's original spaced-repetition algorithm.
 *
 * The algorithm is defined over a 0-5 "quality of recall" score. We expose the
 * four-button interface students actually understand and map onto it:
 *
 *   Again -> 0   failed, reset
 *   Hard  -> 3   recalled, but with serious difficulty (lowest passing grade)
 *   Good  -> 4   recalled after some hesitation
 *   Easy  -> 5   perfect, immediate recall
 *
 * Reference: https://super-memory.com/english/ol/sm2.htm
 */

export const MIN_EASE_FACTOR = 1.3;
export const DEFAULT_EASE_FACTOR = 2.5;

/** Below this, the recall counts as a failure and scheduling resets. */
const PASSING_QUALITY = 3;

const RATING_QUALITY: Record<SrsRating, number> = {
  again: 0,
  hard: 3,
  good: 4,
  easy: 5,
};

export interface SrsState {
  /** SuperMemo "EF" — how quickly intervals grow for this card. */
  easeFactor: number;
  /** Days until the next review. */
  intervalDays: number;
  /** SuperMemo "n" — count of consecutive successful recalls. */
  repetitions: number;
}

export interface SrsSchedule extends SrsState {
  nextReviewAt: Date;
}

export function initialSrsState(): SrsState {
  return {
    easeFactor: DEFAULT_EASE_FACTOR,
    intervalDays: 0,
    repetitions: 0,
  };
}

/**
 * Applies one review to a card's scheduling state.
 *
 * @param state  current scheduling state (use `initialSrsState()` for new cards)
 * @param rating the student's self-assessment
 * @param now    injectable clock, for deterministic tests
 */
export function scheduleNextReview(
  state: SrsState,
  rating: SrsRating,
  now: Date = new Date(),
): SrsSchedule {
  const quality = RATING_QUALITY[rating];
  const passed = quality >= PASSING_QUALITY;

  // --- Ease factor update (applies on both pass and fail) ---
  // EF' = EF + (0.1 - (5-q) * (0.08 + (5-q) * 0.02))
  const q = 5 - quality;
  const nextEaseFactor = Math.max(
    MIN_EASE_FACTOR,
    state.easeFactor + (0.1 - q * (0.08 + q * 0.02)),
  );

  // --- Interval + repetition count ---
  let repetitions: number;
  let intervalDays: number;

  if (!passed) {
    // Failure: the card starts over. Repetition count resets to zero and the
    // card is shown again tomorrow.
    repetitions = 0;
    intervalDays = 1;
  } else {
    repetitions = state.repetitions + 1;
    if (repetitions === 1) {
      intervalDays = 1;
    } else if (repetitions === 2) {
      intervalDays = 6;
    } else {
      intervalDays = Math.round(state.intervalDays * nextEaseFactor);
    }
  }

  // Guard against a degenerate 0-day interval looping a card forever.
  intervalDays = Math.max(1, intervalDays);

  return {
    easeFactor: Number(nextEaseFactor.toFixed(4)),
    intervalDays,
    repetitions,
    nextReviewAt: addDays(now, intervalDays),
  };
}

/**
 * Whether a failed card should be shown again before the session ends.
 *
 * SM-2 alone would push a lapsed card to "tomorrow", but a student who just
 * blanked on a card expects to see it again in the same sitting. The persisted
 * schedule still follows SM-2 exactly — this only governs the in-memory queue.
 */
export function shouldRequeueInSession(rating: SrsRating): boolean {
  return rating === "again" || rating === "hard";
}

export function addDays(date: Date, days: number): Date {
  const result = new Date(date.getTime());
  result.setDate(result.getDate() + days);
  return result;
}

export function isDue(nextReviewAt: Date | null, now: Date = new Date()): boolean {
  if (!nextReviewAt) return true; // never reviewed
  return nextReviewAt.getTime() <= now.getTime();
}

/** "Today", "Tomorrow", "in 4 days", "in 3 weeks", "in 5 months" */
export function formatInterval(days: number): string {
  if (days <= 0) return "Today";
  if (days === 1) return "Tomorrow";
  if (days < 7) return `in ${days} days`;
  if (days < 30) {
    const weeks = Math.round(days / 7);
    return weeks === 1 ? "in 1 week" : `in ${weeks} weeks`;
  }
  if (days < 365) {
    const months = Math.round(days / 30);
    return months === 1 ? "in 1 month" : `in ${months} months`;
  }
  const years = Math.round((days / 365) * 10) / 10;
  return years === 1 ? "in 1 year" : `in ${years} years`;
}

/**
 * Preview of what each button would do, shown under the four rating buttons so
 * the student can see the consequence before committing.
 */
export function previewIntervals(
  state: SrsState,
  now: Date = new Date(),
): Record<SrsRating, string> {
  const ratings: SrsRating[] = ["again", "hard", "good", "easy"];
  return ratings.reduce(
    (acc, rating) => {
      acc[rating] = formatInterval(scheduleNextReview(state, rating, now).intervalDays);
      return acc;
    },
    {} as Record<SrsRating, string>,
  );
}
