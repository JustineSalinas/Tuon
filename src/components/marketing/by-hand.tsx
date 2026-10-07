"use client";

import { ArrowRight } from "lucide-react";

import { useI18n } from "@/components/providers/i18n-provider";

/**
 * The honest comparison: making a reviewer by hand versus generating one.
 *
 * Deliberately compares against DOING IT YOURSELF rather than a named rival.
 * Handwriting a reviewer is what this audience actually does, it is what Tuón
 * actually replaces, and every row can be defended, which is not true of a
 * competitor feature grid drawn up by the side that wrote it.
 *
 * Built as a sequence rather than a scorecard: no header row, no X/check
 * columns scoring Tuón against an opponent. Each row is one habit, read
 * left to right as it actually changes, with the old way struck through
 * rather than marked wrong.
 *
 * "Eleven seconds" is a measured figure from a real generation, not a
 * marketing round number. If the model or prompt changes enough to move it,
 * change it here.
 */

export function ByHand() {
  const { t } = useI18n();
  const rows = t.marketing.versus.rows;

  return (
    <div className="mt-12 flex flex-col">
      {rows.map((row, index) => (
        <div
          key={row.label}
          className={
            "grid gap-x-6 gap-y-2 py-5 sm:grid-cols-[1fr_auto_1fr] sm:items-center " +
            (index > 0 ? "border-t" : "")
          }
        >
          <div>
            <p className="text-muted-foreground text-xs font-medium tracking-widest uppercase">
              {row.label}
            </p>
            <p className="text-muted-foreground/70 decoration-muted-foreground/40 mt-1.5 text-sm line-through">
              {row.byHand}
            </p>
          </div>

          <ArrowRight className="text-muted-foreground/50 hidden size-4 sm:block" />

          <p className="font-display text-base font-medium sm:text-lg">{row.tuon}</p>
        </div>
      ))}
    </div>
  );
}
