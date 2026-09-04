"use client";

import { useState } from "react";
import {
  EmailAuthProvider,
  GoogleAuthProvider,
  reauthenticateWithCredential,
  reauthenticateWithPopup,
  updatePassword,
  verifyBeforeUpdateEmail,
} from "firebase/auth";
import { Check, KeyRound, Loader2, LogOut, Mail, ShieldCheck } from "lucide-react";
import { toast } from "sonner";

import { requestVerificationEmail } from "@/lib/email/request-verification";

import { auth } from "@/lib/firebase/client";
import { useAuth } from "@/components/providers/auth-provider";
import { useI18n } from "@/components/providers/i18n-provider";
import type { Messages } from "@/lib/i18n/en";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
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
  const { t } = useI18n();
  if (!user) return null;

  const usesPassword = user.providerData.some((p) => p.providerId === "password");

  return (
    <section className="mt-8">
      <h2 className="font-display text-lg font-semibold tracking-tight">
        {t.security.title}
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
  const { t } = useI18n();
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
    const outcome = await requestVerificationEmail(auth.currentUser);
    setBusy(false);
    if (outcome === "failed") {
      toast.error(t.security.verificationFailed);
    } else if (outcome === "already-verified") {
      toast.success(t.security.alreadyVerified);
    } else {
      toast.success(t.security.verificationSent);
    }
  }

  async function submit() {
    const current = auth.currentUser;
    if (!current) return;
    setBusy(true);
    setError(null);
    try {
      if (usesPassword) {
        if (!current.email) throw new Error(t.security.noEmail);
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
      toast.success(t.security.confirmationSent);
    } catch (err) {
      setError(friendly(err, t));
    }
    setBusy(false);
  }

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-medium">{t.security.emailAddress}</p>
          <p className="text-muted-foreground mt-0.5 truncate text-sm">{user?.email}</p>
          <div className="mt-1.5">
            {user?.emailVerified ? (
              <Badge variant="secondary" className="gap-1">
                <ShieldCheck className="size-3" />
                {t.security.verified}
              </Badge>
            ) : (
              <Badge variant="secondary" className="text-warning-text gap-1">
                {t.security.notVerified}
              </Badge>
            )}
          </div>
        </div>
        <div className="flex gap-2">
          {!user?.emailVerified ? (
            <Button variant="outline" size="sm" onClick={resendVerification} disabled={busy}>
              {busy ? <Loader2 className="animate-spin" /> : <Mail />}
              {t.security.resend}
            </Button>
          ) : null}
          <Button variant="outline" size="sm" onClick={() => setChanging((v) => !v)}>
            {t.security.change}
          </Button>
        </div>
      </div>

      {changing ? (
        <div className="mt-4 space-y-3 rounded-xl border p-4">
          <div className="space-y-2">
            <Label htmlFor="new-email">{t.security.newEmail}</Label>
            <Input
              id="new-email"
              type="email"
              inputMode="email"
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
              placeholder={t.security.emailPlaceholder}
            />
          </div>

          {usesPassword ? (
            <div className="space-y-2">
              <Label htmlFor="email-password">{t.security.currentPassword}</Label>
              <PasswordInput
                id="email-password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          ) : (
            <p className="text-muted-foreground text-sm">
              {t.security.googleReauth}
            </p>
          )}

          {error ? (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          ) : null}

          <p className="text-muted-foreground text-xs leading-relaxed">
            {t.security.emailChangeNote}
          </p>

          <Button
            size="sm"
            onClick={submit}
            disabled={busy || !newEmail.trim() || (usesPassword && !password)}
          >
            {busy ? <Loader2 className="animate-spin" /> : <Check />}
            {t.security.sendConfirmation}
          </Button>
        </div>
      ) : null}
    </div>
  );
}

function PasswordRow() {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    const user = auth.currentUser;
    if (!user?.email) return;

    if (next.length < 6) {
      setError(t.security.error.weakPassword);
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
      toast.success(t.security.passwordChanged);
    } catch (err) {
      setError(friendly(err, t));
    }
    setBusy(false);
  }

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-medium">{t.security.password}</p>
          <p className="text-muted-foreground text-sm">
            {t.security.passwordHint}
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => setOpen((v) => !v)}>
          <KeyRound />
          {t.security.change}
        </Button>
      </div>

      {open ? (
        <div className="mt-4 space-y-3 rounded-xl border p-4">
          <div className="space-y-2">
            <Label htmlFor="current-password">{t.security.currentPasswordLabel}</Label>
            <PasswordInput
              id="current-password"
              autoComplete="current-password"
              value={current}
              onChange={(e) => setCurrent(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="next-password">{t.security.newPassword}</Label>
            <PasswordInput
              id="next-password"
              autoComplete="new-password"
              placeholder={t.security.passwordPlaceholder}
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
            {t.security.updatePassword}
          </Button>
        </div>
      ) : null}
    </div>
  );
}

function GoogleOnlyNote() {
  const { t } = useI18n();

  return (
    <div>
      <p className="text-sm font-medium">{t.security.password}</p>
      <p className="text-muted-foreground text-sm">{t.security.googleOnly}</p>
    </div>
  );
}

function SessionsRow() {
  const { authedFetch, signOut } = useAuth();
  const { t } = useI18n();
  const [busy, setBusy] = useState(false);

  async function revoke() {
    setBusy(true);
    try {
      const response = await authedFetch("/api/account/sessions", { method: "POST" });
      if (!response.ok) throw new Error("failed");

      toast.success(t.security.signedOutEverywhere);
      // This device's refresh token was revoked as well, so staying signed in
      // here would just fail on the next token refresh.
      await signOut();
    } catch {
      toast.error(t.security.signOutFailed);
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div className="min-w-0">
        <p className="text-sm font-medium">{t.security.signOutEverywhere}</p>
        <p className="text-muted-foreground text-sm">
          {t.security.signOutEverywhereHint}
        </p>
      </div>
      <Button variant="outline" size="sm" onClick={revoke} disabled={busy}>
        {busy ? <Loader2 className="animate-spin" /> : <LogOut />}
        {t.security.signOutEverywhere}
      </Button>
    </div>
  );
}

/**
 * A Firebase auth code, said in the reader\'s language.
 *
 * Re-authentication has its own wording rather than reusing the sign-in
 * form\'s: "that email and password do not match an account" is the right
 * thing to say at a login screen and the wrong thing to say to someone who is
 * already signed in and is being asked to prove it.
 */
function friendly(error: unknown, t: Messages): string {
  const code =
    error && typeof error === "object" && "code" in error
      ? String((error as { code?: unknown }).code)
      : "";

  switch (code) {
    case "auth/wrong-password":
    case "auth/invalid-credential":
      return t.security.error.wrongPassword;
    case "auth/email-already-in-use":
      return t.security.error.emailInUse;
    case "auth/invalid-email":
      return t.security.error.invalidEmail;
    case "auth/weak-password":
      return t.security.error.weakPassword;
    case "auth/requires-recent-login":
      return t.security.error.recentLogin;
    case "auth/too-many-requests":
      return t.security.error.tooManyRequests;
    case "auth/popup-closed-by-user":
    case "auth/cancelled-popup-request":
      return t.security.error.cancelled;
    default:
      return error instanceof Error ? error.message : t.security.error.unknown;
  }
}
