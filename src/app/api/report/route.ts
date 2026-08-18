import { NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";

import { adminConfigError, adminDb, verifyAppCheck } from "@/lib/firebase/admin";
import { RATE_LIMITS, checkRateLimit, clientIp, rateLimitedResponse } from "@/lib/rate-limit";
import { log } from "@/lib/observability/log";

/**
 * Report a shared study set.
 *
 * Deliberately unauthenticated: the whole point of a share link is that
 * someone without an account can open it, so requiring sign-in to report would
 * mean the people most likely to see a problem cannot flag it.
 *
 * That makes abuse of the *report* the obvious next worry, so reports are
 * rate-limited by address and only ever recorded — nothing here unshares a set
 * or touches a student's content. Acting on a report is a human decision.
 */

export const dynamic = "force-dynamic";

const REASONS = [
  "not-study-material",
  "harassment",
  "copyright",
  "personal-information",
  "other",
] as const;

type Reason = (typeof REASONS)[number];

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

  const limit = await checkRateLimit(RATE_LIMITS.report, clientIp(request));
  if (!limit.allowed) return rateLimitedResponse(limit, "reports");

  let body: { userId?: unknown; setId?: unknown; reason?: unknown; detail?: unknown };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Malformed request." }, { status: 400 });
  }

  const userId = asId(body.userId);
  const setId = asId(body.setId);
  const reason = REASONS.includes(body.reason as Reason) ? (body.reason as Reason) : null;

  if (!userId || !setId || !reason) {
    return NextResponse.json({ error: "Malformed request." }, { status: 400 });
  }

  const detail =
    typeof body.detail === "string" ? body.detail.trim().slice(0, 1000) : null;

  try {
    // Written under a collection the rules deny outright, so only the Admin
    // SDK can read the queue back.
    await adminDb().collection("reports").add({
      reportedUserId: userId,
      studySetId: setId,
      reason,
      detail,
      status: "open",
      reporterIp: clientIp(request),
      createdAt: FieldValue.serverTimestamp(),
    });

    log.warn({
      scope: "moderation",
      event: "report.received",
      reason,
      studySetId: setId,
    });

    return NextResponse.json({ received: true });
  } catch (error) {
    log.error({ scope: "moderation", event: "report.failed" }, error);
    return NextResponse.json(
      { error: "Could not send that report. Please try again." },
      { status: 500 },
    );
  }
}

function asId(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed || trimmed.length > 128 || trimmed.includes("/")) return null;
  return trimmed;
}
