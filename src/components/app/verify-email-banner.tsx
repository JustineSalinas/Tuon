"use client";

import { useState } from "react";
import { MailCheck, X } from "lucide-react";
import { toast } from "sonner";

import { requestVerificationEmail } from "@/lib/email/request-verification";

import { auth } from "@/lib/firebase/client";
import { useAuth } from "@/components/providers/auth-provider";
import { useI18n } from "@/components/providers/i18n-provider";
import { Button } from "@/components/ui/button";

/**
 * Shown until the student confirms their address.
 *
 * Deliberately not a blocking modal: notes, review, and quizzes all work
 * unverified. Only AI generation is gated (server-side, in /api/generate),
 * because that is the part that costs money and the part a script would farm.
 */
export function VerifyEmailBanner() {
  const { user, refreshVerification } = useAuth();
  const { t } = useI18n();
  const [sending, setSending] = useState(false);
  const [checking, setChecking] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  // Google accounts arrive already verified.
  if (!user || user.emailVerified || dismissed) return null;

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
    // When it worked the banner unmounts on its own — `user.emailVerified`
    // is now true — so there is nothing to announce.
  }

  return (
    // `flex-1` on the message with the buttons beside it squeezed the text
    // into a six-word column on a phone — "Confirm / your email / to start /
    // generating / study / sets." The message takes the full width on small
    // screens and the buttons drop underneath it.
    <div className="bg-warning/12 border-warning/30 flex flex-col gap-2 border-b px-4 py-2.5 text-sm sm:flex-row sm:flex-wrap sm:items-center sm:gap-x-3 md:px-8">
      <p className="flex min-w-0 flex-1 items-start gap-2 sm:items-center">
        <MailCheck className="text-warning-text mt-0.5 size-4 shrink-0 sm:mt-0" />
        <span>
          {t.banners.confirmEmail}{" "}
          <span className="text-muted-foreground">
            {t.banners.confirmEmailRest}
          </span>
        </span>
      </p>
      <div className="flex items-center gap-1">
        <Button
          variant="outline"
          size="sm"
          onClick={recheck}
          disabled={checking}
        >
          {checking ? t.banners.checking : t.banners.confirmedIt}
        </Button>
        <Button variant="ghost" size="sm" onClick={resend} disabled={sending}>
          {sending ? t.banners.sending : t.banners.resend}
        </Button>
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={() => setDismissed(true)}
          aria-label={t.banners.dismiss}
        >
          <X />
        </Button>
      </div>
    </div>
  );
}
