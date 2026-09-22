import "server-only";

import { createHmac, timingSafeEqual } from "node:crypto";

import { PLAN_ORDER, normalisePlan } from "@/lib/ai/config";
import type { BillingPeriod } from "@/lib/billing/plan-state";
import type { Plan } from "@/lib/types";

/**
 * RevenueCat, alongside PayMongo rather than instead of it.
 *
 * PayMongo stays the primary path — GCash and Maya are how students in this
 * market actually pay, and it already has webhook auth, idempotency and the
 * grace-period model this file has to match. RevenueCat's Web Billing runs on
 * Stripe, which is the better fit for cards and for the Filipino diaspora
 * paying from abroad. Two providers granting the same handful of `Plan`
 * values, both only ever through a verified webhook.
 *
 * Product ids follow `<plan>_<period>` — `plus_monthly`, `plus_annual`,
 * `pro_monthly`, `pro_annual` — and have to be created with exactly these
 * identifiers in the RevenueCat dashboard for `planFromProductId` to resolve
 * them. There is no lifetime tier, so a webhook with no `expiration_at_ms`
 * is treated as unusable rather than guessed at.
 */

export function revenueCatConfigError(): string | null {
  if (!process.env.REVENUECAT_WEBHOOK_SECRET) {
    return "REVENUECAT_WEBHOOK_SECRET is not set.";
  }
  if (!process.env.NEXT_PUBLIC_REVENUECAT_PUBLIC_KEY) {
    return "NEXT_PUBLIC_REVENUECAT_PUBLIC_KEY is not set.";
  }
  return null;
}

/** `<plan>_<period>` ↔ `{ plan, period }`, and nothing else parses. */
export function planFromProductId(
  productId: string | undefined | null,
): { plan: Plan; period: BillingPeriod } | null {
  if (!productId) return null;
  const [rawPlan, rawPeriod] = productId.split("_");
  if (rawPeriod !== "monthly" && rawPeriod !== "annual") return null;

  const plan = normalisePlan(rawPlan);
  // normalisePlan falls back to "free" for anything it does not recognise,
  // and free has no product id worth granting.
  if (plan === "free" || !PLAN_ORDER.includes(plan)) return null;

  return { plan, period: rawPeriod };
}

/**
 * Verifies `X-RevenueCat-Webhook-Signature: t=<unix>,v1=<hex>`.
 *
 * The HMAC covers `${timestamp}.${rawBody}` over the raw bytes as received —
 * parsing to JSON first and re-serialising would change them and break the
 * signature on a legitimate request, the same trap the PayMongo handler notes
 * for itself.
 *
 * A five-minute window on the timestamp exists for the same reason PayMongo's
 * does not need one: RevenueCat's header carries its own clock, so a replayed
 * old request is rejected even with a leaked-but-valid signature.
 */
const MAX_SKEW_MS = 5 * 60 * 1000;

export function verifyRevenueCatSignature(
  rawBody: string,
  header: string | null,
): { valid: true } | { valid: false; reason: string } {
  const secret = process.env.REVENUECAT_WEBHOOK_SECRET;
  if (!secret) return { valid: false, reason: "not_configured" };
  if (!header) return { valid: false, reason: "missing_header" };

  const match = /^t=(\d+),v1=([0-9a-f]+)$/.exec(header.trim());
  if (!match) return { valid: false, reason: "malformed_header" };

  const [, timestampStr, signatureHex] = match;
  const timestampMs = Number(timestampStr) * 1000;
  if (!Number.isFinite(timestampMs)) return { valid: false, reason: "bad_timestamp" };
  if (Math.abs(Date.now() - timestampMs) > MAX_SKEW_MS) {
    return { valid: false, reason: "stale" };
  }

  const expected = createHmac("sha256", secret)
    .update(`${timestampStr}.${rawBody}`)
    .digest("hex");

  const a = Buffer.from(expected, "hex");
  const b = Buffer.from(signatureHex, "hex");
  if (a.length !== b.length || !timingSafeEqual(a, b)) {
    return { valid: false, reason: "mismatch" };
  }

  return { valid: true };
}

/** The fields this app reads off a RevenueCat webhook event. */
export interface RevenueCatEvent {
  id: string;
  type: string;
  appUserId: string;
  productId: string | null;
  /** Milliseconds since epoch, or null — a non-renewing product can omit it. */
  expirationAtMs: number | null;
  environment: "SANDBOX" | "PRODUCTION" | string;
}

/** `null` on anything that is not shaped like a RevenueCat webhook body. */
export function parseRevenueCatEvent(rawBody: string): RevenueCatEvent | null {
  let payload: unknown;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return null;
  }
  if (!payload || typeof payload !== "object") return null;

  const event = (payload as { event?: unknown }).event;
  if (!event || typeof event !== "object") return null;
  const e = event as Record<string, unknown>;

  if (typeof e.id !== "string" || typeof e.type !== "string") return null;
  if (typeof e.app_user_id !== "string" || !e.app_user_id) return null;

  return {
    id: e.id,
    type: e.type,
    appUserId: e.app_user_id,
    productId: typeof e.product_id === "string" ? e.product_id : null,
    expirationAtMs:
      typeof e.expiration_at_ms === "number" ? e.expiration_at_ms : null,
    environment: typeof e.environment === "string" ? e.environment : "PRODUCTION",
  };
}
