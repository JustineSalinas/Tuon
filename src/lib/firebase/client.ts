import { getApp, getApps, initializeApp, type FirebaseOptions } from "firebase/app";
import { GoogleAuthProvider, getAuth } from "firebase/auth";
import {
  getFirestore,
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
} from "firebase/firestore";

const firebaseConfig: FirebaseOptions = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// Next.js fast-refresh re-runs modules; reuse the app if it already exists.
export const firebaseApp = getApps().length ? getApp() : initializeApp(firebaseConfig);

export const auth = getAuth(firebaseApp);
/**
 * Firestore with an on-device cache.
 *
 * This is what makes "reviewing on the jeep" true rather than aspirational.
 * Cards and their schedules are served from IndexedDB when the network is
 * gone, and ratings made offline are queued and replayed on reconnect — so a
 * student loses signal mid-session and simply keeps going.
 *
 * The multi-tab manager matters because students leave the app open on a
 * library desktop and a phone at once; without it the second tab fails to
 * acquire the persistence lock and silently falls back to memory-only.
 */
function createDb() {
  // No IndexedDB on the server, and nothing to cache there anyway.
  if (typeof window === "undefined") return getFirestore(firebaseApp);
  try {
    return initializeFirestore(firebaseApp, {
      localCache: persistentLocalCache({
        tabManager: persistentMultipleTabManager(),
      }),
    });
  } catch {
    // Already initialised — fast refresh re-runs this module, and
    // initializeFirestore throws on a second call for the same app. The
    // existing instance already has the cache, so reuse it.
    return getFirestore(firebaseApp);
  }
}

export const db = createDb();

export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: "select_account" });

/**
 * App Check attests that requests come from *this app*, not a script holding a
 * stolen ID token. It is what stops someone minting accounts and driving
 * /api/generate directly.
 *
 * Inert until NEXT_PUBLIC_RECAPTCHA_SITE_KEY is set, so local development and
 * CI are unaffected. Enable it in the Firebase console (App Check ->
 * reCAPTCHA Enterprise), then set the key in the environment.
 */
type AppCheckInstance = Awaited<
  ReturnType<typeof import("firebase/app-check").getToken>
> extends infer _T
  ? import("firebase/app-check").AppCheck
  : never;

let appCheck: AppCheckInstance | null = null;

if (typeof window !== "undefined" && process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY) {
  void import("firebase/app-check").then(
    ({ initializeAppCheck, ReCaptchaEnterpriseProvider }) => {
      try {
        appCheck = initializeAppCheck(firebaseApp, {
          provider: new ReCaptchaEnterpriseProvider(
            process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY as string,
          ),
          isTokenAutoRefreshEnabled: true,
        });
      } catch (error) {
        // Never let attestation setup break the app for a real student.
        console.error("[app-check] initialisation failed", error);
      }
    },
  );
}

/**
 * App Check token for our own API routes.
 *
 * The SDK attaches these automatically to Firebase services, but not to
 * custom fetch calls — those need it added by hand. Returns null when App
 * Check is not configured, in which case the server does not require it.
 */
export async function getAppCheckToken(): Promise<string | null> {
  if (!appCheck) return null;
  try {
    const { getToken } = await import("firebase/app-check");
    return (await getToken(appCheck, false)).token;
  } catch {
    return null;
  }
}
