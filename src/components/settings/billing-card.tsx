"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { AlertTriangle, Check, Loader2, Sparkles } from "lucide-react";
import { toast } from "sonner";

import { useAuth } from "@/components/providers/auth-provider";
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
            <h2 className="font-medium">{paid ? `Tuón ${plan.name}` : "Free plan"}</h2>
            <p className="text-muted-foreground mt-1 text-sm">
              {plan.monthlyGenerations} AI study sets per month. Notes, PDF
              imports, and flashcards you write yourself are always unlimited.
            </p>
          </div>
          <Badge variant={paid ? "default" : "secondary"}>{plan.name}</Badge>
        </div>

        {access.inGrace ? (
          <div className="border-warning/40 bg-warning/10 flex gap-3 rounded-xl border p-3.5">
            <AlertTriangle className="text-warning mt-0.5 size-4 shrink-0" />
            <div className="text-sm">
              <p className="font-medium">Your last payment didn&rsquo;t go through.</p>
              <p className="text-muted-foreground mt-1 leading-relaxed">
                You keep everything for{" "}
                {access.graceDaysLeft === 1 ? "one more day" : `${access.graceDaysLeft} more days`}{" "}
                while you sort it out. Nothing is deleted either way — after
                that the account just goes back to free limits.
              </p>
            </div>
          </div>
        ) : null}

        {access.status === "cancelled" && access.expiresAt ? (
          <p className="text-muted-foreground text-sm">
            Cancelled. You keep {plan.name} until{" "}
            {access.expiresAt.toLocaleDateString("en-PH", {
              day: "numeric",
              month: "long",
              year: "numeric",
            })}
            .
          </p>
        ) : access.status === "active" && access.expiresAt ? (
          <p className="text-muted-foreground text-sm">
            Renews{" "}
            {access.expiresAt.toLocaleDateString("en-PH", {
              day: "numeric",
              month: "long",
              year: "numeric",
            })}
            .
          </p>
        ) : null}

        {quota ? (
          <div>
            <div className="flex items-baseline justify-between text-sm">
              <span className="text-muted-foreground">Used this month</span>
              <span className="tabular-nums">
                {quota.used}/{quota.limit}
              </span>
            </div>
            <Progress value={(quota.used / quota.limit) * 100} className="mt-2 h-1.5" />
            <p className="text-muted-foreground mt-2 text-xs">
              One study set is {GENERATION_EXPLAINER}. Resets{" "}
              {formatResetDate(quota.resetsAt)}.
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
            ? "Payments aren't live yet. Hang tight — your free plan keeps working."
            : (body?.error ?? "Could not start checkout."),
        );
      }

      // Leaving the app for the provider's hosted page. The lint rule that
      // flags this is about render purity; a click handler navigating away is
      // exactly what it is for.
      window.location.assign(body.url);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not start checkout.");
      setPending(null);
    }
  }

  const upgrade = PLANS[UPGRADE_TARGET];

  return (
    <div>
      <div className="flex items-center gap-2">
        <Sparkles className="text-primary size-4" />
        <span className="font-medium">Upgrade</span>
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
              {option === "annual" ? "Yearly" : "Monthly"}
            </button>
          ))}
        </div>
      </div>

      {period === "annual" ? (
        <p className="text-muted-foreground mt-2 text-xs">
          Pay for {12 - annualFreeMonths(UPGRADE_TARGET)} months, get 12.
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
                  ₱{price?.toLocaleString("en-PH")}
                  <span className="text-muted-foreground text-xs font-normal">
                    /{period === "annual" ? "yr" : "mo"}
                  </span>
                </span>
              </div>
              <p className="text-muted-foreground mt-1 text-sm">{definition.tagline}</p>
              <ul className="mt-3 space-y-1">
                {definition.features.slice(0, 3).map((feature) => (
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
                Choose {definition.name}
              </Button>
            </div>
          );
        })}
      </div>

      <p className="text-muted-foreground mt-3 text-xs leading-relaxed">
        Pay with GCash, Maya, or a card. You can cancel any time — nothing you
        have written is ever deleted when a plan ends.
      </p>
    </div>
  );
}

/** Feedback after PayMongo redirects back. */
function CheckoutResultBanner() {
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
          <strong>Thanks — we&rsquo;re confirming your payment.</strong> Your plan
          updates here as soon as it clears, usually within a few seconds.
        </p>
      ) : (
        <p className="text-muted-foreground">
          Checkout cancelled. Nothing was charged.
        </p>
      )}
    </div>
  );
}
