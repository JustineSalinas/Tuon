"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { onAuthStateChanged, signOut as firebaseSignOut, type User } from "firebase/auth";
import { doc, onSnapshot } from "firebase/firestore";

import { auth, db, getAppCheckToken } from "@/lib/firebase/client";
import type { UserProfile } from "@/lib/types";

interface AuthContextValue {
  user: User | null;
  profile: UserProfile | null;
  /** True until Firebase has resolved whether anyone is signed in. */
  authLoading: boolean;
  /** True while the profile document is being fetched or bootstrapped. */
  profileLoading: boolean;
  /**
   * Set when the profile could not be created. Without this the app would sit
   * on a loading spinner forever, because the gate waits for a profile that is
   * never coming.
   */
  profileError: string | null;
  /** Retries profile bootstrap after a failure. */
  retryProfile: () => void;
  /**
   * Call before deleting an account. The profile listener otherwise sees
   * the document vanish and helpfully bootstraps a replacement, undoing
   * half the erasure. The server refuses that request too, but not making
   * it is cleaner than relying on the round trip losing a race.
   */
  beginAccountDeletion: () => void;
  signOut: () => Promise<void>;
  /** fetch() with the caller's Firebase ID token attached. */
  authedFetch: (input: string, init?: RequestInit) => Promise<Response>;
  /**
   * Re-reads the account from Firebase and mints a fresh ID token.
   *
   * `emailVerified` is a CLAIM inside the ID token, and that token is
   * cached for up to an hour. A student who clicks the link in their email
   * — in another tab, or on their phone — comes back to a session that
   * still says unverified, and stays blocked with nothing to click.
   * Returns whether the address is verified as of now.
   */
  refreshVerification: () => Promise<boolean>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [profileLoading, setProfileLoading] = useState(true);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [retryNonce, setRetryNonce] = useState(0);

  // Guards against re-firing bootstrap while the first call is in flight, or
  // looping forever if it fails. Reset inside the effect, not during render.
  const bootstrapAttempted = useRef(false);
  // Latches for the lifetime of the session; the account is going away.
  const deletingAccount = useRef(false);

  const uid = user?.uid ?? null;
  const [activeUid, setActiveUid] = useState<string | null>(null);

  // Reset profile state during render when the signed-in user changes, rather
  // than inside the effect — a synchronous setState in an effect body causes a
  // cascading re-render, and React 19 flags it.
  if (activeUid !== uid) {
    setActiveUid(uid);
    setProfile(null);
    setProfileLoading(uid !== null);
    setProfileError(null);
  }

  useEffect(() => {
    return onAuthStateChanged(auth, (nextUser) => {
      setUser(nextUser);
      setAuthLoading(false);
      if (!nextUser) {
        setProfile(null);
        setProfileLoading(false);
      }
    });
  }, []);

  // Live subscription to the profile doc. Keeping this on a snapshot (rather
  // than a one-shot read) is what makes the "3/5 generations used" counter
  // update the moment a generation finishes, without a manual refetch.
  useEffect(() => {
    if (!uid) return;

    bootstrapAttempted.current = false;
    const currentUser = auth.currentUser;

    return onSnapshot(
      doc(db, "users", uid),
      async (snapshot) => {
        if (snapshot.exists()) {
          setProfile(snapshot.data() as UserProfile);
          setProfileLoading(false);
          setProfileError(null);
          return;
        }

        // No profile yet — first sign-in. The document is created server-side
        // so that plan and quota fields start from a state the client cannot
        // have tampered with.
        if (deletingAccount.current) return;
        if (bootstrapAttempted.current) return;
        bootstrapAttempted.current = true;

        try {
          const token = await currentUser?.getIdToken();
          if (!token) {
            setProfileLoading(false);
            setProfileError("Could not verify your session. Try signing in again.");
            return;
          }

          const appCheckToken = await getAppCheckToken();
          const response = await fetch("/api/profile/bootstrap", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
              ...(appCheckToken ? { "X-Firebase-AppCheck": appCheckToken } : {}),
            },
            body: JSON.stringify({ displayName: currentUser?.displayName ?? null }),
          });

          if (!response.ok) {
            const payload = (await response
              .json()
              .catch(() => ({}))) as { error?: string; code?: string };
            setProfileLoading(false);
            setProfileError(
              payload.code === "SERVER_NOT_CONFIGURED" || response.status === 503
                ? "This server is not finished setting up, so your account could not be created. (Admin: FIREBASE_SERVICE_ACCOUNT_KEY is missing.)"
                : (payload.error ?? "Could not set up your account."),
            );
            return;
          }
          // Success re-triggers this listener with the created document.
        } catch {
          setProfileLoading(false);
          setProfileError("Could not reach the server. Check your connection.");
        }
      },
      (error) => {
        console.error("[auth-provider] profile subscription failed", error);
        setProfileLoading(false);
        setProfileError("Could not read your profile.");
      },
    );
  }, [uid, retryNonce]);

  const retryProfile = useCallback(() => {
    bootstrapAttempted.current = false;
    setProfileError(null);
    setProfileLoading(true);
    setRetryNonce((n) => n + 1);
  }, []);

  const beginAccountDeletion = useCallback(() => {
    deletingAccount.current = true;
  }, []);

  const refreshVerification = useCallback(async () => {
    const current = auth.currentUser;
    if (!current) return false;
    await current.reload();
    // reload() updates the local User; the TOKEN still carries the old claim
    // until forced, and the token is what /api/generate verifies.
    await current.getIdToken(true);
    setUser({ ...current } as typeof current);
    return current.emailVerified;
  }, []);

  const signOut = useCallback(async () => {
    await firebaseSignOut(auth);
  }, []);

  const authedFetch = useCallback(async (input: string, init: RequestInit = {}) => {
    const current = auth.currentUser;
    if (!current) throw new Error("Not signed in.");
    const [token, appCheckToken] = await Promise.all([
      current.getIdToken(),
      // Null until App Check is configured; the server ignores the header
      // until APP_CHECK_ENFORCED is on. Every authed route checks it, so this
      // has to ride along on all of them, not just the bootstrap call.
      getAppCheckToken(),
    ]);
    return fetch(input, {
      ...init,
      headers: {
        "Content-Type": "application/json",
        ...(init.headers ?? {}),
        Authorization: `Bearer ${token}`,
        ...(appCheckToken ? { "X-Firebase-AppCheck": appCheckToken } : {}),
      },
    });
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      profile,
      authLoading,
      profileLoading,
      profileError,
      retryProfile,
      beginAccountDeletion,
      signOut,
      authedFetch,
      refreshVerification,
    }),
    [
      user,
      profile,
      authLoading,
      profileLoading,
      profileError,
      retryProfile,
      beginAccountDeletion,
      signOut,
      authedFetch,
      refreshVerification,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used inside <AuthProvider>.");
  }
  return context;
}
