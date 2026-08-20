import "server-only";

import { cert, getApps, initializeApp, type App } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";

/**
 * Admin SDK — server only. Bypasses Firestore security rules, so it is the
 * only thing allowed to write plan / quota fields on a user profile.
 */

function parseServiceAccount() {
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
  if (!raw || raw.trim() === "") {
    throw new Error(
      "FIREBASE_SERVICE_ACCOUNT_KEY is not set. Generate a private key at " +
        "https://console.firebase.google.com/project/" +
        `${process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID}/settings/serviceaccounts/adminsdk` +
        " and paste the full JSON into .env.local.",
    );
  }

  let parsed: Record<string, string>;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error(
      "FIREBASE_SERVICE_ACCOUNT_KEY is not valid JSON. It should be the entire " +
        "downloaded service-account file on one line, wrapped in single quotes.",
    );
  }

  // Env files often store the PEM with literal \n sequences.
  if (parsed.private_key) {
    parsed.private_key = parsed.private_key.replace(/\\n/g, "\n");
  }
  return parsed;
}

/**
 * Returns a human-readable reason the Admin SDK cannot start, or null when it
 * is configured. Routes check this first so that a missing service-account key
 * surfaces as "server not configured" rather than masquerading as a rejected
 * token — the two are indistinguishable otherwise, which makes first-time
 * setup very hard to debug.
 */
export function adminConfigError(): string | null {
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
  if (!raw || raw.trim() === "") {
    return "FIREBASE_SERVICE_ACCOUNT_KEY is not set.";
  }
  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    if (!parsed.project_id || !parsed.client_email || !parsed.private_key) {
      return "FIREBASE_SERVICE_ACCOUNT_KEY is missing project_id, client_email, or private_key.";
    }
  } catch {
    return "FIREBASE_SERVICE_ACCOUNT_KEY is not valid JSON.";
  }
  return null;
}

let cachedApp: App | null = null;

function adminApp(): App {
  if (cachedApp) return cachedApp;
  const existing = getApps();
  if (existing.length) {
    cachedApp = existing[0];
    return cachedApp;
  }
  const serviceAccount = parseServiceAccount();
  cachedApp = initializeApp({
    credential: cert({
      projectId: serviceAccount.project_id,
      clientEmail: serviceAccount.client_email,
      privateKey: serviceAccount.private_key,
    }),
    projectId: serviceAccount.project_id,
  });
  return cachedApp;
}

export function adminAuth() {
  return getAuth(adminApp());
}

/**
 * Verifies the Firebase App Check token, proving the call came from our app.
 *
 * Enforcement is opt-in via APP_CHECK_ENFORCED so it can be switched on only
 * once the client is issuing tokens — turning it on before that would lock
 * every real user out.
 */
export async function verifyAppCheck(request: Request): Promise<boolean> {
  if (process.env.APP_CHECK_ENFORCED !== "true") return true;

  const token = request.headers.get("x-firebase-appcheck");
  if (!token) return false;
  try {
    // Imported lazily, and this is load-bearing rather than tidiness.
    // `firebase-admin/app-check` pulls in jwks-rsa, which `require()`s jose —
    // now ESM-only. As a static top-level import that fails to bundle on
    // Vercel's serverless runtime with ERR_REQUIRE_ESM, and because every API
    // route imports this module, it took down the whole API in production
    // while working perfectly in local dev. A dynamic import resolves the ESM
    // chain, and since App Check is opt-in the module is not loaded at all
    // until it is switched on.
    const { getAppCheck } = await import("firebase-admin/app-check");
    await getAppCheck(adminApp()).verifyToken(token);
    return true;
  } catch (error) {
    console.error("[app-check] token rejected", error);
    return false;
  }
}

export function adminDb() {
  return getFirestore(adminApp());
}

/**
 * Verifies the Firebase ID token on an incoming request.
 * Returns the uid, or null if the caller is not authenticated.
 */
export async function verifyRequest(request: Request): Promise<{
  uid: string;
  email: string | null;
  name: string | null;
  emailVerified: boolean;
} | null> {
  const header = request.headers.get("authorization");
  if (!header?.startsWith("Bearer ")) return null;

  const idToken = header.slice("Bearer ".length).trim();
  if (!idToken) return null;

  try {
    const decoded = await adminAuth().verifyIdToken(idToken);
    return {
      uid: decoded.uid,
      email: decoded.email ?? null,
      name: (decoded.name as string | undefined) ?? null,
      // Google sign-in returns already-verified addresses; email/password
      // signups start unverified.
      emailVerified: decoded.email_verified === true,
    };
  } catch (error) {
    // Swallowing this silently makes a legitimately signed-in user look
    // identical to no user at all, which is very hard to debug. Log the real
    // reason, and call out clock skew by name — it is the most common cause
    // and the least obvious, because sign-in succeeds (Google's clock) while
    // verification fails (ours).
    const code =
      error && typeof error === "object" && "code" in error
        ? String((error as { code?: unknown }).code)
        : "unknown";
    const message = error instanceof Error ? error.message : String(error);

    if (/expired|used too early|issued in the future|iat|exp/i.test(message)) {
      console.error(
        `[auth] Token rejected as expired/not-yet-valid (${code}). ` +
          "This is usually a system clock problem, not a bad token — check that " +
          "the server's clock is accurate. Detail: " +
          message,
      );
    } else {
      console.error(`[auth] verifyIdToken failed (${code}): ${message}`);
    }
    return null;
  }
}
