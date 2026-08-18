import "server-only";

import { createHmac, timingSafeEqual } from "node:crypto";

import { PLANS } from "@/lib/ai/config";
import type { BillingPeriod } from "@/lib/billing/plan-state";
import type { Plan } from "@/lib/types";

/**
 * PayMongo, not Stripe.
 *
 * Cards are a minority payment method for this market — GCash and Maya are how
 * students actually pay, and PayMongo is the provider that serves both from
 * one checkout.
 *
 * Amounts are always derived from the PLANS table here on the server. A price
 * that arrives from the browser is a price the browser chose.
 */

const API = "https://api.paymongo.com/v1";

export function paymongoConfigError(): string | null {
  if (!process.env.PAYMONGO_SECRET_KEY) return "PAYMONGO_SECRET_KEY is not set.";
  if (!process.env.PAYMONGO_WEBHOOK_SECRET) return "PAYMONGO_WEBHOOK_SECRET is not set.";
  return null;
}

/** Test keys are `sk_test_...`; live keys are `sk_live_...`. */
export function isLiveMode(): boolean {
  return (process.env.PAYMONGO_SECRET_KEY ?? "").startsWith("sk_live");
}

function authHeader(): string {
  // PayMongo uses HTTP Basic with the secret key as the username.
  return `Basic ${Buffer.from(`${process.env.PAYMONGO_SECRET_KEY}:`).toString("base64")}`;
}

/** Peso amount in centavos, which is what the API expects. */
export function amountFor(plan: Plan, period: BillingPeriod): number | null {
  const definition = PLANS[plan];
  if (!definition || definition.phpMonthly === 0) return null;

  const pesos = period === "annual" ? definition.phpAnnual : definition.phpMonthly;
  if (!pesos) return null;
  return pesos * 100;
}

export interface CheckoutSession {
  id: string;
  url: string;
}

export async function createCheckoutSession(args: {
  plan: Plan;
  period: BillingPeriod;
  userId: string;
  email: string | null;
  successUrl: string;
  cancelUrl: string;
}): Promise<CheckoutSession> {
  const amount = amountFor(args.plan, args.period);
  if (amount === null) throw new Error(`No price for plan ${args.plan}/${args.period}`);

  const definition = PLANS[args.plan];
  const label =
    args.period === "annual"
      ? `Tuón ${definition.name} — 1 year`
      : `Tuón ${definition.name} — 1 month`;

  const response = await fetch(`${API}/checkout_sessions`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: authHeader() },
    body: JSON.stringify({
      data: {
        attributes: {
          // Card last so the two wallets students actually use come first.
          payment_method_types: ["gcash", "paymaya", "card"],
          line_items: [
            { name: label, amount, currency: "PHP", quantity: 1 },
          ],
          description: label,
          success_url: args.successUrl,
          cancel_url: args.cancelUrl,
          billing: args.email ? { email: args.email } : undefined,
          send_email_receipt: true,
          // The webhook is the only trustworthy signal that someone paid, and
          // it arrives with no session of its own. This is how it learns whose
          // account to credit — never from the redirect back to us.
          metadata: {
            userId: args.userId,
            plan: args.plan,
            period: args.period,
          },
        },
      },
    }),
  });

  const body = (await response.json()) as {
    data?: { id?: string; attributes?: { checkout_url?: string } };
    errors?: { detail?: string }[];
  };

  if (!response.ok || !body.data?.id || !body.data.attributes?.checkout_url) {
    const detail = body.errors?.[0]?.detail ?? `HTTP ${response.status}`;
    throw new Error(`PayMongo rejected the checkout session: ${detail}`);
  }

  return { id: body.data.id, url: body.data.attributes.checkout_url };
}

/**
 * Verifies the `Paymongo-Signature` header against the raw body.
 *
 * The header looks like `t=<unix>,te=<test sig>,li=<live sig>`; the signed
 * string is `<t>.<raw body>`, HMAC-SHA256 with the webhook secret. It must be
 * the RAW body — re-serialising parsed JSON changes bytes and breaks the
 * signature on perfectly legitimate requests.
 *
 * Without this, the endpoint is an open door: anyone who guesses the URL could
 * POST themselves a paid plan.
 */
export function verifyWebhookSignature(
  rawBody: string,
  header: string | null,
  toleranceSeconds = 300,
): { valid: boolean; reason?: string } {
  if (!header) return { valid: false, reason: "missing signature header" };

  const parts = Object.fromEntries(
    header.split(",").map((piece) => {
      const [key, ...rest] = piece.trim().split("=");
      return [key, rest.join("=")];
    }),
  );

  const timestamp = parts.t;
  const provided = isLiveMode() ? parts.li : parts.te;
  if (!timestamp || !provided) return { valid: false, reason: "malformed signature header" };

  // Replay protection: a captured request must not stay valid forever.
  const age = Math.abs(Date.now() / 1000 - Number(timestamp));
  if (!Number.isFinite(age) || age > toleranceSeconds) {
    return { valid: false, reason: "signature timestamp outside tolerance" };
  }

  const expected = createHmac("sha256", process.env.PAYMONGO_WEBHOOK_SECRET ?? "")
    .update(`${timestamp}.${rawBody}`)
    .digest("hex");

  const a = Buffer.from(expected, "utf8");
  const b = Buffer.from(provided, "utf8");
  // timingSafeEqual throws on a length mismatch, so screen for it first.
  if (a.length !== b.length) return { valid: false, reason: "signature mismatch" };
  if (!timingSafeEqual(a, b)) return { valid: false, reason: "signature mismatch" };

  return { valid: true };
}

export interface WebhookEvent {
  id: string;
  type: string;
  /** Present on payment events; carries the metadata we set at checkout. */
  metadata: Record<string, string> | null;
}

/**
 * Pulls the fields we care about out of an event envelope.
 *
 * Metadata can sit at either level depending on the event: a
 * `checkout_session.payment.paid` carries the session (with our metadata) in
 * `data.attributes.data`, while `payment.paid` carries the payment. Reading
 * both is cheaper than guessing which one a given event will use.
 */
export function parseWebhookEvent(rawBody: string): WebhookEvent | null {
  try {
    const parsed = JSON.parse(rawBody) as {
      data?: {
        id?: string;
        attributes?: {
          type?: string;
          data?: {
            attributes?: {
              metadata?: Record<string, string>;
              payments?: { attributes?: { metadata?: Record<string, string> } }[];
            };
          };
        };
      };
    };

    const id = parsed.data?.id;
    const type = parsed.data?.attributes?.type;
    if (!id || !type) return null;

    const inner = parsed.data?.attributes?.data?.attributes;
    const metadata =
      inner?.metadata ?? inner?.payments?.[0]?.attributes?.metadata ?? null;

    return { id, type, metadata: metadata ?? null };
  } catch {
    return null;
  }
}
