import { NextResponse } from "next/server";
import { FieldValue, Timestamp } from "firebase-admin/firestore";

import { adminConfigError, adminDb } from "@/lib/firebase/admin";
import {
  paymongoConfigError,
  parseWebhookEvent,
  verifyWebhookSignature,
} from "@/lib/billing/paymongo";
import { periodEnd, type BillingPeriod } from "@/lib/billing/plan-state";
import { normalisePlan } from "@/lib/ai/config";
import { log } from "@/lib/observability/log";
import type { Plan } from "@/lib/types";

/**
 * The only thing in this codebase allowed to say someone paid.
 *
 * Three properties make that safe, and all three are load-bearing:
 *
 *  1. **Signature.** Without it this URL is an open door — anyone who found it
 *     could POST themselves a Pro plan.
 *  2. **Idempotency.** Providers retry, and a retry must not extend a
 *     subscription twice. Event ids are claimed with `create()`, which fails
 *     if the id is already there, so the dedupe is a database guarantee rather
 *     than a read-then-write race.
 *  3. **Admin SDK only.** `plan` is not client-writable in firestore.rules,
 *     which is the property this whole design leans on.
 */

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const configError = adminConfigError() ?? paymongoConfigError();
  if (configError) {
    log.error({ scope: "billing", event: "webhook.not_configured", configError });
    return NextResponse.json({ error: "Not configured." }, { status: 503 });
  }

  // Must be the raw text. Parsing and re-serialising changes bytes and breaks
  // the signature on legitimate requests.
  const rawBody = await request.text();

  const signature = verifyWebhookSignature(
    rawBody,
    request.headers.get("paymongo-signature"),
  );
  if (!signature.valid) {
    log.warn({ scope: "billing", event: "webhook.rejected", reason: signature.reason });
    return NextResponse.json({ error: "Invalid signature." }, { status: 401 });
  }

  const event = parseWebhookEvent(rawBody);
  if (!event) {
    return NextResponse.json({ error: "Malformed event." }, { status: 400 });
  }

  const db = adminDb();

  // Claim the event id. `create` throws ALREADY_EXISTS on a duplicate, so a
  // retry lands here and stops, without a read-then-write window.
  try {
    await db.collection("billingEvents").doc(event.id).create({
      type: event.type,
      receivedAt: FieldValue.serverTimestamp(),
    });
  } catch {
    log.info({ scope: "billing", event: "webhook.duplicate", eventId: event.id });
    // 200, not an error: a duplicate is a success from the provider's side,
    // and a non-2xx would make them retry it again.
    return NextResponse.json({ received: true, duplicate: true });
  }

  try {
    await handle(event.type, event.metadata);
  } catch (error) {
    log.error(
      { scope: "billing", event: "webhook.handler_failed", eventId: event.id, type: event.type },
      error,
    );
    // Release the claim so the provider's retry can actually do the work.
    await db.collection("billingEvents").doc(event.id).delete().catch(() => {});
    return NextResponse.json({ error: "Could not process event." }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}

async function handle(type: string, metadata: Record<string, string> | null) {
  switch (type) {
    case "checkout_session.payment.paid":
    case "payment.paid":
      await grantAccess(metadata);
      return;

    case "payment.failed":
      await markPastDue(metadata);
      return;

    default:
      // Unknown types are acknowledged, not retried. A provider adding an
      // event type must not turn into a retry loop against us.
      log.info({ scope: "billing", event: "webhook.ignored", type });
  }
}

async function grantAccess(metadata: Record<string, string> | null) {
  const target = readTarget(metadata);
  if (!target) {
    log.warn({ scope: "billing", event: "webhook.no_metadata" });
    return;
  }

  const profileRef = adminDb().collection("users").doc(target.userId);

  await adminDb().runTransaction(async (tx) => {
    const snapshot = await tx.get(profileRef);
    if (!snapshot.exists) {
      log.warn({ scope: "billing", event: "webhook.unknown_user", uid: target.userId });
      return;
    }

    // Renewing early should extend, not restart: a student who pays on the
    // 20th for a period ending the 28th keeps those eight days.
    const current = snapshot.get("planExpiresAt") as Timestamp | undefined;
    const from =
      current && current.toDate().getTime() > Date.now() ? current.toDate() : new Date();

    tx.set(
      profileRef,
      {
        plan: target.plan,
        planStatus: "active",
        planExpiresAt: Timestamp.fromDate(periodEnd(target.period, from)),
        billingPeriod: target.period,
        planUpdatedAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true },
    );
  });

  log.info({
    scope: "billing",
    event: "plan.granted",
    uid: target.userId,
    plan: target.plan,
    period: target.period,
  });
}

async function markPastDue(metadata: Record<string, string> | null) {
  const target = readTarget(metadata);
  if (!target) return;

  // Deliberately does NOT downgrade. A declined GCash charge is far more often
  // an empty wallet than an abandoned subscription, and `effectiveAccess`
  // keeps honouring the plan through the grace window from here.
  await adminDb()
    .collection("users")
    .doc(target.userId)
    .set(
      {
        planStatus: "past_due",
        planUpdatedAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true },
    );

  log.warn({ scope: "billing", event: "payment.failed", uid: target.userId });
}

function readTarget(
  metadata: Record<string, string> | null,
): { userId: string; plan: Plan; period: BillingPeriod } | null {
  const userId = metadata?.userId;
  if (!userId || typeof userId !== "string" || userId.includes("/")) return null;

  const plan = normalisePlan(metadata?.plan);
  if (plan === "free") return null;

  const period: BillingPeriod = metadata?.period === "annual" ? "annual" : "monthly";
  return { userId, plan, period };
}
