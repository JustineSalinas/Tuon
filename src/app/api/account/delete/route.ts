import { NextResponse } from "next/server";
import type { CollectionReference, DocumentReference } from "firebase-admin/firestore";

import {
  adminAuth,
  adminConfigError,
  adminDb,
  verifyAppCheck,
  verifyRequest,
} from "@/lib/firebase/admin";
import { log } from "@/lib/observability/log";

/**
 * Right to erasure (Data Privacy Act §16(e)).
 *
 * Deleting a Firestore document does NOT delete its subcollections — a naive
 * `profileRef.delete()` would leave every note, set, card, and review log
 * orphaned but fully intact, which is exactly the failure the law cares about.
 * So this walks the subtree explicitly.
 *
 * Order matters: Firestore data first, the auth user last. If the run dies
 * partway the student can still sign in and retry; deleting auth first would
 * strand their data with nobody able to reach it.
 */

export const dynamic = "force-dynamic";

/** Firestore caps a batch at 500 writes. */
const BATCH_LIMIT = 400;

async function deleteCollection(ref: CollectionReference) {
  let deleted = 0;
  for (;;) {
    const snapshot = await ref.limit(BATCH_LIMIT).get();
    if (snapshot.empty) return deleted;

    const batch = ref.firestore.batch();
    snapshot.docs.forEach((doc) => batch.delete(doc.ref));
    await batch.commit();
    deleted += snapshot.size;

    // A short page means we drained it.
    if (snapshot.size < BATCH_LIMIT) return deleted;
  }
}

async function deleteUserTree(userRef: DocumentReference) {
  // Study sets own two subcollections each, so they are cleared per set
  // before the set documents themselves go.
  const sets = await userRef.collection("studySets").get();
  for (const setDoc of sets.docs) {
    await deleteCollection(setDoc.ref.collection("flashcards"));
    await deleteCollection(setDoc.ref.collection("quizQuestions"));
  }

  await deleteCollection(userRef.collection("studySets"));
  await deleteCollection(userRef.collection("notes"));
  await deleteCollection(userRef.collection("reviewLogs"));
  await deleteCollection(userRef.collection("quizAttempts"));
  await userRef.delete();
}

export async function POST(request: Request) {
  const configError = adminConfigError();
  if (configError) {
    log.error({ scope: "account", event: "delete.not_configured", configError });
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

  // An ID token can live for an hour after sign-in. For something irreversible
  // that is too long a window on a borrowed laptop, so require a token minted
  // in the last five minutes — the client re-authenticates to obtain one.
  const authTime = await recentAuthTime(request);
  if (authTime === null || Date.now() - authTime > 5 * 60 * 1000) {
    return NextResponse.json(
      {
        error: "Please sign in again to confirm this.",
        code: "REAUTH_REQUIRED",
      },
      { status: 403 },
    );
  }

  // Typing the phrase is the confirmation. A dialog alone is too easy to click
  // through for an action with no undo.
  let confirmation: string | null = null;
  try {
    const body = (await request.json()) as { confirm?: unknown };
    if (typeof body.confirm === "string") confirmation = body.confirm.trim();
  } catch {
    // Missing body is handled below.
  }
  if (confirmation !== "DELETE") {
    return NextResponse.json(
      { error: "Deletion was not confirmed.", code: "NOT_CONFIRMED" },
      { status: 400 },
    );
  }

  try {
    await deleteUserTree(adminDb().collection("users").doc(caller.uid));
    await adminAuth().deleteUser(caller.uid);

    log.info({ scope: "account", event: "delete.completed", uid: caller.uid });
    return NextResponse.json({ deleted: true });
  } catch (error) {
    log.error({ scope: "account", event: "delete.failed", uid: caller.uid }, error);
    return NextResponse.json(
      {
        error:
          "Could not finish deleting your account. Some of it may already be " +
          "gone — run it again, and email hello@tuon.app if it keeps failing.",
      },
      { status: 500 },
    );
  }
}

/** `auth_time` from the ID token, in milliseconds, or null if unreadable. */
async function recentAuthTime(request: Request): Promise<number | null> {
  const header = request.headers.get("authorization");
  if (!header?.startsWith("Bearer ")) return null;
  try {
    const decoded = await adminAuth().verifyIdToken(header.slice(7).trim());
    return decoded.auth_time * 1000;
  } catch {
    return null;
  }
}
