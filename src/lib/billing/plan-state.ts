import { normalisePlan } from "@/lib/ai/config";
import type { Plan } from "@/lib/types";

/**
 * Subscription lifecycle.
 *
 * The rule that shapes all of this: **never take a student's access away in
 * the middle of exam week because a card declined on a Tuesday.** GCash and
 * Maya balances run out routinely — a failed charge is far more often an empty
 * wallet than an abandoned subscription. So a lapse gives a grace period, and
 * even after that nothing is ever deleted; the account simply falls back to
 * free limits with all its content intact.
 */

export type PlanStatus =
  /** Never paid, or fully lapsed. */
  | "free"
  /** Paid and current. */
  | "active"
  /** Paid, and they have asked it not to renew. Access runs to the end. */
  | "cancelled"
  /** A renewal failed. Full access continues through the grace window. */
  | "past_due";

/** How long full access survives a failed renewal. */
export const GRACE_DAYS = 7;

export type BillingPeriod = "monthly" | "annual";

export interface PlanState {
  plan: Plan;
  status: PlanStatus;
  /** When paid access ends. Null on the free plan. */
  expiresAt: Date | null;
  period: BillingPeriod | null;
}

export interface EffectiveAccess {
  /** The plan whose limits actually apply right now. */
  plan: Plan;
  status: PlanStatus;
  /** True while a paid plan is being honoured past its paid-through date. */
  inGrace: boolean;
  /** Days of grace left, or null when not in grace. */
  graceDaysLeft: number | null;
  expiresAt: Date | null;
}

/**
 * What the student can actually do right now.
 *
 * Deliberately computed rather than stored: a stored "is active" flag goes
 * stale the moment a date passes with no webhook to nudge it, and the failure
 * mode is a paying student silently losing access at midnight.
 */
export function effectiveAccess(state: PlanState, now: Date = new Date()): EffectiveAccess {
  const plan = normalisePlan(state.plan);

  if (plan === "free" || state.status === "free" || !state.expiresAt) {
    return { plan: "free", status: "free", inGrace: false, graceDaysLeft: null, expiresAt: null };
  }

  const expiry = state.expiresAt.getTime();
  const graceEnds = expiry + GRACE_DAYS * 86_400_000;
  const nowMs = now.getTime();

  if (nowMs <= expiry) {
    return {
      plan,
      status: state.status,
      inGrace: false,
      graceDaysLeft: null,
      expiresAt: state.expiresAt,
    };
  }

  // Cancelling is a decision, not a payment problem — it does not earn grace.
  if (state.status !== "cancelled" && nowMs <= graceEnds) {
    return {
      plan,
      status: "past_due",
      inGrace: true,
      graceDaysLeft: Math.ceil((graceEnds - nowMs) / 86_400_000),
      expiresAt: state.expiresAt,
    };
  }

  return {
    plan: "free",
    status: "free",
    inGrace: false,
    graceDaysLeft: null,
    expiresAt: state.expiresAt,
  };
}

/** Reads the lifecycle fields off a profile document, whatever their shape. */
export function readPlanState(profile: {
  plan?: unknown;
  planStatus?: unknown;
  planExpiresAt?: { toDate?: () => Date } | Date | null;
  billingPeriod?: unknown;
}): PlanState {
  const raw = profile.planExpiresAt;
  const expiresAt =
    raw instanceof Date
      ? raw
      : raw && typeof raw.toDate === "function"
        ? raw.toDate()
        : null;

  return {
    plan: normalisePlan(profile.plan),
    status: isPlanStatus(profile.planStatus) ? profile.planStatus : "free",
    expiresAt,
    period:
      profile.billingPeriod === "monthly" || profile.billingPeriod === "annual"
        ? profile.billingPeriod
        : null,
  };
}

function isPlanStatus(value: unknown): value is PlanStatus {
  return (
    value === "free" || value === "active" || value === "cancelled" || value === "past_due"
  );
}

/** When a period bought now runs out. */
export function periodEnd(period: BillingPeriod, from: Date = new Date()): Date {
  const end = new Date(from);
  if (period === "annual") end.setFullYear(end.getFullYear() + 1);
  else end.setMonth(end.getMonth() + 1);
  return end;
}
