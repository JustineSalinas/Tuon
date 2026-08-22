import { NextResponse } from "next/server";

import {
  adminConfigError,
  adminAuth,
  verifyAppCheck,
  verifyRequest,
} from "@/lib/firebase/admin";
import { emailConfigured, sendEmail } from "@/lib/email/send";
import { verificationEmail } from "@/lib/email/templates";
import {
  RATE_LIMITS,
  checkRateLimit,
  clientIp,
  rateLimitedResponse,
} from "@/lib/rate-limit";
import { log } from "@/lib/observability/log";
import { siteUrl } from "@/lib/site";

/**
 * Sends the address-verification email from a domain we own.
 *
 * Firebase's client-side `sendEmailVerification` posts from
 * `noreply@<project>.firebaseapp.com`, a domain shared with every other
 * Firebase project, and Gmail files it as spam on that reputation alone. Here
 * the Admin SDK only MINTS the link; delivery is ours.
 *
 * Returns 501 EMAIL_NOT_CONFIGURED when no provider is set up, which is a
 * normal state rather than a fault — the client then falls back to Firebase's
 * mailer, so verification keeps working before a domain exists.
 */

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const configError = adminConfigError();
  if (configError) {
    log.error({ scope: "email", event: "verify.not_configured", configError });
    return NextResponse.json(
      { error: "This server is not fully configured yet.", code: "SERVER_NOT_CONFIGURED" },
      { status: 503 },
    );
  }

  if (!(await verifyAppCheck(request))) {
    return NextResponse.json(
      { error: "This request could not be verified. Please reload and try again." },
      { status: 403 },
    );
  }

  const caller = await verifyRequest(request);
  if (!caller) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  // Limited by address, not only by account: resending is the cheapest way to
  // use someone else's inbox as a mailbox bomb, and a new account per attempt
  // would slip a per-uid limit.
  const limit = await checkRateLimit(RATE_LIMITS.sendVerification, clientIp(request));
  if (!limit.allowed) {
    return rateLimitedResponse(limit, "verification emails");
  }

  // Answer before doing any work if there is no provider, so the client can
  // fall back without waiting on a mint it will not use.
  if (!emailConfigured()) {
    return NextResponse.json(
      {
        error: "Email delivery is not configured on this server.",
        code: "EMAIL_NOT_CONFIGURED",
      },
      { status: 501 },
    );
  }

  try {
    const user = await adminAuth().getUser(caller.uid);

    if (!user.email) {
      return NextResponse.json(
        { error: "This account has no email address.", code: "NO_EMAIL" },
        { status: 400 },
      );
    }

    // Already done. Saying so plainly beats sending a link that will fail.
    if (user.emailVerified) {
      return NextResponse.json({ ok: true, alreadyVerified: true });
    }

    // Where they land after verifying. Without it Firebase drops them on its
    // own confirmation page with no way back into the app — but the domain has
    // to be on the Auth authorized-domains allowlist, and when it is not,
    // Firebase refuses to mint the link at all. Losing the return link is a
    // papercut; refusing to send the email is not.
    let link: string;
    try {
      link = await adminAuth().generateEmailVerificationLink(user.email, {
        url: `${siteUrl()}/app`,
        handleCodeInApp: false,
      });
    } catch (error) {
      log.warn({
        scope: "email",
        event: "verify.continue_url_rejected",
        detail: error instanceof Error ? error.message : String(error),
      });
      link = await adminAuth().generateEmailVerificationLink(user.email);
    }

    const result = await sendEmail(
      verificationEmail({
        to: user.email,
        link,
        displayName: user.displayName,
      }),
    );

    if (!result.ok) {
      log.error({
        scope: "email",
        event: "verify.send_failed",
        uid: caller.uid,
        reason: result.reason,
      });
      return NextResponse.json(
        {
          error: "Could not send the email just now. Please try again shortly.",
          code: "SEND_FAILED",
        },
        { status: 502 },
      );
    }

    log.info({ scope: "email", event: "verify.sent", uid: caller.uid });
    return NextResponse.json({ ok: true });
  } catch (error) {
    log.error({
      scope: "email",
      event: "verify.threw",
      uid: caller.uid,
      detail: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json(
      { error: "Could not send the email just now.", code: "SEND_FAILED" },
      { status: 502 },
    );
  }
}
