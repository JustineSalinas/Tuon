import { NextResponse } from "next/server";

import {
  adminAuth,
  adminConfigError,
  adminDb,
  verifyAppCheck,
  verifyRequest,
} from "@/lib/firebase/admin";
import { log } from "@/lib/observability/log";

/**
 * Sign out everywhere.
 *
 * The client SDK cannot do this: `signOut()` clears the local session and
 * leaves every other device's refresh token working. Revoking them is an
 * Admin-SDK-only operation, which is why this route exists.
 *
 * Campus computer labs and shared phones make this a real need rather than a
 * checkbox — a student who forgot to sign out in a lab currently has no
 * recourse at all.
 */

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  if (adminConfigError()) {
    return NextResponse.json(
      { error: "This server is not fully configured yet." },
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

  try {
    await adminAuth().revokeRefreshTokens(caller.uid);

    // Recorded so the student can see it happened, and so a support question
    // ("why was I signed out?") has an answer.
    await adminDb()
      .collection("users")
      .doc(caller.uid)
      .set({ sessionsRevokedAt: new Date() }, { merge: true });

    log.info({ scope: "account", event: "sessions.revoked", uid: caller.uid });
    return NextResponse.json({ revoked: true });
  } catch (error) {
    log.error({ scope: "account", event: "sessions.revoke_failed", uid: caller.uid }, error);
    return NextResponse.json(
      { error: "Could not sign out your other devices. Please try again." },
      { status: 500 },
    );
  }
}
