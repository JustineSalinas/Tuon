import { NextResponse } from "next/server";
import type {
  DocumentData,
  QueryDocumentSnapshot,
  Timestamp,
} from "firebase-admin/firestore";

import {
  adminConfigError,
  adminDb,
  verifyAppCheck,
  verifyRequest,
} from "@/lib/firebase/admin";
import { log } from "@/lib/observability/log";

/**
 * Data portability (Data Privacy Act §16(f)): hands the student everything we
 * hold about them, in a format they can actually reuse.
 *
 * Runs through the Admin SDK rather than the client because a browser cannot
 * read a whole subtree in one consistent pass, and because the export must
 * include the server-owned fields (plan, quota) the client is not allowed to
 * see written.
 */

export const dynamic = "force-dynamic";

/** Firestore Timestamps do not survive JSON.stringify in a readable form. */
function serialise(value: unknown): unknown {
  if (value === null || value === undefined) return null;
  if (typeof value === "object") {
    const maybeTimestamp = value as Partial<Timestamp>;
    if (typeof maybeTimestamp.toDate === "function") {
      return maybeTimestamp.toDate().toISOString();
    }
    if (Array.isArray(value)) return value.map(serialise);
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([k, v]) => [k, serialise(v)]),
    );
  }
  return value;
}

function docToJson(snapshot: QueryDocumentSnapshot<DocumentData>) {
  return { id: snapshot.id, ...(serialise(snapshot.data()) as Record<string, unknown>) };
}

export async function GET(request: Request) {
  const configError = adminConfigError();
  if (configError) {
    log.error({ scope: "account", event: "export.not_configured", configError });
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

  try {
    const userRef = adminDb().collection("users").doc(caller.uid);

    const [profile, notes, studySets, reviewLogs, quizAttempts] = await Promise.all([
      userRef.get(),
      userRef.collection("notes").get(),
      userRef.collection("studySets").get(),
      userRef.collection("reviewLogs").get(),
      userRef.collection("quizAttempts").get(),
    ]);

    // Cards and questions hang off each set, so they need one pass per set.
    // Fine here: this is a rare, deliberate action, not a hot path.
    const sets = await Promise.all(
      studySets.docs.map(async (setDoc) => {
        const [cards, questions] = await Promise.all([
          setDoc.ref.collection("flashcards").orderBy("order", "asc").get(),
          setDoc.ref.collection("quizQuestions").orderBy("order", "asc").get(),
        ]);
        return {
          ...docToJson(setDoc),
          flashcards: cards.docs.map(docToJson),
          quizQuestions: questions.docs.map(docToJson),
        };
      }),
    );

    const payload = {
      export: {
        service: "Tuón",
        generatedAt: new Date().toISOString(),
        format: "tuon-export/v1",
        about:
          "Everything Tuón holds for this account. Dates are ISO 8601 in UTC. " +
          "Review logs carry the spaced-repetition schedule for each card.",
      },
      account: {
        userId: caller.uid,
        email: caller.email,
        emailVerified: caller.emailVerified,
      },
      profile: profile.exists ? serialise(profile.data()) : null,
      notes: notes.docs.map(docToJson),
      studySets: sets,
      reviewLogs: reviewLogs.docs.map(docToJson),
      quizAttempts: quizAttempts.docs.map(docToJson),
    };

    const stamp = new Date().toISOString().slice(0, 10);
    return new NextResponse(JSON.stringify(payload, null, 2), {
      headers: {
        "content-type": "application/json; charset=utf-8",
        "content-disposition": `attachment; filename="tuon-export-${stamp}.json"`,
        "cache-control": "no-store",
      },
    });
  } catch (error) {
    log.error({ scope: "account", event: "export.failed", uid: caller.uid }, error);
    return NextResponse.json(
      { error: "Could not build your export. Please try again." },
      { status: 500 },
    );
  }
}
