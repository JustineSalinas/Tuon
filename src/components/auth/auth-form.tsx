"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "motion/react";
import { FirebaseError } from "firebase/app";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
} from "firebase/auth";
import { Loader2 } from "lucide-react";

import { auth, googleProvider } from "@/lib/firebase/client";
import { requestVerificationEmail } from "@/lib/email/request-verification";
import { useAuth } from "@/components/providers/auth-provider";
import { useI18n } from "@/components/providers/i18n-provider";
import type { Messages } from "@/lib/i18n/en";
import { Wordmark } from "@/components/brand/logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";

type Mode = "login" | "signup";

/** Firebase error codes are not fit for humans, in any language. */
function friendlyAuthError(error: unknown, t: Messages): string | null {
  if (!(error instanceof FirebaseError)) {
    return t.auth.error.unknown;
  }
  // The friendly text deliberately hides the code, which makes a production
  // report of "something went wrong" undiagnosable. Keep the real one in the
  // console so it can be read off a student's screen share.
  console.error(`[auth] ${error.code}: ${error.message}`);
  switch (error.code) {
    case "auth/invalid-credential":
    case "auth/wrong-password":
    case "auth/user-not-found":
      return t.auth.error.noMatch;
    case "auth/email-already-in-use":
      return t.auth.error.emailInUse;
    case "auth/weak-password":
      return t.auth.error.weakPassword;
    case "auth/invalid-email":
      return t.auth.error.invalidEmail;
    case "auth/too-many-requests":
      return t.auth.error.tooManyRequests;
    case "auth/network-request-failed":
      return t.auth.error.network;
    case "auth/popup-blocked":
      return t.auth.error.popupBlocked;
    case "auth/account-exists-with-different-credential":
      return t.auth.error.differentMethod;
    case "auth/popup-closed-by-user":
    case "auth/cancelled-popup-request":
      return null; // User changed their mind; not an error worth showing.

    // The most likely failure on a freshly deployed URL, and it used to fall
    // through to "Something went wrong" — the least useful message for the
    // most diagnosable problem. Every Vercel deployment also gets its own
    // unique hostname, and only the stable alias is ever authorised, so this
    // fires whenever someone opens a per-deployment link.
    case "auth/unauthorized-domain":
      return t.auth.error.unauthorizedDomain;
    case "auth/operation-not-allowed":
      return t.auth.error.notAllowed;

    // A token for an account that no longer exists, or was signed out
    // server-side. Clearing it is the fix, and the user cannot guess that.
    case "auth/user-token-expired":
    case "auth/invalid-user-token":
    case "auth/user-disabled":
      return t.auth.error.sessionExpired;

    default:
      return t.auth.error.unknown;
  }
}

export function AuthForm({ mode }: { mode: Mode }) {
  const router = useRouter();
  const { user, authLoading } = useAuth();
  const { t } = useI18n();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState<"email" | "google" | null>(null);

  const isSignup = mode === "signup";

  // Already signed in (e.g. hit /login with a live session) — go straight in.
  useEffect(() => {
    if (!authLoading && user) {
      router.replace("/app");
    }
  }, [authLoading, user, router]);

  async function handleEmailSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);

    if (isSignup && password.length < 6) {
      setError(t.auth.error.weakPassword);
      return;
    }

    setPending("email");
    try {
      if (isSignup) {
        const credential = await createUserWithEmailAndPassword(
          auth,
          email.trim(),
          password,
        );
        // Best effort: a failure here must not block signup, since the student
        // can resend from settings. Verification gates AI generation, not the
        // account itself. `requestVerificationEmail` already swallows delivery
        // problems and falls back to Firebase's mailer.
        await requestVerificationEmail(credential.user).catch(() => {});
      } else {
        await signInWithEmailAndPassword(auth, email.trim(), password);
      }
      router.replace("/app");
    } catch (err) {
      setError(friendlyAuthError(err, t));
      setPending(null);
    }
  }

  async function handleGoogle() {
    setError(null);
    setPending("google");
    try {
      await signInWithPopup(auth, googleProvider);
      router.replace("/app");
    } catch (err) {
      setError(friendlyAuthError(err, t));
      setPending(null);
    }
  }

  return (
    <div className="w-full max-w-sm">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
      >
        <Link href="/" className="inline-block">
          <Wordmark />
        </Link>

        <h1 className="font-display mt-8 text-3xl font-semibold tracking-tight">
          {isSignup ? t.auth.signupHeading : t.auth.loginHeading}
        </h1>
        <p className="text-muted-foreground mt-2 text-sm">
          {isSignup ? t.auth.signupSub : t.auth.loginSub}
        </p>

        {error ? (
          <Alert variant="destructive" className="mt-6">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : null}

        <form onSubmit={handleEmailSubmit} className="mt-6 space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">{t.auth.email}</Label>
            <Input
              id="email"
              type="email"
              inputMode="email"
              autoComplete="email"
              required
              placeholder={t.auth.emailPlaceholder}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={pending !== null}
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between gap-3">
              <Label htmlFor="password">{t.auth.password}</Label>
              {/* Sign-in only: on the signup form there is no account to
                  recover yet, and offering it there just adds doubt. */}
              {!isSignup ? (
                <Link
                  href="/reset-password"
                  className="text-muted-foreground hover:text-foreground text-sm underline underline-offset-4"
                >
                  {t.auth.forgot}
                </Link>
              ) : null}
            </div>
            <PasswordInput
              id="password"
              autoComplete={isSignup ? "new-password" : "current-password"}
              required
              placeholder={
                isSignup
                  ? t.auth.newPasswordPlaceholder
                  : t.auth.passwordPlaceholder
              }
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={pending !== null}
            />
          </div>

          <Button type="submit" className="w-full" size="lg" disabled={pending !== null}>
            {pending === "email" ? (
              <>
                <Loader2 className="animate-spin" />
                {isSignup ? t.auth.creatingAccount : t.auth.signingIn}
              </>
            ) : isSignup ? (
              t.auth.createAccount
            ) : (
              t.auth.signIn
            )}
          </Button>
        </form>

        <div className="my-6 flex items-center gap-3">
          <Separator className="flex-1" />
          <span className="text-muted-foreground text-xs uppercase tracking-widest">
            {t.auth.or}
          </span>
          <Separator className="flex-1" />
        </div>

        <Button
          type="button"
          variant="outline"
          size="lg"
          className="w-full"
          onClick={handleGoogle}
          disabled={pending !== null}
        >
          {pending === "google" ? <Loader2 className="animate-spin" /> : <GoogleIcon />}
          {t.auth.continueWithGoogle}
        </Button>

        {isSignup ? (
          <p className="text-muted-foreground mt-6 text-center text-xs leading-relaxed">
            {t.auth.termsBefore}{" "}
            <Link href="/terms" className="hover:text-foreground underline underline-offset-4">
              {t.auth.terms}
            </Link>{" "}
            {t.auth.termsAnd}{" "}
            <Link href="/privacy" className="hover:text-foreground underline underline-offset-4">
              {t.auth.privacy}
            </Link>
            {t.auth.termsAfter}
          </p>
        ) : null}

        <p className="text-muted-foreground mt-8 text-center text-sm">
          {isSignup ? t.auth.haveAccount : t.auth.newHere}
          <Link
            href={isSignup ? "/login" : "/signup"}
            className="text-foreground font-medium underline underline-offset-4 hover:text-primary"
          >
            {isSignup ? t.auth.signIn : t.auth.createOne}
          </Link>
        </p>
      </motion.div>
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-4" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M23.52 12.27c0-.85-.08-1.67-.22-2.45H12v4.63h6.46a5.52 5.52 0 0 1-2.4 3.62v3h3.87c2.26-2.09 3.59-5.17 3.59-8.8Z"
      />
      <path
        fill="#34A853"
        d="M12 24c3.24 0 5.96-1.08 7.94-2.91l-3.87-3c-1.08.72-2.45 1.15-4.07 1.15-3.13 0-5.78-2.11-6.73-4.95H1.27v3.09A12 12 0 0 0 12 24Z"
      />
      <path
        fill="#FBBC05"
        d="M5.27 14.29a7.2 7.2 0 0 1 0-4.58V6.62H1.27a12 12 0 0 0 0 10.76l4-3.09Z"
      />
      <path
        fill="#EA4335"
        d="M12 4.77c1.77 0 3.35.61 4.6 1.8l3.43-3.43C17.95 1.19 15.24 0 12 0A12 12 0 0 0 1.27 6.62l4 3.09C6.22 6.87 8.87 4.77 12 4.77Z"
      />
    </svg>
  );
}
