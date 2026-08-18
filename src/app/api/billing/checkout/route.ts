import { NextResponse } from "next/server";

import { adminConfigError, verifyAppCheck, verifyRequest } from "@/lib/firebase/admin";
import { createCheckoutSession, paymongoConfigError } from "@/lib/billing/paymongo";
import type { BillingPeriod } from "@/lib/billing/plan-state";
import { RATE_LIMITS, checkRateLimit, clientIp, rateLimitedResponse } from "@/lib/rate-limit";
import { log } from "@/lib/observability/log";
import type { Plan } from "@/lib/types";

/**
 * Starts a PayMongo checkout.
 *
 * Takes a plan and a period, never an amount — the price comes from the PLANS
 * table on the server. This route grants nothing: paying is confirmed by the
 * webhook, not by the student's browser coming back to a success URL.
 */

export const dynamic = "force-dynamic";

const PAID_PLANS: Plan[] = ["plus", "pro"];

export async function POST(request: Request) {
  const configError = adminConfigError() ?? paymongoConfigError();
  if (configError) {
    log.error({ scope: "billing", event: "checkout.not_configured", configError });
    return NextResponse.json(
      { error: "Payments are not switched on yet.", code: "BILLING_NOT_CONFIGURED" },
      { status: 503 },
    );
  }

  if (!(await verifyAppCheck(request))) {
    return NextResponse.json(
      { error: "This request could not be verified. Please reload and try again." },
      { status: 403 },
    );
  }

  const limit = await checkRateLimit(RATE_LIMITS.checkout, clientIp(request));
  if (!limit.allowed) return rateLimitedResponse(limit, "checkout attempts");

  const caller = await verifyRequest(request);
  if (!caller) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  // Receipts and any billing dispute go to this address, so it has to be one
  // they have proven they control.
  if (!caller.emailVerified) {
    return NextResponse.json(
      {
        error: "Please verify your email address before subscribing.",
        code: "EMAIL_NOT_VERIFIED",
      },
      { status: 403 },
    );
  }

  let plan: Plan | null = null;
  let period: BillingPeriod | null = null;
  try {
    const body = (await request.json()) as { plan?: unknown; period?: unknown };
    if (PAID_PLANS.includes(body.plan as Plan)) plan = body.plan as Plan;
    if (body.period === "monthly" || body.period === "annual") period = body.period;
  } catch {
    // Handled below.
  }

  if (!plan || !period) {
    return NextResponse.json({ error: "Unknown plan." }, { status: 400 });
  }

  const origin = new URL(request.url).origin;

  try {
    const session = await createCheckoutSession({
      plan,
      period,
      userId: caller.uid,
      email: caller.email,
      // The success page says "we're confirming your payment" rather than
      // "you're upgraded" — only the webhook can say the latter honestly.
      successUrl: `${origin}/app/settings?checkout=success`,
      cancelUrl: `${origin}/app/settings?checkout=cancelled`,
    });

    log.info({
      scope: "billing",
      event: "checkout.created",
      uid: caller.uid,
      plan,
      period,
      sessionId: session.id,
    });

    return NextResponse.json({ url: session.url });
  } catch (error) {
    log.error({ scope: "billing", event: "checkout.failed", uid: caller.uid, plan }, error);
    return NextResponse.json(
      { error: "Could not start checkout. Please try again." },
      { status: 502 },
    );
  }
}
