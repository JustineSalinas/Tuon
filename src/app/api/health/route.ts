import { NextResponse } from "next/server";

import { adminConfigError } from "@/lib/firebase/admin";
import { paymongoConfigError } from "@/lib/billing/paymongo";

/**
 * Is this deployment actually configured?
 *
 * Every failure this reports has already happened once on this project: a
 * missing service-account key surfaced as an infinite spinner, and enabling
 * App Check before the client issued tokens would have 403'd every request.
 * Those are minutes of confusion each, and one GET answers them.
 *
 * Reports **presence and shape, never values**. A health endpoint that leaked
 * a key would be a worse problem than the one it solves, so nothing here ever
 * returns a secret — only whether one is set and whether it looks right.
 */

export const dynamic = "force-dynamic";

interface Check {
  name: string;
  ok: boolean;
  /** What to do about it. Empty when the check passes. */
  detail?: string;
}

export async function GET() {
  const checks: Check[] = [];

  const adminError = adminConfigError();
  checks.push({
    name: "firebase-admin",
    ok: adminError === null,
    detail: adminError ?? undefined,
  });

  const anthropicKey = process.env.ANTHROPIC_API_KEY ?? "";
  checks.push({
    name: "anthropic",
    ok: anthropicKey.startsWith("sk-ant-"),
    detail: !anthropicKey
      ? "ANTHROPIC_API_KEY is not set — generation will fail."
      : !anthropicKey.startsWith("sk-ant-")
        ? "ANTHROPIC_API_KEY does not look like an Anthropic key."
        : undefined,
  });

  const publicFirebase = [
    "NEXT_PUBLIC_FIREBASE_API_KEY",
    "NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN",
    "NEXT_PUBLIC_FIREBASE_PROJECT_ID",
    "NEXT_PUBLIC_FIREBASE_APP_ID",
  ].filter((key) => !process.env[key]);
  checks.push({
    name: "firebase-web",
    ok: publicFirebase.length === 0,
    detail: publicFirebase.length ? `Missing: ${publicFirebase.join(", ")}` : undefined,
  });

  // App Check enforcement without a site key locks every real user out, which
  // is the single most damaging misconfiguration available here.
  const enforced = process.env.APP_CHECK_ENFORCED === "true";
  const siteKey = Boolean(process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY);
  checks.push({
    name: "app-check",
    ok: !enforced || siteKey,
    detail: enforced
      ? siteKey
        ? undefined
        : "APP_CHECK_ENFORCED is true but NEXT_PUBLIC_RECAPTCHA_SITE_KEY is missing — every request will be rejected."
      : "Not enforced. Fine before launch; turn it on once the client is issuing tokens.",
  });

  // Billing is optional: the app works without it, students just cannot pay.
  const billingError = paymongoConfigError();
  checks.push({
    name: "billing",
    ok: true,
    detail: billingError
      ? `${billingError} Checkout returns 503 until this is set.`
      : `Configured in ${(process.env.PAYMONGO_SECRET_KEY ?? "").startsWith("sk_live") ? "LIVE" : "test"} mode.`,
  });

  const ready = checks.every((check) => check.ok);

  return NextResponse.json(
    {
      ready,
      // Lets you tell two deployments apart when one of them is misbehaving.
      commit: process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) ?? "local",
      environment: process.env.VERCEL_ENV ?? "development",
      checkedAt: new Date().toISOString(),
      checks,
    },
    {
      // Non-200 when broken, so an uptime monitor notices without parsing.
      status: ready ? 200 : 503,
      headers: { "cache-control": "no-store" },
    },
  );
}
