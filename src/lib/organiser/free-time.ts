/**
 * When a student is actually free today.
 *
 * The timetable used to be inert: it drew the week back at you and warned when
 * two classes overlapped, and nothing else in the product ever read it. That
 * made it a form students had no reason to fill in — they already own their
 * schedule, it is in their phone, and typing it into Tuón bought them nothing.
 *
 * This is what makes it worth the typing. The dashboard can say "8 cards due"
 * all it likes; the question a student is actually holding is *when*, and the
 * answer depends on the one thing only they know — that Tuesday has a two-hour
 * gap and Friday afternoon is empty.
 *
 * Pure: minutes from midnight in, minutes from midnight out, reasons as keys.
 * No dates, no zones, no catalogue. The caller resolves "today" once and the
 * view says the sentence — same contract as `stats/plan.ts`.
 */

/** A class, reduced to the only two fields this cares about. */
export interface Busy {
  startMinute: number;
  endMinute: number;
}

export interface FreeBlock {
  startMinute: number;
  endMinute: number;
  /** Convenience: `endMinute - startMinute`. */
  minutes: number;
}

/**
 * The window a student would plausibly study in.
 *
 * Not midnight to midnight: a gap from 02:00 to 06:00 is technically free and
 * suggesting it would discredit every other suggestion the product makes.
 */
export const DAY_START = 6 * 60;
export const DAY_END = 22 * 60;

/**
 * Below this a gap is a corridor, not a study block.
 *
 * Twenty minutes is roughly the shortest run that fits a handful of cards plus
 * the walk to wherever you are sitting down.
 */
export const MIN_BLOCK_MINUTES = 20;

/**
 * How long one review card takes, in seconds.
 *
 * Deliberately not `SECONDS_PER_ITEM` from test mode, which is 45: that is a
 * multiple-choice question sat under exam conditions. A review is flip, judge,
 * rate — and the estimate wants to be a little generous rather than a little
 * mean, because a student who finishes early is pleased and one who runs out
 * of time stops trusting the number.
 */
export const SECONDS_PER_REVIEW = 12;

/** Minutes a review of `cards` cards should be given, rounded up to 5. */
export function minutesForCards(cards: number): number {
  if (cards <= 0) return 0;
  const raw = (cards * SECONDS_PER_REVIEW) / 60;
  return Math.max(5, Math.ceil(raw / 5) * 5);
}

/** Overlapping or touching busy spans merged into one, in start order. */
function mergeBusy(busy: Busy[]): Busy[] {
  const clean = busy
    .filter(
      (b) =>
        Number.isFinite(b.startMinute) &&
        Number.isFinite(b.endMinute) &&
        b.endMinute > b.startMinute,
    )
    .sort((a, b) => a.startMinute - b.startMinute);

  const merged: Busy[] = [];
  for (const span of clean) {
    const last = merged[merged.length - 1];
    // `>=` rather than `>`: back-to-back classes leave no gap, and a zero
    // minute block between them is not a study opportunity.
    if (last && span.startMinute <= last.endMinute) {
      last.endMinute = Math.max(last.endMinute, span.endMinute);
    } else {
      merged.push({ startMinute: span.startMinute, endMinute: span.endMinute });
    }
  }
  return merged;
}

export interface FreeBlockOptions {
  /**
   * Now, in minutes from midnight. Blocks that have already passed are
   * dropped and the one in progress is clipped — a suggestion to study at
   * nine this morning is worse than no suggestion at all at four in the
   * afternoon.
   */
  nowMinute?: number;
  dayStart?: number;
  dayEnd?: number;
  minBlock?: number;
}

/** The gaps between today's classes, inside the studying window. */
export function freeBlocks(
  busy: Busy[],
  options: FreeBlockOptions = {},
): FreeBlock[] {
  const dayStart = options.dayStart ?? DAY_START;
  const dayEnd = options.dayEnd ?? DAY_END;
  const minBlock = options.minBlock ?? MIN_BLOCK_MINUTES;
  const floor = Math.max(dayStart, options.nowMinute ?? dayStart);

  if (dayEnd <= floor) return [];

  const blocks: FreeBlock[] = [];
  let cursor = floor;

  for (const span of mergeBusy(busy)) {
    if (span.endMinute <= cursor) continue;
    if (span.startMinute > cursor) {
      blocks.push({
        startMinute: cursor,
        endMinute: Math.min(span.startMinute, dayEnd),
      } as FreeBlock);
    }
    cursor = Math.max(cursor, span.endMinute);
    if (cursor >= dayEnd) break;
  }

  if (cursor < dayEnd) {
    blocks.push({ startMinute: cursor, endMinute: dayEnd } as FreeBlock);
  }

  return blocks
    .map((b) => ({ ...b, minutes: b.endMinute - b.startMinute }))
    .filter((b) => b.minutes >= minBlock);
}

/**
 * Why a suggested window is the one being suggested.
 *
 * A key, not a sentence — the view owns the wording, and the same reason has
 * to be sayable in Filipino.
 */
export type WindowReason =
  "beforeFirstClass" | "betweenClasses" | "afterClasses" | "wholeDay";

export interface StudyWindow extends FreeBlock {
  reason: WindowReason;
  /** True when the block is shorter than the review was estimated to need. */
  tight: boolean;
}

/**
 * The block to study in.
 *
 * The earliest one that fits, because a plan you can act on now beats a
 * roomier one after dinner that the evening will eat. If nothing fits, the
 * roomiest remaining block is offered and marked `tight` — "you have 25
 * minutes at 4" is useful even when the review wants 40, and silence is not.
 */
export function suggestWindow(
  busy: Busy[],
  needMinutes: number,
  options: FreeBlockOptions = {},
): StudyWindow | null {
  const blocks = freeBlocks(busy, options);
  if (blocks.length === 0) return null;

  const fitting = blocks.find((b) => b.minutes >= needMinutes);
  const chosen =
    fitting ??
    blocks.reduce((best, b) => (b.minutes > best.minutes ? b : best));

  return {
    ...chosen,
    tight: chosen.minutes < needMinutes,
    reason: describeWindow(chosen, mergeBusy(busy)),
  };
}

function describeWindow(block: FreeBlock, busy: Busy[]): WindowReason {
  if (busy.length === 0) return "wholeDay";
  const first = busy[0];
  const last = busy[busy.length - 1];
  if (block.endMinute <= first.startMinute) return "beforeFirstClass";
  if (block.startMinute >= last.endMinute) return "afterClasses";
  return "betweenClasses";
}

/** The next class that has not finished yet, or null once the day is done. */
export function nextBusy<T extends Busy>(
  busy: T[],
  nowMinute: number,
): T | null {
  return (
    [...busy]
      .filter((b) => b.endMinute > nowMinute)
      .sort((a, b) => a.startMinute - b.startMinute)[0] ?? null
  );
}
