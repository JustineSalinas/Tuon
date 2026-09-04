import { DEFAULT_EASE_FACTOR, MIN_EASE_FACTOR } from "@/lib/srs/sm2";
import type { ReviewCard } from "@/lib/hooks/use-review-cards";

/**
 * Retention analysis derived entirely from the scheduling state already stored
 * on each card. No extra writes, no review-history collection — SM-2's ease
 * factor and interval already encode everything shown here.
 */

/** Ordered stages of one pipeline, so they take an ordinal (one-hue) ramp. */
export const MATURITY_STAGES = ["new", "learning", "young", "mature"] as const;
export type MaturityStage = (typeof MATURITY_STAGES)[number];

// Each stage's name and its one-line claim live in the message catalogue,
// keyed by the stage — this module is pure and has no idea what language the
// student reads.

/**
 * Below this the card has been failed enough times that SM-2 has pulled its
 * ease down hard. Default is 2.5; 2.0 means several lapses.
 */
export const AT_RISK_EASE = 2.0;

export function maturityOf(card: ReviewCard): MaturityStage {
  if (!card.log) return "new";
  const days = card.log.intervalDays ?? 0;
  if (days < 7) return "learning";
  if (days < 30) return "young";
  return "mature";
}

export interface MaturityBreakdown {
  stage: MaturityStage;
  count: number;
  /** 0-1 share of the deck. */
  share: number;
}

export function maturityBreakdown(cards: ReviewCard[]): MaturityBreakdown[] {
  const counts: Record<MaturityStage, number> = {
    new: 0,
    learning: 0,
    young: 0,
    mature: 0,
  };
  for (const card of cards) counts[maturityOf(card)] += 1;

  const total = cards.length || 1;
  return MATURITY_STAGES.map((stage) => ({
    stage,
    count: counts[stage],
    share: counts[stage] / total,
  }));
}

export interface ForecastDay {
  /** YYYY-MM-DD */
  key: string;
  date: Date;
  count: number;
  /** True for the bucket holding everything already past due. */
  isOverdue: boolean;
  isToday: boolean;
}

/**
 * Cards due per day for the next `days` days.
 *
 * Anything already overdue collapses into a single leading bucket rather than
 * being scattered across past dates — the student's question is "how big is my
 * backlog", not "which Tuesday did I miss".
 */
export function buildForecast(
  cards: ReviewCard[],
  now: number,
  days = 14,
): ForecastDay[] {
  const startOfToday = new Date(now);
  startOfToday.setHours(0, 0, 0, 0);

  const buckets: ForecastDay[] = [];
  const index = new Map<string, ForecastDay>();

  for (let i = 0; i < days; i += 1) {
    const date = new Date(startOfToday);
    date.setDate(startOfToday.getDate() + i);
    const key = localKey(date);
    const day: ForecastDay = {
      key,
      date,
      count: 0,
      isOverdue: false,
      isToday: i === 0,
    };
    buckets.push(day);
    index.set(key, day);
  }

  const overdue: ForecastDay = {
    key: "overdue",
    date: startOfToday,
    count: 0,
    isOverdue: true,
    isToday: false,
  };

  for (const card of cards) {
    const next = card.log?.nextReviewAt?.toDate?.();
    if (!next) continue;
    if (next.getTime() < startOfToday.getTime()) {
      overdue.count += 1;
      continue;
    }
    const bucket = index.get(localKey(next));
    if (bucket) bucket.count += 1;
  }

  return overdue.count > 0 ? [overdue, ...buckets] : buckets;
}

function localKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export interface RetentionSummary {
  total: number;
  reviewed: number;
  /** Cards SM-2 has marked as genuinely difficult. */
  atRisk: ReviewCard[];
  /** Past their scheduled date. */
  overdue: number;
  /** Mean ease across reviewed cards; null when nothing has been reviewed. */
  averageEase: number | null;
  /** 0-1 share of reviewed cards that are mature. */
  matureShare: number;
}

export function summarise(cards: ReviewCard[], now: number): RetentionSummary {
  const reviewed = cards.filter((c) => c.log);

  const atRisk = reviewed
    .filter((c) => (c.log?.easeFactor ?? DEFAULT_EASE_FACTOR) < AT_RISK_EASE)
    .sort(
      (a, b) =>
        (a.log?.easeFactor ?? DEFAULT_EASE_FACTOR) -
        (b.log?.easeFactor ?? DEFAULT_EASE_FACTOR),
    );

  const overdue = reviewed.filter(
    (c) => (c.log?.nextReviewAt?.toDate?.().getTime() ?? 0) <= now,
  ).length;

  const averageEase = reviewed.length
    ? reviewed.reduce((sum, c) => sum + (c.log?.easeFactor ?? DEFAULT_EASE_FACTOR), 0) /
      reviewed.length
    : null;

  const mature = reviewed.filter((c) => maturityOf(c) === "mature").length;

  return {
    total: cards.length,
    reviewed: reviewed.length,
    atRisk,
    overdue,
    averageEase,
    matureShare: reviewed.length ? mature / reviewed.length : 0,
  };
}

/** How hard a card is, as a 0-1 scale where 1 is hardest. */
export function difficultyOf(easeFactor: number): number {
  const span = DEFAULT_EASE_FACTOR - MIN_EASE_FACTOR;
  const clamped = Math.min(DEFAULT_EASE_FACTOR, Math.max(MIN_EASE_FACTOR, easeFactor));
  return (DEFAULT_EASE_FACTOR - clamped) / span;
}
