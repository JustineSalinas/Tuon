/**
 * How well one study set is actually known.
 *
 * Deliberately NOT a new counter. Every rival's "mastery" is a separate
 * progress number that drifts away from the scheduler — you can be 90%
 * mastered on a set full of cards the scheduler thinks you are about to
 * forget, because the two were computed from different things. That is worse
 * than having no number, because it is a confident wrong answer.
 *
 * So this reads the same two facts the rest of the app already runs on: the
 * SM-2 interval, which is the scheduler's own estimate of how long a card
 * holds, and the ease factor, which is its record of how much you have
 * struggled. Nothing is stored. If the schedule changes, mastery changes with
 * it, and the two can never disagree.
 *
 * Pure. No React, no Firestore.
 */

import { AT_RISK_EASE } from "@/lib/stats/retention";
import { DEFAULT_EASE_FACTOR } from "@/lib/srs/sm2";

/** The scheduling state of one card, or null when it has never been reviewed. */
export interface MasteryLog {
  intervalDays?: number;
  easeFactor?: number;
  repetitions?: number;
}

export const MASTERY_LEVELS = [
  "untouched",
  "learning",
  "familiar",
  "confident",
  "mastered",
] as const;

export type MasteryLevel = (typeof MASTERY_LEVELS)[number];

export const MASTERY_LABELS: Record<MasteryLevel, string> = {
  untouched: "Not started",
  learning: "Learning",
  familiar: "Familiar",
  confident: "Confident",
  mastered: "Mastered",
};

/**
 * What each level actually claims, in the student's terms.
 *
 * Written as statements about the schedule rather than about the student,
 * because that is all this can honestly know. "Mastered" means the cards are
 * scheduled a month out and none of them are shaky — not that the exam is won.
 */
export const MASTERY_HINTS: Record<MasteryLevel, string> = {
  untouched: "nothing reviewed yet",
  learning: "most cards are still coming back within the week",
  familiar: "the schedule is starting to stretch out",
  confident: "most cards hold for weeks at a time",
  mastered: "everything is weeks out and nothing is shaky",
};

/**
 * Score per card, mirroring the maturity pipeline stage for stage.
 *
 * Weighted rather than counted so a set halfway through is not stuck at the
 * same number as one that has barely started: moving a card from "learning" to
 * "young" is real progress and should show.
 */
const MAX_SCORE = 3;

function scoreCard(log: MasteryLog | null | undefined): number {
  if (!log) return 0;

  const days = log.intervalDays ?? 0;
  const base = days >= 30 ? 3 : days >= 7 ? 2 : days > 0 ? 1 : 0;

  // A card SM-2 has pulled the ease down on has been failed repeatedly. Its
  // interval says it is fine; its history says otherwise, and the history is
  // the better guide — so it scores one stage below what its interval claims.
  // This is the same judgement `projectLog` makes when it calls such a card
  // at risk regardless of the dates.
  const ease = log.easeFactor ?? DEFAULT_EASE_FACTOR;
  return ease < AT_RISK_EASE ? Math.max(0, base - 1) : base;
}

export interface MasteryReport {
  level: MasteryLevel;
  /** 0-100, rounded. Null for an empty set rather than a misleading zero. */
  percent: number | null;
  total: number;
  /** Never reviewed even once. */
  untouched: number;
  /** Reviewed, but ease has been driven down by repeated failures. */
  shaky: number;
  /** Scheduled a month or more out and not shaky. */
  strong: number;
  /**
   * The one sentence worth acting on, or null when there is nothing to do.
   * This is the part a student can use; the percentage is just the headline.
   */
  nextStep: string | null;
}

export function buildMastery(logs: (MasteryLog | null | undefined)[]): MasteryReport {
  const total = logs.length;

  if (total === 0) {
    return {
      level: "untouched",
      percent: null,
      total: 0,
      untouched: 0,
      shaky: 0,
      strong: 0,
      nextStep: null,
    };
  }

  let score = 0;
  let untouched = 0;
  let shaky = 0;
  let strong = 0;

  for (const log of logs) {
    score += scoreCard(log);
    if (!log) {
      untouched += 1;
      continue;
    }
    const ease = log.easeFactor ?? DEFAULT_EASE_FACTOR;
    if (ease < AT_RISK_EASE) shaky += 1;
    else if ((log.intervalDays ?? 0) >= 30) strong += 1;
  }

  const percent = Math.round((score / (total * MAX_SCORE)) * 100);

  return {
    level: levelFor(percent, untouched, shaky),
    percent,
    total,
    untouched,
    shaky,
    strong,
    nextStep: nextStepFor(untouched, shaky),
  };
}

/**
 * The level, which is stricter than the percentage alone.
 *
 * "Mastered" additionally requires that nothing is unreviewed and nothing is
 * shaky. A set can average high while hiding four cards you keep failing, and
 * telling someone they have mastered that set is exactly the lie this module
 * exists to avoid — those four are what will cost them in the exam.
 */
export function levelFor(percent: number, untouched: number, shaky: number): MasteryLevel {
  if (percent <= 0) return "untouched";
  if (percent >= 85 && untouched === 0 && shaky === 0) return "mastered";
  if (percent >= 60) return "confident";
  if (percent >= 30) return "familiar";
  return "learning";
}

/**
 * What to do next, weakest thing first.
 *
 * Shaky cards come before unreviewed ones: a card you keep failing is already
 * costing you review time, while one you have never seen has cost nothing yet.
 */
function nextStepFor(untouched: number, shaky: number): string | null {
  if (shaky > 0) {
    return `${shaky} ${shaky === 1 ? "card keeps" : "cards keep"} tripping you up — those are worth the most right now.`;
  }
  if (untouched > 0) {
    return `${untouched} ${untouched === 1 ? "card has" : "cards have"} never been reviewed.`;
  }
  return null;
}
