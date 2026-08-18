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
import { useAuth } from "@/components/providers/auth-provider";
import { Wordmark } from "@/components/brand/logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";

type Mode = "login" | "signup";

/** Firebase error codes are not fit for humans. */
function friendlyAuthError(error: unknown): string | null {
  if (!(error instanceof FirebaseError)) {
    return "Something went wrong. Please try again.";
  }
  switch (error.code) {
    case "auth/invalid-credential":
    case "auth/wrong-password":
    case "auth/user-not-found":
      return "That email and password do not match an account.";
    case "auth/email-already-in-use":
      return "An account already exists with that email. Try logging in instead.";
    case "auth/weak-password":
      return "Please use a password of at least 6 characters.";
    case "auth/invalid-email":
      return "That does not look like a valid email address.";
    case "auth/too-many-requests":
      return "Too many attempts. Please wait a moment and try again.";
    case "auth/network-request-failed":
      return "Cannot reach the network. Check your connection and try again.";
    case "auth/popup-blocked":
      return "Your browser blocked the Google sign-in window. Allow pop-ups and try again.";
    case "auth/account-exists-with-different-credential":
      return "You already have an account with this email using a different sign-in method.";
    case "auth/popup-closed-by-user":
    case "auth/cancelled-popup-request":
      return null; // User changed their mind; not an error worth showing.
    default:
      return "Something went wrong. Please try again.";
  }
}

export function AuthForm({ mode }: { mode: Mode }) {
  const router = useRouter();
  const { user, authLoading } = useAuth();

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
      setError("Please use a password of at least 6 characters.");
      return;
    }

    setPending("email");
    try {
      if (isSignup) {
        await createUserWithEmailAndPassword(auth, email.trim(), password);
      } else {
        await signInWithEmailAndPassword(auth, email.trim(), password);
      }
      router.replace("/app");
    } catch (err) {
      setError(friendlyAuthError(err));
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
      setError(friendlyAuthError(err));
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
          {isSignup ? "Start studying smarter" : "Welcome back"}
        </h1>
        <p className="text-muted-foreground mt-2 text-sm">
          {isSignup
            ? "Turn your class notes into flashcards and quizzes in seconds."
            : "Pick up where you left off."}
        </p>

        {error ? (
          <Alert variant="destructive" className="mt-6">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : null}

        <form onSubmit={handleEmailSubmit} className="mt-6 space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              inputMode="email"
              autoComplete="email"
              required
              placeholder="juan@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={pending !== null}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              autoComplete={isSignup ? "new-password" : "current-password"}
              required
              placeholder={isSignup ? "At least 6 characters" : "Your password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={pending !== null}
            />
          </div>

          <Button type="submit" className="w-full" size="lg" disabled={pending !== null}>
            {pending === "email" ? (
              <>
                <Loader2 className="animate-spin" />
                {isSignup ? "Creating account…" : "Signing in…"}
              </>
            ) : isSignup ? (
              "Create account"
            ) : (
              "Sign in"
            )}
          </Button>
        </form>

        <div className="my-6 flex items-center gap-3">
          <Separator className="flex-1" />
          <span className="text-muted-foreground text-xs uppercase tracking-widest">or</span>
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
          Continue with Google
        </Button>

        <p className="text-muted-foreground mt-8 text-center text-sm">
          {isSignup ? "Already have an account? " : "New to Tuón? "}
          <Link
            href={isSignup ? "/login" : "/signup"}
            className="text-foreground font-medium underline underline-offset-4 hover:text-primary"
          >
            {isSignup ? "Sign in" : "Create one"}
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
