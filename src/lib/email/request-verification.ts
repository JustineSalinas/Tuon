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
    // Anything other than "we have no mailer" is a real failure and must not
    // be papered over by silently sending the spam-foldered version.
    if (body.code !== "EMAIL_NOT_CONFIGURED" && body.code !== "SERVER_NOT_CONFIGURED") {
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
  } catch {
    return "failed";
  }
}
