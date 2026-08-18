"use client";

import Link from "next/link";
import { Sparkles } from "lucide-react";

import { useAuth } from "@/components/providers/auth-provider";
import { formatResetDate, readQuota } from "@/lib/quota";
import { PLANS, UPGRADE_TARGET } from "@/lib/ai/config";
import { Progress } from "@/components/ui/progress";
import { effectiveAccess, readPlanState } from "@/lib/billing/plan-state";
import { cn } from "@/lib/utils";

/**
 * Reads the quota straight off the live profile snapshot, so the count updates
 * the moment a generation lands without any refetch.
 */
export function useQuota() {
  const { profile } = useAuth();
  if (!profile) return null;
  return readQuota(
    // Mirrors the server: an expired plan shows free limits, so the meter
    // never promises an allowance the API will refuse.
    effectiveAccess(readPlanState(profile)).plan,
    profile.aiGenerationsUsedThisPeriod ?? 0,
    profile.generationPeriodStart?.toDate?.() ?? new Date(),
  );
}

export function QuotaIndicator({ className }: { className?: string }) {
  const quota = useQuota();
  if (!quota) return null;

  const percent = (quota.used / quota.limit) * 100;
  const isFree = quota.plan === "free";

  return (
    <div className={cn("rounded-xl border p-3", className)}>
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-sm font-medium">Study sets</span>
        <span
          className={cn(
            "text-sm tabular-nums",
            quota.exhausted
              ? "text-destructive font-medium"
              : quota.runningLow
                ? "text-warning-foreground font-medium"
                : "text-muted-foreground",
          )}
        >
          {quota.used}/{quota.limit}
        </span>
      </div>

      <Progress
        value={percent}
        className={cn(
          "mt-2 h-1.5",
          quota.exhausted && "[&>div]:bg-destructive",
          !quota.exhausted && quota.runningLow && "[&>div]:bg-warning",
        )}
      />

      <p className="text-muted-foreground mt-2 text-xs leading-relaxed">
        {quota.exhausted ? (
          <>Used up. Resets {formatResetDate(quota.resetsAt)}.</>
        ) : (
          <>
            {quota.remaining} left this month · resets{" "}
            {formatResetDate(quota.resetsAt)}
          </>
        )}
      </p>

      {isFree && (quota.exhausted || quota.runningLow) ? (
        <Link
          href="/app/settings"
          className="text-primary mt-2 inline-flex items-center gap-1 text-xs font-medium underline underline-offset-4"
        >
          <Sparkles className="size-3" />
          Get {PLANS[UPGRADE_TARGET].monthlyGenerations} a month for ₱
          {PLANS[UPGRADE_TARGET].phpMonthly}
        </Link>
      ) : null}
    </div>
  );
}
