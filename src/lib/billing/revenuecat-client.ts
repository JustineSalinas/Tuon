"use client";

import { ErrorCode, Purchases, PurchasesError } from "@revenuecat/purchases-js";
import type { Plan } from "@/lib/types";
import type { BillingPeriod } from "@/lib/billing/plan-state";

/**
 * The card-payment path. GCash and Maya, via PayMongo, stay how most students
 * here actually pay; this is for a Visa/Mastercard and for the diaspora
 * paying from abroad, where RevenueCat's Web Billing — Stripe underneath — is
 * the better fit than a Philippine gateway.
 *
 * `appUserId` is always the Firebase uid, set explicitly at configure time so
 * a signed-in student never gets minted an anonymous RevenueCat id that a
 * webhook would then have nowhere to attach a plan to.
 *
 * Product identifiers in the RevenueCat dashboard have to be exactly
 * `<plan>_<period>` — `plus_monthly`, `plus_annual`, `pro_monthly`,
 * `pro_annual` — inside one offering, because `revenuecat.ts` on the server
 * parses the webhook's `product_id` the same way. Same four `Plan` values as
 * `PLANS` in `lib/ai/config.ts`; nothing here invents a fifth.
 */

/** `null` when the key is not set — the caller decides what "not offered" looks like. */
export function isRevenueCatAvailable(): boolean {
  return Boolean(process.env.NEXT_PUBLIC_REVENUECAT_PUBLIC_KEY);
}

function purchases(appUserId: string): Purchases {
  if (!Purchases.isConfigured()) {
    const apiKey = process.env.NEXT_PUBLIC_REVENUECAT_PUBLIC_KEY;
    if (!apiKey) {
      throw new Error("NEXT_PUBLIC_REVENUECAT_PUBLIC_KEY is not set.");
    }
    return Purchases.configure({ apiKey, appUserId });
  }
  return Purchases.getSharedInstance();
}

export type CardPurchaseOutcome =
  | { status: "purchased" }
  /** The student closed the Stripe sheet — not an error worth a toast. */
  | { status: "cancelled" }
  | { status: "failed"; message: string };

/**
 * Opens the RevenueCat purchase flow for one plan and period.
 *
 * Access itself is granted by the webhook, exactly as with PayMongo — this
 * only starts the flow and reports how it ended. A `"purchased"` result is
 * "the payment went through," not "the plan is live"; the profile listener
 * already used everywhere else in the app picks up the grant once the
 * webhook lands, typically within seconds.
 */
export async function purchaseWithCard(
  plan: Plan,
  period: BillingPeriod,
  appUserId: string,
): Promise<CardPurchaseOutcome> {
  const productId = `${plan}_${period}`;

  try {
    const client = purchases(appUserId);
    const offerings = await client.getOfferings();

    const pkg = offerings.current?.availablePackages.find(
      (candidate) => candidate.webBillingProduct.identifier === productId,
    );

    if (!pkg) {
      return {
        status: "failed",
        message: `No RevenueCat package is configured for ${productId} yet.`,
      };
    }

    await client.purchase({ rcPackage: pkg });
    return { status: "purchased" };
  } catch (error) {
    // A cancelled Stripe sheet surfaces as PurchasesError with
    // ErrorCode.UserCancelledError (numeric 1) — not a failure worth a toast.
    if (error instanceof PurchasesError && error.errorCode === ErrorCode.UserCancelledError) {
      return { status: "cancelled" };
    }
    return {
      status: "failed",
      message: error instanceof Error ? error.message : "The purchase could not be started.",
    };
  }
}
