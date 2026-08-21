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
  /**
   * Days from `now` until `nextReviewAt` — the gap the student will ACTUALLY
   * experience.
   *
   * Normally this equals `intervalDays`. It diverges when an exam date pulls
   * the review forward (see `clampToExam`), and the two must not be confused:
   * `intervalDays` is what SM-2 believes about the memory and is what gets
   * persisted, `dueInDays` is what the interface should show. Labelling a
   * button "3 months" for a card that comes back in 54 days is a lie the
   * student cannot detect and would quietly stop trusting.
   */
  dueInDays: number;
}

/**
 * Fraction of the runway to an exam that a pulled-forward review may consume.
 *
 * Below 1 so the card lands with time to spare and can be seen again; the
 * repeated application produces gaps that shrink geometrically as the date
 * approaches (90 days out -> 54 -> 21 -> 9 -> 3 -> 1), which is the behaviour
 * a reviewee wants and roughly what a review centre's schedule looks like.
 */
const EXAM_RUNWAY_FRACTION = 0.6;

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Parses a stored `YYYY-MM-DD` exam date into local midnight on that day.
 *
 * Built from parts rather than `new Date(value)`, which reads a bare date as
 * UTC midnight — 8am in Manila. That is enough to move `daysUntil` by a whole
 * day near the boundary, and being one day wrong about an exam is exactly the
 * failure this feature exists to prevent.
 */
export function parseExamDate(
  value: string | null | undefined,
): Date | null {
  if (!value) return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!m) return null;
  const parsed = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

/** Whole days from `now` until `date`, rounded up. Negative once past. */
export function daysUntil(date: Date, now: Date = new Date()): number {
  return Math.ceil((date.getTime() - now.getTime()) / DAY_MS);
}

/**
 * Pulls an interval back so the card is seen again BEFORE a fixed exam date.
 *
 * Plain SM-2 has no upper bound: `interval x easeFactor` reaches 100+ days
 * after about six good recalls. For a student that is correct — they will meet
 * the material again next semester. For someone sitting the CPALE in 90 days
 * it is a silent failure, and it fails hardest on exactly the cards they were
 * most confident about, because those are the ones with the longest intervals.
 *
 * Returns the unchanged interval when there is no exam, when it has passed, or
 * when the card already fits inside the runway.
 */
export function clampToExam(
  intervalDays: number,
  now: Date,
  examDate: Date | null | undefined,
): number {
  if (!examDate || Number.isNaN(examDate.getTime())) return intervalDays;
  const daysLeft = daysUntil(examDate, now);
  if (daysLeft <= 0) return intervalDays;
  if (intervalDays < daysLeft) return intervalDays;
  return Math.max(1, Math.floor(daysLeft * EXAM_RUNWAY_FRACTION));
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
 * @param state    current scheduling state (use `initialSrsState()` for new cards)
 * @param rating   the student's self-assessment
 * @param now      injectable clock, for deterministic tests
 * @param examDate optional fixed date the material must be ready for. Only
 *                 pulls reviews FORWARD; it never delays one, and it never
 *                 touches the ease factor or repetition count.
 */
export function scheduleNextReview(
  state: SrsState,
  rating: SrsRating,
  now: Date = new Date(),
  examDate?: Date | null,
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

  // The exam clamp deliberately does NOT write back into `intervalDays`.
  // That field is SM-2's belief about the memory and gets persisted; if the
  // clamp overwrote it, every pulled-forward review would also shrink the
  // model, and the card would come back at a beginner interval once the exam
  // was over. Only the due date moves.
  const dueInDays = clampToExam(intervalDays, now, examDate);

  return {
    easeFactor: Number(nextEaseFactor.toFixed(4)),
    intervalDays,
    repetitions,
    dueInDays,
    nextReviewAt: addDays(now, dueInDays),
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
 *
 * This describes what happens NEXT, which for a requeuing rating is not the
 * persisted date. Again and Hard put the card back into the current session
 * (see `shouldRequeueInSession`), so labelling them with the stored interval
 * told the student "Tomorrow" about a card they were about to see in a minute.
 * On a new card that also made all four buttons read identically, which makes
 * the choice look like it does not matter.
 *
 * The stored schedule is untouched — only the label changed.
 */
export function previewIntervals(
  state: SrsState,
  now: Date = new Date(),
  examDate?: Date | null,
): Record<SrsRating, string> {
  const ratings: SrsRating[] = ["again", "hard", "good", "easy"];
  return ratings.reduce(
    (acc, rating) => {
      acc[rating] = shouldRequeueInSession(rating)
        ? "Again this session"
        : formatInterval(scheduleNextReview(state, rating, now, examDate).dueInDays);
      return acc;
    },
    {} as Record<SrsRating, string>,
  );
}
