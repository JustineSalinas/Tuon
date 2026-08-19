"use client";

import { Check, X } from "lucide-react";

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

const ROWS: { label: string; byHand: string; tuon: string }[] = [
  {
    label: "Turning a chapter into a reviewer",
    byHand: "An evening, and your handwriting gets worse",
    tuon: "About eleven seconds",
  },
  {
    label: "Knowing what to study tonight",
    byHand: "Whatever you feel least sure about",
    tuon: "The exact cards that are due",
  },
  {
    label: "The week after the exam",
    byHand: "Bond paper in the bin, and it is gone",
    tuon: "Still scheduled, still yours",
  },
  {
    label: "Finding that one topic again",
    byHand: "Flipping through a notebook",
    tuon: "Search, tags, and linked notes",
  },
  {
    label: "What it costs",
    byHand: "Pens, paper, photocopies",
    tuon: "Free for five study sets a month",
  },
];

export function ByHand() {
  return (
    <div className="mt-12 overflow-hidden rounded-2xl border">
      {/* Header row — hidden on phones, where each row becomes its own block. */}
      <div className="bg-secondary/60 hidden border-b sm:grid sm:grid-cols-[1.1fr_1fr_1fr]">
        <div className="px-5 py-3" />
        <div className="text-muted-foreground px-5 py-3 text-xs font-medium tracking-widest uppercase">
          By hand
        </div>
        <div className="text-primary px-5 py-3 text-xs font-medium tracking-widest uppercase">
          With Tuón
        </div>
      </div>

      {ROWS.map((row, index) => (
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
                By hand —
              </span>
              {row.byHand}
            </span>
          </div>

          <div className="flex items-start gap-2.5 text-sm">
            <Check className="text-primary mt-0.5 size-4 shrink-0" strokeWidth={3} />
            <span>
              <span className="text-muted-foreground mr-1.5 text-xs sm:hidden">
                With Tuón —
              </span>
              {row.tuon}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}
