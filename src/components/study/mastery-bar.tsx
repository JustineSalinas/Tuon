"use client";

/**
 * Mastery, on the study set it belongs to.
 *
 * Leads with the level rather than the percentage. "Confident" is a claim a
 * student can check against how it feels; "72%" is a number that invites them
 * to grind it to 100 — and grinding a percentage is not the same activity as
 * learning, which is why the sentence underneath names the specific cards
 * holding it back instead of the points still missing.
 *
 * Every number here is derived from the scheduler's own state, so it can never
 * disagree with the review queue.
 */

import {
  MASTERY_HINTS,
  MASTERY_LABELS,
  type MasteryReport,
} from "@/lib/stats/mastery";
import { cn } from "@/lib/utils";

const LEVEL_STYLES: Record<MasteryReport["level"], { bar: string; text: string }> = {
  untouched: { bar: "bg-muted-foreground/30", text: "text-muted-foreground" },
  learning: { bar: "bg-warning/70", text: "text-warning-foreground" },
  familiar: { bar: "bg-warning", text: "text-warning-foreground" },
  confident: { bar: "bg-primary", text: "text-primary" },
  mastered: { bar: "bg-success", text: "text-success" },
};

export function MasteryBar({ report }: { report: MasteryReport }) {
  // A set with no cards has nothing to be a share of.
  if (report.percent === null) return null;

  const style = LEVEL_STYLES[report.level];

  return (
    <div className="bg-card rounded-2xl border p-5">
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <div className="flex items-baseline gap-2">
          <h2 className={cn("font-display text-lg font-semibold tracking-tight", style.text)}>
            {MASTERY_LABELS[report.level]}
          </h2>
          <span className="text-muted-foreground text-sm">
            {MASTERY_HINTS[report.level]}
          </span>
        </div>
        <span className="text-muted-foreground text-sm tabular-nums">
          {report.percent}%
        </span>
      </div>

      <div
        className="bg-muted mt-3 h-2 overflow-hidden rounded-full"
        role="progressbar"
        aria-valuenow={report.percent}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label="Mastery of this set"
      >
        <div
          className={cn("h-full rounded-full transition-[width] duration-500", style.bar)}
          style={{ width: `${report.percent}%` }}
        />
      </div>

      {report.nextStep ? (
        <p className="text-muted-foreground mt-3 text-sm leading-relaxed">
          {report.nextStep}
        </p>
      ) : null}

      <p className="text-muted-foreground mt-2 text-xs leading-relaxed">
        Read from how far ahead each card is scheduled and how often you have
        missed it — the same figures the review queue runs on, so this can never
        disagree with it.
      </p>
    </div>
  );
}
