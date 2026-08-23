import { NextResponse } from "next/server";

import { adminConfigError } from "@/lib/firebase/admin";
import { paymongoConfigError } from "@/lib/billing/paymongo";
import { detailAccess } from "@/lib/health-access";

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
 *
 * That is necessary and was not sufficient. The first version answered in full
 * to anyone on the internet, and a security audit pulled this from production
 * with no credentials:
 *
 *   {"name":"app-check","detail":"Not enforced. ..."}
 *
 * No secret leaked, and it still handed an attacker the one fact worth having
 * before deciding whether scripted abuse of the paid endpoint was worth
 * attempting. Posture is reconnaissance even when values are not.
 *
 * So the two audiences are split. An uptime monitor needs `ready` and a status
 * code, and gets exactly that without asking. An operator debugging a bad
 * deploy needs the detail, and presents `x-health-token`. See lib/health-access.
 */

export const dynamic = "force-dynamic";

interface Check {
  name: string;
  ok: boolean;
  /** What to do about it. Empty when the check passes. */
  detail?: string;
}

export async function GET(request: Request) {
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

  const access = detailAccess(
    request.headers.get("x-health-token"),
    process.env.HEALTH_TOKEN,
    process.env.VERCEL_ENV === "production",
  );

  return NextResponse.json(
    {
      ready,
      checkedAt: new Date().toISOString(),
      ...(access.allowed
        ? {
            // Lets you tell two deployments apart when one is misbehaving.
            commit: process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) ?? "local",
            environment: process.env.VERCEL_ENV ?? "development",
            checks,
          }
        : {
            // Say why the detail is missing, so a confused operator is not left
            // guessing whether the endpoint is broken. Naming the header is not
            // a leak: knowing a token is required does not help you guess it.
            detail:
              access.reason === "no_token_configured"
                ? "Set HEALTH_TOKEN and send it as x-health-token to see the checks."
                : "Send a valid x-health-token to see the checks.",
          }),
    },
    {
      // Non-200 when broken, so an uptime monitor notices without parsing.
      status: ready ? 200 : 503,
      headers: { "cache-control": "no-store" },
    },
  );
}
