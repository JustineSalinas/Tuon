"use client";

import { useState } from "react";
import Link from "next/link";
import { motion } from "motion/react";
import { FirebaseError } from "firebase/app";
import { sendPasswordResetEmail } from "firebase/auth";
import { ArrowLeft, Loader2, MailCheck } from "lucide-react";

import { auth } from "@/lib/firebase/client";
import { Wordmark } from "@/components/brand/logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";

/**
 * Forgotten-password request.
 *
 * The confirmation NEVER says whether the address has an account. Telling a
 * stranger "no account with that email" turns this form into a free membership
 * oracle — paste a list, learn who is a student here. Firebase itself throws
 * `auth/user-not-found`, and this deliberately swallows it and shows the same
 * message either way.
 *
 * The reset link itself is handled by Firebase's own action page, so there is
 * no route of ours to protect and no token for us to get wrong.
 */
export function ResetPasswordForm() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setPending(true);

    try {
      await sendPasswordResetEmail(auth, email.trim());
      setSent(true);
    } catch (err) {
      const code = err instanceof FirebaseError ? err.code : "";
      console.error(`[auth] reset ${code}`);

      // An unknown address gets the success screen, on purpose — see above.
      if (code === "auth/user-not-found") {
        setSent(true);
      } else if (code === "auth/invalid-email") {
        setError("That does not look like a valid email address.");
      } else if (code === "auth/too-many-requests") {
        setError("Too many attempts. Please wait a few minutes and try again.");
      } else if (code === "auth/network-request-failed") {
        setError("Cannot reach the network. Check your connection and try again.");
      } else {
        setError("Could not send the email just now. Please try again.");
      }
      setPending(false);
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

        {sent ? (
          <>
            <div className="bg-success/12 text-success mt-8 grid size-11 place-items-center rounded-xl">
              <MailCheck className="size-5" />
            </div>
            <h1 className="font-display mt-5 text-3xl font-semibold tracking-tight">
              Check your email
            </h1>
            <p className="text-muted-foreground mt-3 text-sm leading-relaxed">
              If an account exists for{" "}
              <span className="text-foreground font-medium">{email.trim()}</span>,
              a link to set a new password is on its way. It expires in an hour.
            </p>
            <p className="text-muted-foreground mt-3 text-sm leading-relaxed">
              Nothing after a few minutes? Check spam, and make sure you typed
              the address you signed up with.
            </p>

            <div className="mt-8 flex flex-col gap-3">
              <Button size="lg" render={<Link href="/login" />}>
                Back to sign in
              </Button>
              <Button
                variant="ghost"
                onClick={() => {
                  setSent(false);
                  setPending(false);
                }}
              >
                Use a different address
              </Button>
            </div>
          </>
        ) : (
          <>
            <h1 className="font-display mt-8 text-3xl font-semibold tracking-tight">
              Forgot your password?
            </h1>
            <p className="text-muted-foreground mt-2 text-sm leading-relaxed">
              Type the email you signed up with and we will send you a link to
              set a new one.
            </p>

            {error ? (
              <Alert variant="destructive" className="mt-6">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            ) : null}

            <form onSubmit={handleSubmit} className="mt-6 space-y-4">
              <div className="space-y-2">
                <Label htmlFor="reset-email">Email</Label>
                <Input
                  id="reset-email"
                  type="email"
                  inputMode="email"
                  autoComplete="email"
                  required
                  autoFocus
                  placeholder="juan@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={pending}
                />
              </div>

              <Button type="submit" className="w-full" size="lg" disabled={pending}>
                {pending ? (
                  <>
                    <Loader2 className="animate-spin" />
                    Sending…
                  </>
                ) : (
                  "Send the reset link"
                )}
              </Button>
            </form>

            <Button
              variant="ghost"
              className="mt-6 -ml-3"
              render={<Link href="/login" />}
            >
              <ArrowLeft />
              Back to sign in
            </Button>
          </>
        )}
      </motion.div>
    </div>
  );
}
