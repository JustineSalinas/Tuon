"use client";

import { sendEmailVerification, type User } from "firebase/auth";

import { getAppCheckToken } from "@/lib/firebase/client";
import { siteUrl } from "@/lib/site";

/**
 * Asks the server to send the verification email, falling back to Firebase.
 *
 * The fallback is the point. Our own delivery needs a verified sending domain
 * and a provider key, and until both exist the route answers 501
 * EMAIL_NOT_CONFIGURED — at which point signup must keep working rather than
 * leaving people unable to verify. So this tries the good path, and quietly
 * takes the old one when it is not there.
 *
 * Never throws for a delivery problem the user can retry; callers show one
 * message either way.
 */
export type VerificationOutcome =
  /** Sent from our own domain. */
  | "sent"
  /** Sent by Firebase, because no provider is configured here yet. */
  | "sent-fallback"
  /** Nothing to do. */
  | "already-verified"
  | "failed";

export async function requestVerificationEmail(
  user: User,
): Promise<VerificationOutcome> {
  try {
    const [token, appCheckToken] = await Promise.all([
      user.getIdToken(),
      getAppCheckToken(),
    ]);

    const response = await fetch("/api/auth/send-verification", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
        ...(appCheckToken ? { "X-Firebase-AppCheck": appCheckToken } : {}),
      },
    });

    if (response.ok) {
      const body = (await response.json().catch(() => ({}))) as {
        alreadyVerified?: boolean;
      };
      return body.alreadyVerified ? "already-verified" : "sent";
    }

    const body = (await response.json().catch(() => ({}))) as { code?: string };

    // Fall through to Firebase on any delivery problem, not just "no mailer
    // here". The case that forces this: keys set but the sending domain not
    // verified yet. Resend rejects every message, and without a fallback NOBODY
    // could verify their address at all — strictly worse than the spam folder
    // this feature exists to escape. Nothing was delivered when the send fails,
    // so the fallback cannot duplicate a message. The server logs the rejection
    // loudly either way, so a broken configuration is still visible.
    const recoverable =
      body.code === "EMAIL_NOT_CONFIGURED" ||
      body.code === "SERVER_NOT_CONFIGURED" ||
      body.code === "SEND_FAILED";
    if (!recoverable) {
      // Rate limited, not signed in, no address on the account: retrying
      // through Firebase would fail the same way or spam the user.
      return "failed";
    }
  } catch {
    // Offline or blocked. Fall through to Firebase, which may also fail — and
    // is handled below.
  }

  try {
    await sendEmailVerification(user, {
      // Even on the fallback path, send them back into the app afterwards
      // rather than leaving them on Firebase's own confirmation page.
      url: `${siteUrl()}/app`,
      handleCodeInApp: false,
    });
    return "sent-fallback";
  } catch (error) {
    if (!isUnauthorizedContinueUri(error)) return "failed";
  }

  // The continue URL's domain is not in Firebase Auth > Settings > Authorized
  // domains. That is a one-line config fix, but until someone makes it every
  // send fails — so drop the return link and send the plain email. Landing on
  // Firebase's own confirmation page is a papercut; not being able to verify
  // at all is not. This exact case broke production once: siteUrl() resolves
  // to the Vercel production alias, which was not on the allowlist.
  try {
    await sendEmailVerification(user);
    return "sent-fallback";
  } catch {
    return "failed";
  }
}

/** Firebase's way of saying the continue URL's domain is not allowlisted. */
function isUnauthorizedContinueUri(error: unknown): boolean {
  const code = (error as { code?: string } | null)?.code ?? "";
  const message = error instanceof Error ? error.message : String(error ?? "");
  return (
    code === "auth/unauthorized-continue-uri" ||
    code === "auth/invalid-continue-uri" ||
    /unauthorized[-_ ]?(continue|domain)/i.test(message)
  );
}
