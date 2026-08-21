"use client";

import { useRef } from "react";
import { motion, useInView } from "motion/react";

import {
  PaperCreature,
  type CreatureState,
} from "@/components/brand/paper-creature";
import { cn } from "@/lib/utils";

/**
 * Tala's appearances on the landing page.
 *
 * The rule these two components exist to enforce: she only shows up where her
 * STATE says something the copy is already saying. Asleep next to the section
 * about forgetting, reading next to the section about your curriculum,
 * celebrating at the last call to action. An owl dropped into a section for
 * decoration is the kind of thing that makes a page feel cheaper, not warmer,
 * so there are four of her on a ten-section page and each one is doing a job.
 *
 * Both are `aria-hidden` by default: she illustrates a point the adjacent text
 * already makes, so announcing her to a screen reader would only add noise.
 */

/**
 * Tala perched on a section's top border, as if the rule were a branch.
 *
 * Hidden below `md`. On a phone the columns collapse and there is no margin
 * for her to sit in without landing on the heading.
 */
export function TalaPerch({
  state = "idle",
  studying,
  className,
}: {
  state?: CreatureState;
  studying?: boolean;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-40px" });

  return (
    <motion.div
      ref={ref}
      aria-hidden="true"
      initial={{ opacity: 0, y: 10 }}
      animate={inView ? { opacity: 1, y: 0 } : undefined}
      transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
      className={cn(
        "pointer-events-none absolute hidden select-none md:block",
        className,
      )}
    >
      <PaperCreature state={state} studying={studying} className="size-full" />
    </motion.div>
  );
}

/** Tala beside a line of copy, captioned. */
export function TalaAside({
  state = "idle",
  studying,
  children,
  className,
}: {
  state?: CreatureState;
  studying?: boolean;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex items-center gap-4", className)} aria-hidden="true">
      <PaperCreature
        state={state}
        studying={studying}
        className="size-16 shrink-0 sm:size-20"
      />
      <p className="text-muted-foreground max-w-xs text-sm leading-relaxed">
        {children}
      </p>
    </div>
  );
}
