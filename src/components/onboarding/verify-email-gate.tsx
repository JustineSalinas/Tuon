"use client";

import { useState } from "react";
import { MailCheck } from "lucide-react";
import { toast } from "sonner";

import { auth } from "@/lib/firebase/client";
import { requestVerificationEmail } from "@/lib/email/request-verification";
import { useAuth } from "@/components/providers/auth-provider";
import { useI18n } from "@/components/providers/i18n-provider";
import { PaperCreature } from "@/components/brand/paper-creature";
import { Wordmark } from "@/components/brand/logo";
import { Button } from "@/components/ui/button";

/**
 * Blocks onboarding until the student's email is confirmed.
 *
 * `VerifyEmailBanner` deliberately does NOT block anything — notes, review,
 * and quizzes all work unverified, and only generation (the one thing that
 * costs money) is gated. This screen is the one deliberate exception to
 * that: before onboarding even runs, there is no study content to protect
 * yet, nothing for an unverified visit to cost, and no reason not to ask
 * for the one proof — a real inbox — that the rest of the product already
 * leans on to keep account-farming expensive. A Google sign-in arrives
 * already verified and never sees this screen at all.
 */
export function VerifyEmailGate({ email }: { email: string | null }) {
  const { t } = useI18n();
  const { refreshVerification } = useAuth();
  const [sending, setSending] = useState(false);
  const [checking, setChecking] = useState(false);

  async function resend() {
    const current = auth.currentUser;
    if (!current) return;
    setSending(true);
    const outcome = await requestVerificationEmail(current);
    setSending(false);
    if (outcome === "failed") {
      toast.error(t.banners.sendFailed);
    } else if (outcome === "already-verified") {
      toast.success(t.banners.alreadyVerified);
    } else {
      toast.success(t.banners.sentTo(current.email ?? ""));
    }
  }

  async function recheck() {
    setChecking(true);
    const verified = await refreshVerification().catch(() => false);
    setChecking(false);
    if (!verified) {
      toast.error(t.banners.stillNotConfirmed);
    }
    // When it worked, the parent re-renders past this gate on its own —
    // `user.emailVerified` is now true — so there is nothing to announce.
  }

  return (
    <main className="bg-secondary/40 grid min-h-dvh place-items-center px-6 py-12">
      <div className="w-full max-w-sm text-center">
        <Wordmark className="mx-auto" />

        <div className="bg-card border-border/70 shadow-primary/5 mt-7 rounded-3xl border p-8 shadow-xl">
          <PaperCreature state="idle" className="mx-auto size-16" />

          <h1 className="font-display mt-5 text-2xl font-semibold tracking-tight text-balance">
            {t.onboarding.verifyEmailTitle}
          </h1>
          <p className="text-muted-foreground mt-2.5 text-sm leading-relaxed">
            {email
              ? t.onboarding.verifyEmailBody(email)
              : t.onboarding.verifyEmailBodyNoAddress}
          </p>

          <div className="mt-7 flex flex-col gap-2">
            <Button onClick={recheck} disabled={checking}>
              <MailCheck />
              {checking ? t.banners.checking : t.banners.confirmedIt}
            </Button>
            <Button variant="ghost" onClick={resend} disabled={sending}>
              {sending ? t.banners.sending : t.onboarding.resendVerification}
            </Button>
          </div>
        </div>
      </div>
    </main>
  );
}
