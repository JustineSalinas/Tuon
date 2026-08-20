import { NextResponse } from "next/server";
import { FieldValue, Timestamp } from "firebase-admin/firestore";

import {
  adminAuth,
  adminConfigError,
  adminDb,
  verifyAppCheck,
  verifyRequest,
} from "@/lib/firebase/admin";
import {
  RATE_LIMITS,
  checkRateLimit,
  clientIp,
  rateLimitedResponse,
} from "@/lib/rate-limit";
import { currentPeriodStart } from "@/lib/quota";
import { log } from "@/lib/observability/log";

/**
 * Creates the user's profile document on first sign-in.
 *
 * This exists server-side because `plan` and `aiGenerationsUsedThisPeriod` are
 * not client-writable (see firestore.rules) — if the browser could create its
 * own profile it could simply declare itself paid.
 */
export async function POST(request: Request) {
  const configError = adminConfigError();
  if (configError) {
    console.error("[profile/bootstrap] Firebase Admin is not configured:", configError);
    return NextResponse.json(
      { error: "This server is not fully configured yet.", code: "SERVER_NOT_CONFIGURED" },
      { status: 503 },
    );
  }

  // Attestation that the call came from our app, not a script with a token.
  // No-op until APP_CHECK_ENFORCED is turned on.
  if (!(await verifyAppCheck(request))) {
    return NextResponse.json(
      { error: "This request could not be verified. Please reload and try again." },
      { status: 403 },
    );
  }

  // Per-address ceiling. The per-account quota below bounds what one student
  // costs; this bounds how many accounts one connection can create and spend.
  const limit = await checkRateLimit(RATE_LIMITS.bootstrap, clientIp(request));
  if (!limit.allowed) return rateLimitedResponse(limit, "account setups");

  const caller = await verifyRequest(request);
  if (!caller) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  let requestedName: string | null = null;
  try {
    const body = (await request.json()) as { displayName?: string | null };
    if (typeof body.displayName === "string") {
      requestedName = body.displayName.trim().slice(0, 80) || null;
    }
  } catch {
    // Body is optional.
  }

  // A Firebase ID token stays cryptographically valid for up to an hour after
  // the account behind it is deleted. Account deletion removes the profile,
  // the client's snapshot listener sees it vanish, and calls this route with
  // that still-valid token — recreating a profile for a user who no longer
  // exists, carrying their email, in a document nobody can ever reach or
  // erase. That is an erasure failure, so the check is server-side rather
  // than a guard in the client that deletes.
  try {
    await adminAuth().getUser(caller.uid);
  } catch {
    log.warn({
      scope: "profile",
      event: "bootstrap.user_gone",
      uid: caller.uid,
    });
    return NextResponse.json(
      { error: "This account no longer exists.", code: "USER_DELETED" },
      { status: 401 },
    );
  }

  const profileRef = adminDb().collection("users").doc(caller.uid);

  try {
    const existing = await profileRef.get();
    if (existing.exists) {
      return NextResponse.json({ created: false });
    }

    await profileRef.create({
      email: caller.email ?? "",
      displayName: requestedName ?? caller.name ?? "",
      educationLevel: null,
      courses: [],
      strand: null,
      onboardingCompleted: false,

      plan: "free",
      aiGenerationsUsedThisPeriod: 0,
      generationPeriodStart: Timestamp.fromDate(currentPeriodStart()),

      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });

    return NextResponse.json({ created: true });
  } catch (error) {
    // `create()` throws ALREADY_EXISTS if two tabs race. That is a success
    // from the caller's point of view.
    if (
      error &&
      typeof error === "object" &&
      "code" in error &&
      (error as { code?: number | string }).code === 6
    ) {
      return NextResponse.json({ created: false });
    }
    console.error("[profile/bootstrap]", error);
    return NextResponse.json(
      { error: "Could not set up your profile. Please try again." },
      { status: 500 },
    );
  }
}
