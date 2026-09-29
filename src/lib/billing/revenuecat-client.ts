"use client";

import type { Purchases } from "@revenuecat/purchases-js";
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
 *
 * Only `import type` at module scope. The real SDK — bundled, its single
 * largest chunk in the whole app at roughly 1MB uncompressed — is loaded
 * with a dynamic `import()` inside `purchases()`, so it downloads only on
 * the click that actually needs it, not on every visit to Settings. Before
 * this it was a static top-level import, which meant the full SDK shipped to
 * every student who opened their plan page even while
 * `NEXT_PUBLIC_REVENUECAT_PUBLIC_KEY` was unset and the button using it
 * could not even render — everyone paid the download for a feature nobody
 * could reach.
 */

/** `null` when the key is not set — the caller decides what "not offered" looks like. */
export function isRevenueCatAvailable(): boolean {
  return Boolean(process.env.NEXT_PUBLIC_REVENUECAT_PUBLIC_KEY);
}

async function purchases(appUserId: string): Promise<Purchases> {
  const apiKey = process.env.NEXT_PUBLIC_REVENUECAT_PUBLIC_KEY;
  if (!apiKey) {
    throw new Error("NEXT_PUBLIC_REVENUECAT_PUBLIC_KEY is not set.");
  }
  const { Purchases: PurchasesClass } =
    await import("@revenuecat/purchases-js");
  if (!PurchasesClass.isConfigured()) {
    return PurchasesClass.configure({ apiKey, appUserId });
  }
  return PurchasesClass.getSharedInstance();
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
    const client = await purchases(appUserId);
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
    // Import again rather than keep a static one for these two: by the time
    // execution reaches a catch here, the module load above already
    // succeeded, so this resolves from the bundler's own module cache with
    // no real second cost — see the module docstring for why nothing here is
    // a static top-level import in the first place.
    const { ErrorCode, PurchasesError } =
      await import("@revenuecat/purchases-js");
    if (
      error instanceof PurchasesError &&
      error.errorCode === ErrorCode.UserCancelledError
    ) {
      return { status: "cancelled" };
    }
    return {
      status: "failed",
      message:
        error instanceof Error
          ? error.message
          : "The purchase could not be started.",
    };
  }
}
