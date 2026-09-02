"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { AlertTriangle, Check, Loader2, Sparkles } from "lucide-react";
import { toast } from "sonner";

import { useAuth } from "@/components/providers/auth-provider";
import { useI18n } from "@/components/providers/i18n-provider";
import { useQuota } from "@/components/app/quota-indicator";
import {
  GENERATION_EXPLAINER,
  PLANS,
  PLAN_ORDER,
  UPGRADE_TARGET,
  annualFreeMonths,
} from "@/lib/ai/config";
import {
  effectiveAccess,
  readPlanState,
  type BillingPeriod,
} from "@/lib/billing/plan-state";
import { formatResetDate } from "@/lib/quota";
import type { Plan, UserProfile } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

/**
 * Plan, usage, and the upgrade path.
 *
 * Everything shown here is derived from the *effective* access, not the stored
 * plan — so a lapsed subscription shows free limits, and a student in the
 * grace window is told plainly that they are, rather than finding out when a
 * generation is refused.
 */
export function BillingCard({ profile }: { profile: UserProfile }) {
  const { t } = useI18n();
  const quota = useQuota();
  const access = effectiveAccess(readPlanState(profile));
  const plan = PLANS[access.plan];
  const paid = access.plan !== "free";

  return (
    <Card className="mt-8">
      <CardContent className="space-y-4">
        <CheckoutResultBanner />

        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="font-medium">
              {paid ? t.billing.planName(plan.name) : t.billing.freePlan}
            </h2>
            <p className="text-muted-foreground mt-1 text-sm">
              {t.billing.included(plan.monthlyGenerations)}
            </p>
          </div>
          <Badge variant={paid ? "default" : "secondary"}>{plan.name}</Badge>
        </div>

        {access.inGrace ? (
          <div className="border-warning/40 bg-warning/10 flex gap-3 rounded-xl border p-3.5">
            <AlertTriangle className="text-warning mt-0.5 size-4 shrink-0" />
            <div className="text-sm">
              <p className="font-medium">{t.billing.paymentFailed}</p>
              <p className="text-muted-foreground mt-1 leading-relaxed">
                {t.billing.graceBody(
                  access.graceDaysLeft === 1
                    ? t.billing.graceOneDay
                    : t.billing.graceDays(access.graceDaysLeft ?? 0),
                )}
              </p>
            </div>
          </div>
        ) : null}

        {access.status === "cancelled" && access.expiresAt ? (
          <p className="text-muted-foreground text-sm">
            {t.billing.cancelledUntil(
              plan.name,
              access.expiresAt.toLocaleDateString(t.common.dateLocale, {
                day: "numeric",
                month: "long",
                year: "numeric",
              }),
            )}
          </p>
        ) : access.status === "active" && access.expiresAt ? (
          <p className="text-muted-foreground text-sm">
            {t.billing.renews(
              access.expiresAt.toLocaleDateString(t.common.dateLocale, {
                day: "numeric",
                month: "long",
                year: "numeric",
              }),
            )}
          </p>
        ) : null}

        {quota ? (
          <div>
            <div className="flex items-baseline justify-between text-sm">
              <span className="text-muted-foreground">{t.billing.usedThisMonth}</span>
              <span className="tabular-nums">
                {quota.used}/{quota.limit}
              </span>
            </div>
            <Progress value={(quota.used / quota.limit) * 100} className="mt-2 h-1.5" />
            <p className="text-muted-foreground mt-2 text-xs">
              {t.billing.resets(
                GENERATION_EXPLAINER,
                formatResetDate(quota.resetsAt),
              )}
            </p>
          </div>
        ) : null}

        {!paid ? (
          <>
            <Separator />
            <UpgradePicker />
          </>
        ) : null}
      </CardContent>
    </Card>
  );
}

function UpgradePicker() {
  const { authedFetch } = useAuth();
  const { t } = useI18n();
  const [period, setPeriod] = useState<BillingPeriod>("annual");
  const [pending, setPending] = useState<Plan | null>(null);

  async function checkout(plan: Plan) {
    setPending(plan);
    try {
      const response = await authedFetch("/api/billing/checkout", {
        method: "POST",
        body: JSON.stringify({ plan, period }),
      });
      const body = (await response.json().catch(() => null)) as
        | { url?: string; error?: string; code?: string }
        | null;

      if (!response.ok || !body?.url) {
        // Payments not being switched on yet is a configuration state, not a
        // failure the student caused — say which it is.
        throw new Error(
          body?.code === "BILLING_NOT_CONFIGURED"
            ? t.billing.notLive
            : (body?.error ?? t.billing.checkoutFailed),
        );
      }

      // Leaving the app for the provider's hosted page. The lint rule that
      // flags this is about render purity; a click handler navigating away is
      // exactly what it is for.
      window.location.assign(body.url);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : t.billing.checkoutFailed,
      );
      setPending(null);
    }
  }

  const upgrade = PLANS[UPGRADE_TARGET];

  return (
    <div>
      <div className="flex items-center gap-2">
        <Sparkles className="text-primary size-4" />
        <span className="font-medium">{t.billing.upgrade}</span>
        <div className="bg-secondary ml-auto flex rounded-full p-0.5 text-xs">
          {(["monthly", "annual"] as const).map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => setPeriod(option)}
              aria-pressed={period === option}
              className={cn(
                "rounded-full px-3 py-1 transition-colors",
                period === option
                  ? "bg-background shadow-sm"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {option === "annual" ? t.billing.yearly : t.billing.monthly}
            </button>
          ))}
        </div>
      </div>

      {period === "annual" ? (
        <p className="text-muted-foreground mt-2 text-xs">
          {t.billing.annualDeal(12 - annualFreeMonths(UPGRADE_TARGET))}
        </p>
      ) : null}

      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        {PLAN_ORDER.filter((id) => id !== "free").map((id) => {
          const definition = PLANS[id];
          const price =
            period === "annual" ? definition.phpAnnual : definition.phpMonthly;

          return (
            <div
              key={id}
              className={cn(
                "rounded-xl border p-4",
                id === upgrade.id ? "border-primary bg-accent/30" : "border-border",
              )}
            >
              <div className="flex items-baseline justify-between gap-2">
                <span className="font-medium">{definition.name}</span>
                <span className="font-display text-lg font-semibold tabular-nums">
                  ₱{price?.toLocaleString(t.common.dateLocale)}
                  <span className="text-muted-foreground text-xs font-normal">
                    /{period === "annual" ? t.billing.perYear : t.billing.perMonth}
                  </span>
                </span>
              </div>
              <p className="text-muted-foreground mt-1 text-sm">
                {t.plans[id].tagline}
              </p>
              <ul className="mt-3 space-y-1">
                {t.plans[id].features.slice(0, 3).map((feature) => (
                  <li key={feature} className="flex gap-2 text-sm">
                    <Check className="text-primary mt-0.5 size-3.5 shrink-0" />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
              <Button
                className="mt-3 w-full"
                variant={id === upgrade.id ? "default" : "outline"}
                onClick={() => checkout(id)}
                disabled={pending !== null}
              >
                {pending === id ? <Loader2 className="animate-spin" /> : null}
                {t.billing.choose(definition.name)}
              </Button>
            </div>
          );
        })}
      </div>

      <p className="text-muted-foreground mt-3 text-xs leading-relaxed">
        {t.billing.payWith}
      </p>
    </div>
  );
}

/** Feedback after PayMongo redirects back. */
function CheckoutResultBanner() {
  const { t } = useI18n();
  const params = useSearchParams();
  const result = params.get("checkout");
  if (result !== "success" && result !== "cancelled") return null;

  return (
    <div
      className={cn(
        "rounded-xl border p-3.5 text-sm",
        result === "success" ? "border-primary/40 bg-accent/40" : "border-border",
      )}
    >
      {result === "success" ? (
        // Careful wording: the redirect proves nothing. Only the webhook can
        // say the payment cleared, and it may land a second or two later.
        <p>
          <strong>{t.billing.confirmingTitle}</strong> {t.billing.confirmingBody}
        </p>
      ) : (
        <p className="text-muted-foreground">{t.billing.checkoutCancelled}</p>
      )}
    </div>
  );
}
