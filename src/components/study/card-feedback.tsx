"use client";

import { useState } from "react";
import { doc, serverTimestamp, setDoc } from "firebase/firestore";
import { ThumbsDown } from "lucide-react";
import { toast } from "sonner";

import { db } from "@/lib/firebase/client";
import { useI18n } from "@/components/providers/i18n-provider";
import { cn } from "@/lib/utils";

/**
 * A quiet way to say "this card is wrong".
 *
 * The whole product rests on generated cards being good, and until now there
 * was no signal on that at all. The ease factor tells you which cards students
 * repeatedly fail, but it cannot separate a genuinely hard concept from a
 * badly written card — and those need opposite responses. This is the missing
 * half of that signal.
 *
 * Deliberately understated: no dialog, no "why?" form, no thank-you modal. A
 * student mid-review is doing something else, and a feedback flow that
 * interrupts recall is worse than no feedback. One tap, a quiet
 * acknowledgement, and the session continues.
 *
 * Written to the student's own subcollection rather than a shared queue so it
 * needs no extra rules surface and no moderation path. Reading them is a
 * collection-group query you run when tuning the prompt.
 */
export function CardFeedback({
  userId,
  studySetId,
  flashcardId,
  className,
}: {
  userId: string;
  studySetId: string;
  flashcardId: string;
  className?: string;
}) {
  const { t } = useI18n();
  const [flagged, setFlagged] = useState(false);
  const [saving, setSaving] = useState(false);

  async function flag() {
    if (flagged || saving) return;
    setSaving(true);
    // Optimistic: the value of this is that it costs the student nothing, so
    // it must not make them wait for a round trip mid-session.
    setFlagged(true);
    try {
      await setDoc(doc(db, "users", userId, "cardReports", flashcardId), {
        studySetId,
        flashcardId,
        reportedAt: serverTimestamp(),
      });
      toast.success(t.cardFeedback.thanks);
    } catch {
      setFlagged(false);
      toast.error(t.cardFeedback.failed);
    }
    setSaving(false);
  }

  return (
    <button
      type="button"
      onClick={() => void flag()}
      disabled={flagged || saving}
      aria-label={flagged ? t.cardFeedback.reported : t.cardFeedback.report}
      aria-pressed={flagged}
      className={cn(
        "grid size-8 place-items-center rounded-lg transition-colors",
        "focus-visible:ring-ring focus-visible:ring-[3px] focus-visible:outline-none",
        flagged
          ? "text-primary"
          : "text-muted-foreground/50 hover:text-muted-foreground hover:bg-muted",
        className,
      )}
      title={
        flagged ? t.cardFeedback.reportedShort : t.cardFeedback.somethingWrong
      }
    >
      <ThumbsDown className="size-4" aria-hidden="true" />
    </button>
  );
}
