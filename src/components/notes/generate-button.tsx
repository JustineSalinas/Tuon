"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import { Loader2, Sparkles } from "lucide-react";
import { toast } from "sonner";

import { useAuth } from "@/components/providers/auth-provider";
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
}: {
  noteId: string | null;
  disabled?: boolean;
  hint?: string | null;
  onBeforeGenerate?: () => Promise<void>;
}) {
  const router = useRouter();
  const { authedFetch } = useAuth();
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

  async function handleGenerate() {
    if (!noteId || generating) return;
    setError(null);
    setMessageIndex(0);
    setGenerating(true);

    try {
      // Flush any pending autosave so the server reads the current text.
      await onBeforeGenerate?.();

      const response = await authedFetch("/api/generate", {
        method: "POST",
        body: JSON.stringify({ noteId }),
      });

      const payload = (await response.json()) as {
        studySetId?: string;
        flashcardCount?: number;
        quizQuestionCount?: number;
        error?: string;
      };

      if (!response.ok || !payload.studySetId) {
        setError(payload.error ?? "Generation failed. Please try again.");
        setGenerating(false);
        return;
      }

      toast.success(
        `${payload.flashcardCount} flashcards and ${payload.quizQuestionCount} quiz questions ready.`,
      );
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
              onClick={handleGenerate}
              className="font-medium underline underline-offset-4"
            >
              Try again
            </button>
          </AlertDescription>
        </Alert>
      ) : null}

      <div className="flex flex-wrap items-center gap-3">
        <Button
          size="lg"
          onClick={handleGenerate}
          disabled={disabled || generating}
          className="min-w-52"
        >
          {generating ? <Loader2 className="animate-spin" /> : <Sparkles />}
          {generating ? "Generating…" : "Generate study set"}
        </Button>

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
