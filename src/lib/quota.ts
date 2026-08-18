import { monthlyGenerationLimit, normalisePlan } from "./ai/config";
import type { Plan } from "./types";

/**
 * Monthly AI-generation quota.
 *
 * Periods are calendar months in Manila time (UTC+8), not UTC — a student in
 * Cebu who generates at 9am on the 1st should be in the new month's quota, and
 * UTC boundaries would tell them otherwise for eight hours.
 */

const MANILA_OFFSET_MS = 8 * 60 * 60 * 1000;

/** Instant at which the current Manila calendar month began. */
export function currentPeriodStart(now: Date = new Date()): Date {
  const manila = new Date(now.getTime() + MANILA_OFFSET_MS);
  const monthStartAsUtc = Date.UTC(manila.getUTCFullYear(), manila.getUTCMonth(), 1, 0, 0, 0, 0);
  return new Date(monthStartAsUtc - MANILA_OFFSET_MS);
}

/** True when `periodStart` belongs to an earlier month than `now`. */
export function isPeriodExpired(periodStart: Date, now: Date = new Date()): boolean {
  return periodStart.getTime() < currentPeriodStart(now).getTime();
}

export interface QuotaSnapshot {
  plan: Plan;
  /** Generations included this month. Both plans have a real limit. */
  limit: number;
  used: number;
  remaining: number;
  exhausted: boolean;
  /** When the allowance next resets. */
  resetsAt: Date;
  /** True once the student is close enough to the cap to warn them. */
  runningLow: boolean;
}

/** Warn at 80% of the allowance. */
const LOW_THRESHOLD = 0.8;

export function readQuota(
  rawPlan: Plan,
  usedThisPeriod: number,
  periodStart: Date,
  now: Date = new Date(),
): QuotaSnapshot {
  const plan = normalisePlan(rawPlan);
  // A stale period means the allowance has already rolled over, even if no
  // write has happened yet to reset the stored counter.
  const used = isPeriodExpired(periodStart, now) ? 0 : usedThisPeriod;
  const limit = monthlyGenerationLimit(plan);
  const remaining = Math.max(0, limit - used);

  return {
    plan,
    limit,
    used,
    remaining,
    exhausted: remaining <= 0,
    resetsAt: nextPeriodStart(now),
    runningLow: remaining > 0 && used / limit >= LOW_THRESHOLD,
  };
}

export function nextPeriodStart(now: Date = new Date()): Date {
  const manila = new Date(now.getTime() + MANILA_OFFSET_MS);
  const nextMonthAsUtc = Date.UTC(manila.getUTCFullYear(), manila.getUTCMonth() + 1, 1, 0, 0, 0, 0);
  return new Date(nextMonthAsUtc - MANILA_OFFSET_MS);
}

export function formatResetDate(date: Date): string {
  return new Intl.DateTimeFormat("en-PH", {
    month: "long",
    day: "numeric",
    timeZone: "Asia/Manila",
  }).format(date);
}
