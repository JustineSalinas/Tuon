"use client";

import { motion, useReducedMotion } from "motion/react";
import { ArrowDown, FileText } from "lucide-react";

/**
 * The product, above the fold.
 *
 * The headline makes a claim about forgetting; this shows what the visitor
 * actually gets in exchange — a real note going in, a real card coming out,
 * with the schedule already set. Landing pages that only describe the loop ask
 * the visitor to take it on faith, and the demo further down is too far to
 * rescue that.
 *
 * Everything here is a static mock. The live version is `<TryIt />` further
 * down the page; this one has to paint instantly and never block the hero.
 */
export function HeroPreview() {
  const reduceMotion = useReducedMotion();

  const rise = (delay: number) =>
    reduceMotion
      ? undefined
      : {
          initial: { opacity: 0, y: 12 },
          animate: { opacity: 1, y: 0 },
          transition: { duration: 0.5, delay, ease: [0.22, 1, 0.36, 1] as const },
        };

  return (
    <div className="flex w-full flex-col gap-3.5">
      {/* The note going in */}
      <motion.div
        {...rise(0.15)}
        className="border-border bg-card rounded-2xl border p-4"
      >
        <div className="mb-2.5 flex items-center gap-2">
          <FileText className="text-muted-foreground size-3.5" />
          <span className="text-muted-foreground text-xs font-medium">
            Photosynthesis — Gen Bio 1
          </span>
          <span className="bg-secondary text-secondary-foreground ml-auto flex h-5 items-center rounded-full px-2 text-[11px] font-medium">
            STEM
          </span>
        </div>
        <p className="text-muted-foreground text-xs leading-relaxed">
          Light-dependent reactions occur in the thylakoid membrane. Water is
          split, releasing O₂, and the energy is stored as ATP and NADPH…
        </p>
      </motion.div>

      <motion.div {...rise(0.3)} className="flex items-center gap-2.5 pl-1">
        <ArrowDown className="text-primary size-4" />
        <span className="text-primary text-xs font-medium">
          12 flashcards · 5 quiz questions · 11 seconds
        </span>
      </motion.div>

      {/* What comes out */}
      <motion.div
        {...rise(0.45)}
        className="border-border bg-card rounded-2xl border p-5 shadow-[0_1px_2px_rgba(31,27,24,0.05),0_18px_40px_-28px_rgba(31,27,24,0.35)]"
      >
        <div className="mb-4 flex items-center justify-between">
          <span className="text-muted-foreground text-[11px] font-medium tracking-widest uppercase">
            Card 3 of 12
          </span>
          <div className="flex gap-[3px]" aria-hidden="true">
            {[0, 1, 2, 3, 4].map((i) => (
              <span
                key={i}
                className={
                  "h-[3px] w-[22px] rounded-sm " +
                  (i < 3 ? "bg-primary" : "bg-border")
                }
              />
            ))}
          </div>
        </div>

        <p className="font-display text-lg leading-snug font-semibold tracking-tight">
          Where do the light-dependent reactions take place?
        </p>

        <div className="mt-4 border-t border-dashed pt-4">
          <p className="text-muted-foreground text-sm leading-relaxed">
            In the thylakoid membrane of the chloroplast.
          </p>
        </div>

        <div className="mt-5 grid grid-cols-4 gap-1.5">
          {[
            { label: "Again", good: false },
            { label: "Hard", good: false },
            { label: "Good", good: true },
            { label: "Easy", good: false },
          ].map((b) => (
            <div
              key={b.label}
              className={
                "grid h-9 place-items-center rounded-[10px] text-xs font-medium " +
                (b.good
                  ? "bg-success text-success-foreground"
                  : "border-border text-muted-foreground border")
              }
            >
              {b.label}
            </div>
          ))}
        </div>

        <p className="text-muted-foreground mt-3 text-xs">Next review in 6 days</p>
      </motion.div>
    </div>
  );
}
