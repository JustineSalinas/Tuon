"use client";

import { CalendarClock } from "lucide-react";

import { useI18n } from "@/components/providers/i18n-provider";
import { daysUntil, parseExamDate } from "@/lib/srs/sm2";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

/**
 * The date a board or licensure exam is sat.
 *
 * This is the one field that changes how scheduling behaves, so it explains
 * itself rather than sitting there as an unexplained date picker. Plain SM-2
 * has no upper bound on the interval — after about six good recalls a card is
 * 100+ days out — so for someone sitting the CPALE in ninety days the cards
 * they know best are silently scheduled past the exam. Setting a date pulls
 * every review back inside the runway. See `clampToExam` in lib/srs/sm2.ts.
 */
export function ExamDateField({
  value,
  onChange,
  examName,
  id = "exam-date",
}: {
  value: string | null | undefined;
  onChange: (value: string | null) => void;
  /** What they are reviewing for, e.g. "CPALE". Used in the countdown line. */
  examName?: string | null;
  id?: string;
}) {
  const { t } = useI18n();
  const parsed = parseExamDate(value);
  const left = parsed ? daysUntil(parsed) : null;
  const subject = examName?.trim() || t.examDate.yourExam;

  // Today in the user's own timezone, so the picker cannot offer yesterday.
  const now = new Date();
  const today = [
    now.getFullYear(),
    String(now.getMonth() + 1).padStart(2, "0"),
    String(now.getDate()).padStart(2, "0"),
  ].join("-");

  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{t.examDate.label}</Label>
      <Input
        id={id}
        type="date"
        value={value ?? ""}
        min={today}
        onChange={(e) => onChange(e.target.value || null)}
        className="max-w-56"
      />
      {left !== null && left > 0 ? (
        <p className="text-primary flex items-center gap-1.5 text-sm font-medium">
          <CalendarClock className="size-4 shrink-0" />
          {t.examDate.countdown(subject, left)}
        </p>
      ) : left !== null ? (
        <p className="text-muted-foreground text-sm">
          {t.examDate.passed}
        </p>
      ) : (
        <p className="text-muted-foreground text-sm leading-relaxed">
          {t.examDate.hint}
        </p>
      )}
    </div>
  );
}
