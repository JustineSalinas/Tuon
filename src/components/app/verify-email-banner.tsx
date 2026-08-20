"use client";

import { useState } from "react";
import { sendEmailVerification } from "firebase/auth";
import { MailCheck, X } from "lucide-react";
import { toast } from "sonner";

import { auth } from "@/lib/firebase/client";
import { useAuth } from "@/components/providers/auth-provider";
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
  const [sending, setSending] = useState(false);
  const [checking, setChecking] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  // Google accounts arrive already verified.
  if (!user || user.emailVerified || dismissed) return null;

  async function resend() {
    const current = auth.currentUser;
    if (!current) return;
    setSending(true);
    try {
      await sendEmailVerification(current);
      toast.success(`Sent to ${current.email}. Check spam if it doesn't arrive.`);
    } catch {
      toast.error("Could not send just now. Try again in a minute.");
    }
    setSending(false);
  }

  async function recheck() {
    setChecking(true);
    const verified = await refreshVerification().catch(() => false);
    setChecking(false);
    if (!verified) {
      toast.error("Still not confirmed. Open the link in the email first.");
    }
    // When it worked the banner unmounts on its own — `user.emailVerified`
    // is now true — so there is nothing to announce.
  }

  return (
    <div className="bg-warning/12 border-warning/30 flex flex-wrap items-center gap-x-3 gap-y-2 border-b px-4 py-2.5 text-sm md:px-8">
      <MailCheck className="text-warning-foreground size-4 shrink-0" />
      <p className="min-w-0 flex-1">
        Confirm your email to start generating study sets.{" "}
        <span className="text-muted-foreground">
          Everything else works in the meantime.
        </span>
      </p>
      <div className="flex items-center gap-1">
        <Button variant="outline" size="sm" onClick={recheck} disabled={checking}>
          {checking ? "Checking…" : "I've confirmed it"}
        </Button>
        <Button variant="ghost" size="sm" onClick={resend} disabled={sending}>
          {sending ? "Sending…" : "Resend"}
        </Button>
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={() => setDismissed(true)}
          aria-label="Dismiss"
        >
          <X />
        </Button>
      </div>
    </div>
  );
}
