"use client";

import { Check, X } from "lucide-react";

import { useI18n } from "@/components/providers/i18n-provider";

/**
 * The honest comparison: making a reviewer by hand versus generating one.
 *
 * Deliberately compares against DOING IT YOURSELF rather than a named rival.
 * Handwriting a reviewer is what this audience actually does, it is what Tuón
 * actually replaces, and every row can be defended — which is not true of a
 * competitor feature grid drawn up by the side that wrote it.
 *
 * "Eleven seconds" is a measured figure from a real generation, not a
 * marketing round number. If the model or prompt changes enough to move it,
 * change it here.
 */

export function ByHand() {
  const { t } = useI18n();
  const rows = t.marketing.versus.rows;

  return (
    <div className="mt-12 overflow-hidden rounded-2xl border">
      {/* Header row — hidden on phones, where each row becomes its own block. */}
      <div className="bg-secondary/60 hidden border-b sm:grid sm:grid-cols-[1.1fr_1fr_1fr]">
        <div className="px-5 py-3" />
        <div className="text-muted-foreground px-5 py-3 text-xs font-medium tracking-widest uppercase">
          {t.marketing.versus.byHand}
        </div>
        <div className="text-primary px-5 py-3 text-xs font-medium tracking-widest uppercase">
          {t.marketing.versus.withTuon}
        </div>
      </div>

      {rows.map((row, index) => (
        <div
          key={row.label}
          className={
            "grid gap-x-5 gap-y-2 px-5 py-4 sm:grid-cols-[1.1fr_1fr_1fr] sm:items-center " +
            (index > 0 ? "border-t" : "")
          }
        >
          <div className="text-sm font-medium">{row.label}</div>

          <div className="text-muted-foreground flex items-start gap-2.5 text-sm">
            <X className="mt-0.5 size-4 shrink-0" strokeWidth={2.5} />
            <span>
              <span className="text-muted-foreground/80 mr-1.5 text-xs sm:hidden">
                {t.marketing.versus.byHand} —
              </span>
              {row.byHand}
            </span>
          </div>

          <div className="flex items-start gap-2.5 text-sm">
            <Check className="text-primary mt-0.5 size-4 shrink-0" strokeWidth={3} />
            <span>
              <span className="text-muted-foreground mr-1.5 text-xs sm:hidden">
                {t.marketing.versus.withTuon} —
              </span>
              {row.tuon}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}
