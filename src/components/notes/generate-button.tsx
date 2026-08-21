"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import { Sparkles } from "lucide-react";
import { toast } from "sonner";

import { useAuth } from "@/components/providers/auth-provider";
import { AnimatedMark } from "@/components/brand/animated-mark";
import { useQuota } from "@/components/app/quota-indicator";
import { formatResetDate } from "@/lib/quota";
import { PLANS, UPGRADE_TARGET } from "@/lib/ai/config";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";

/** Shown in sequence while the request is in flight. */
const PROGRESS_MESSAGES = [
  "Reading your note…",
  "Picking out what matters…",
  "Writing flashcards…",
  "Building your practice quiz…",
  "Almost there…",
];

export function GenerateStudySetButton({
  noteId,
  disabled,
  hint,
  onBeforeGenerate,
  existingSetId,
}: {
  noteId: string | null;
  disabled?: boolean;
  hint?: string | null;
  onBeforeGenerate?: () => Promise<void>;
  /**
   * A set already generated from this note. Present means the student is
   * revising a note they have generated before, which during a term is the
   * normal case rather than the exception.
   */
  existingSetId?: string | null;
}) {
  const router = useRouter();
  const { authedFetch, refreshVerification } = useAuth();
  const quota = useQuota();

  const [generating, setGenerating] = useState(false);
  const [messageIndex, setMessageIndex] = useState(0);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!generating) return;
    const interval = setInterval(() => {
      setMessageIndex((i) => Math.min(i + 1, PROGRESS_MESSAGES.length - 1));
    }, 2600);
    return () => clearInterval(interval);
  }, [generating]);

  const exhausted = quota?.exhausted ?? false;

  async function handleGenerate(intoExisting: boolean) {
    if (!noteId || generating) return;
    setError(null);
    setMessageIndex(0);
    setGenerating(true);

    try {
      // Flush any pending autosave so the server reads the current text.
      await onBeforeGenerate?.();

      const body = JSON.stringify(
        intoExisting && existingSetId ? { noteId, studySetId: existingSetId } : { noteId },
      );

      let response = await authedFetch("/api/generate", {
        method: "POST",
        body,
      });

      // `email_verified` is a claim baked into the ID token, and that token is
      // cached for up to an hour. Someone who just clicked the link in their
      // inbox is verified with Firebase but still carries a token that says
      // otherwise. Refresh once and retry rather than telling them to go and
      // do the thing they already did.
      if (response.status === 403) {
        const stale = (await response.clone().json().catch(() => ({}))) as {
          code?: string;
        };
        if (stale.code === "EMAIL_NOT_VERIFIED" && (await refreshVerification())) {
          response = await authedFetch("/api/generate", { method: "POST", body });
        }
      }

      const payload = (await response.json()) as {
        studySetId?: string;
        merged?: boolean;
        addedCount?: number;
        keptCount?: number;
        flashcardCount?: number;
        quizQuestionCount?: number;
        error?: string;
      };

      if (!response.ok || !payload.studySetId) {
        setError(payload.error ?? "Generation failed. Please try again.");
        setGenerating(false);
        return;
      }

      if (payload.merged) {
        // Say what changed. "Done" would leave the student wondering whether
        // their review history survived — which is the whole worry here.
        toast.success(
          payload.addedCount
            ? `${payload.addedCount} new card${payload.addedCount === 1 ? "" : "s"} added. Your ${payload.keptCount} existing card${payload.keptCount === 1 ? "" : "s"} kept their progress.`
            : "Nothing new to add — your note has not changed enough since last time.",
        );
      } else {
        toast.success(
          `${payload.flashcardCount} flashcards and ${payload.quizQuestionCount} quiz questions ready.`,
        );
      }
      router.push(`/app/sets/${payload.studySetId}`);
    } catch {
      setError("Could not reach the server. Check your connection and try again.");
      setGenerating(false);
    }
  }

  if (exhausted && !generating) {
    return (
      <Alert>
        <Sparkles className="size-4" />
        <AlertDescription className="flex flex-wrap items-center gap-x-2">
          <span>
            That&rsquo;s all {quota?.limit} study sets for this month
            {quota?.resetsAt ? ` — they reset ${formatResetDate(quota.resetsAt)}` : ""}.
            You can still write notes and make flashcards by hand.
          </span>
          {quota?.plan === "free" ? (
            <Link
              href="/app/settings"
              className="text-primary font-medium underline underline-offset-4"
            >
              Get {PLANS[UPGRADE_TARGET].monthlyGenerations}/month for ₱
              {PLANS[UPGRADE_TARGET].phpMonthly}
            </Link>
          ) : null}
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-3">
      {error ? (
        <Alert variant="destructive">
          <AlertDescription className="flex flex-wrap items-center gap-x-2">
            <span>{error}</span>
            <button
              type="button"
              onClick={() => void handleGenerate(Boolean(existingSetId))}
              className="font-medium underline underline-offset-4"
            >
              Try again
            </button>
          </AlertDescription>
        </Alert>
      ) : null}

      <div className="flex flex-wrap items-center gap-3">
        {/* Once a note has a set, updating it is the action a student wants
            almost every time — they added this week's lecture and want the
            same reviewer to cover it. Making a second set is still possible,
            but it stops being the default. */}
        <Button
          size="lg"
          onClick={() => void handleGenerate(Boolean(existingSetId))}
          disabled={disabled || generating}
          className="min-w-52"
        >
          {generating ? (
            <AnimatedMark motion="focusing" className="size-4" />
          ) : (
            <Sparkles />
          )}
          {generating
            ? "Generating…"
            : existingSetId
              ? "Update the study set"
              : "Generate study set"}
        </Button>

        {existingSetId && !generating ? (
          <Button
            variant="ghost"
            onClick={() => void handleGenerate(false)}
            disabled={disabled}
          >
            Make a separate set
          </Button>
        ) : null}

        <div className="text-muted-foreground min-h-5 flex-1 text-sm">
          <AnimatePresence mode="wait">
            {generating ? (
              <motion.span
                key={messageIndex}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ duration: 0.2 }}
                className="block"
              >
                {PROGRESS_MESSAGES[messageIndex]}
              </motion.span>
            ) : hint ? (
              <motion.span
                key="hint"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="block"
              >
                {hint}
              </motion.span>
            ) : quota ? (
              <motion.span
                key="quota"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="block tabular-nums"
              >
                {quota.remaining} of {quota.limit} study sets left this month
              </motion.span>
            ) : null}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
