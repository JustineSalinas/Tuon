"use client";

import { useState } from "react";
import {
  EmailAuthProvider,
  GoogleAuthProvider,
  reauthenticateWithCredential,
  reauthenticateWithPopup,
  sendEmailVerification,
  updatePassword,
  verifyBeforeUpdateEmail,
} from "firebase/auth";
import { Check, KeyRound, Loader2, LogOut, Mail, ShieldCheck } from "lucide-react";
import { toast } from "sonner";

import { auth } from "@/lib/firebase/client";
import { useAuth } from "@/components/providers/auth-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

/**
 * Everything about the account itself, as opposed to the study profile.
 *
 * Password and email changes both require a recent sign-in — Firebase enforces
 * this, and it is the right rule: an unattended session should not be enough
 * to take an account over.
 */
export function AccountSecurity() {
  const { user } = useAuth();
  if (!user) return null;

  const usesPassword = user.providerData.some((p) => p.providerId === "password");

  return (
    <section className="mt-8">
      <h2 className="font-display text-lg font-semibold tracking-tight">
        Account &amp; security
      </h2>

      <div className="mt-4 space-y-6">
        <EmailRow />
        <Separator />
        {usesPassword ? (
          <>
            <PasswordRow />
            <Separator />
          </>
        ) : (
          <>
            <GoogleOnlyNote />
            <Separator />
          </>
        )}
        <SessionsRow />
      </div>
    </section>
  );
}

function EmailRow() {
  const { user } = useAuth();
  const [changing, setChanging] = useState(false);
  const [newEmail, setNewEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const usesPassword =
    user?.providerData.some((p) => p.providerId === "password") ?? false;

  async function resendVerification() {
    if (!auth.currentUser) return;
    setBusy(true);
    try {
      await sendEmailVerification(auth.currentUser);
      toast.success("Verification email sent. Check your inbox and spam folder.");
    } catch {
      toast.error("Could not send that email. Please try again in a minute.");
    }
    setBusy(false);
  }

  async function submit() {
    const current = auth.currentUser;
    if (!current) return;
    setBusy(true);
    setError(null);
    try {
      if (usesPassword) {
        if (!current.email) throw new Error("This account has no email address.");
        await reauthenticateWithCredential(
          current,
          EmailAuthProvider.credential(current.email, password),
        );
      } else {
        await reauthenticateWithPopup(current, new GoogleAuthProvider());
      }

      // Sends a confirmation to the NEW address and only switches once it is
      // clicked. The plain `updateEmail` would move the account to an address
      // nobody has proven they control — a typo would lock them out.
      await verifyBeforeUpdateEmail(current, newEmail.trim());

      setChanging(false);
      setNewEmail("");
      setPassword("");
      toast.success(
        "Check your new address for a confirmation link. Your email changes once you click it.",
      );
    } catch (err) {
      setError(friendly(err));
    }
    setBusy(false);
  }

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-medium">Email address</p>
          <p className="text-muted-foreground mt-0.5 truncate text-sm">{user?.email}</p>
          <div className="mt-1.5">
            {user?.emailVerified ? (
              <Badge variant="secondary" className="gap-1">
                <ShieldCheck className="size-3" />
                Verified
              </Badge>
            ) : (
              <Badge variant="secondary" className="text-warning-foreground gap-1">
                Not verified
              </Badge>
            )}
          </div>
        </div>
        <div className="flex gap-2">
          {!user?.emailVerified ? (
            <Button variant="outline" size="sm" onClick={resendVerification} disabled={busy}>
              {busy ? <Loader2 className="animate-spin" /> : <Mail />}
              Resend
            </Button>
          ) : null}
          <Button variant="outline" size="sm" onClick={() => setChanging((v) => !v)}>
            Change
          </Button>
        </div>
      </div>

      {changing ? (
        <div className="mt-4 space-y-3 rounded-xl border p-4">
          <div className="space-y-2">
            <Label htmlFor="new-email">New email address</Label>
            <Input
              id="new-email"
              type="email"
              inputMode="email"
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
              placeholder="juan@example.com"
            />
          </div>

          {usesPassword ? (
            <div className="space-y-2">
              <Label htmlFor="email-password">Your current password</Label>
              <Input
                id="email-password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          ) : (
            <p className="text-muted-foreground text-sm">
              You&rsquo;ll be asked to sign in with Google once more to confirm.
            </p>
          )}

          {error ? (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          ) : null}

          <p className="text-muted-foreground text-xs leading-relaxed">
            We send a link to the new address first. Your email only changes
            once you click it, so a typo cannot lock you out.
          </p>

          <Button
            size="sm"
            onClick={submit}
            disabled={busy || !newEmail.trim() || (usesPassword && !password)}
          >
            {busy ? <Loader2 className="animate-spin" /> : <Check />}
            Send confirmation
          </Button>
        </div>
      ) : null}
    </div>
  );
}

function PasswordRow() {
  const [open, setOpen] = useState(false);
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    const user = auth.currentUser;
    if (!user?.email) return;

    if (next.length < 6) {
      setError("Please use a password of at least 6 characters.");
      return;
    }

    setBusy(true);
    setError(null);
    try {
      await reauthenticateWithCredential(
        user,
        EmailAuthProvider.credential(user.email, current),
      );
      await updatePassword(user, next);

      setOpen(false);
      setCurrent("");
      setNext("");
      toast.success("Password changed.");
    } catch (err) {
      setError(friendly(err));
    }
    setBusy(false);
  }

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-medium">Password</p>
          <p className="text-muted-foreground text-sm">
            Change it if you think someone else knows it.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => setOpen((v) => !v)}>
          <KeyRound />
          Change
        </Button>
      </div>

      {open ? (
        <div className="mt-4 space-y-3 rounded-xl border p-4">
          <div className="space-y-2">
            <Label htmlFor="current-password">Current password</Label>
            <Input
              id="current-password"
              type="password"
              autoComplete="current-password"
              value={current}
              onChange={(e) => setCurrent(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="next-password">New password</Label>
            <Input
              id="next-password"
              type="password"
              autoComplete="new-password"
              placeholder="At least 6 characters"
              value={next}
              onChange={(e) => setNext(e.target.value)}
            />
          </div>

          {error ? (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          ) : null}

          <Button size="sm" onClick={submit} disabled={busy || !current || !next}>
            {busy ? <Loader2 className="animate-spin" /> : <Check />}
            Update password
          </Button>
        </div>
      ) : null}
    </div>
  );
}

function GoogleOnlyNote() {
  return (
    <div>
      <p className="text-sm font-medium">Password</p>
      <p className="text-muted-foreground text-sm">
        You sign in with Google, so there is no Tuón password to change. Manage
        it in your Google Account.
      </p>
    </div>
  );
}

function SessionsRow() {
  const { authedFetch, signOut } = useAuth();
  const [busy, setBusy] = useState(false);

  async function revoke() {
    setBusy(true);
    try {
      const response = await authedFetch("/api/account/sessions", { method: "POST" });
      if (!response.ok) throw new Error("failed");

      toast.success("Signed out everywhere. Signing you out here too.");
      // This device's refresh token was revoked as well, so staying signed in
      // here would just fail on the next token refresh.
      await signOut();
    } catch {
      toast.error("Could not sign out your other devices. Please try again.");
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div className="min-w-0">
        <p className="text-sm font-medium">Sign out everywhere</p>
        <p className="text-muted-foreground text-sm">
          Ends every session, including any computer lab you forgot to sign out
          of. You will be signed out here too.
        </p>
      </div>
      <Button variant="outline" size="sm" onClick={revoke} disabled={busy}>
        {busy ? <Loader2 className="animate-spin" /> : <LogOut />}
        Sign out everywhere
      </Button>
    </div>
  );
}

function friendly(error: unknown): string {
  const code =
    error && typeof error === "object" && "code" in error
      ? String((error as { code?: unknown }).code)
      : "";

  switch (code) {
    case "auth/wrong-password":
    case "auth/invalid-credential":
      return "That password is not correct.";
    case "auth/email-already-in-use":
      return "Another account already uses that email address.";
    case "auth/invalid-email":
      return "That does not look like a valid email address.";
    case "auth/weak-password":
      return "Please use a password of at least 6 characters.";
    case "auth/requires-recent-login":
      return "Please sign in again, then retry.";
    case "auth/too-many-requests":
      return "Too many attempts. Please wait a moment and try again.";
    case "auth/popup-closed-by-user":
    case "auth/cancelled-popup-request":
      return "Sign-in was cancelled.";
    default:
      return error instanceof Error ? error.message : "Something went wrong.";
  }
}
