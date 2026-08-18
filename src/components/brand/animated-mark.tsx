"use client";

import { motion, useReducedMotion } from "motion/react";

import { cn } from "@/lib/utils";

/**
 * The Tuón mark, in motion.
 *
 * The mark is a dashed ring around a filled dot — an eye, or a point of focus.
 * Its only honest motion is the one its own meaning implies: the ring closing
 * and the dot settling. Attention arriving. Anything else (a bounce, a spin
 * for its own sake) would be decoration bolted onto a logo that already means
 * something.
 *
 * Both variants animate `stroke-dashoffset`, `rotate`, `scale`, and `opacity`
 * only — all compositor-friendly, so this stays cheap on the mid-range Android
 * this app is built for.
 */

const CIRCUMFERENCE = 2 * Math.PI * 13;

export type MarkMotion =
  /** Draws itself closed once, then rests. For heroes and auth screens. */
  | "draw"
  /** Turns slowly and forever. The loading state for generation. */
  | "focusing"
  /** No motion at all. */
  | "still";

export function AnimatedMark({
  motion: mode = "draw",
  className,
}: {
  motion?: MarkMotion;
  className?: string;
}) {
  const reduceMotion = useReducedMotion();
  const still = mode === "still" || reduceMotion;

  return (
    <svg
      viewBox="0 0 32 32"
      fill="none"
      aria-hidden="true"
      className={cn("size-7", className)}
    >
      <motion.circle
        cx="16"
        cy="16"
        r="13"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        // The gap in the ring is part of the identity, not an artefact of the
        // animation, so the resting state keeps it.
        strokeDasharray="60 22"
        opacity={0.45}
        style={{ transformOrigin: "16px 16px" }}
        initial={still ? false : mode === "draw" ? { strokeDashoffset: CIRCUMFERENCE } : false}
        animate={
          still
            ? { strokeDashoffset: 0, rotate: 0 }
            : mode === "focusing"
              ? { rotate: 360 }
              : { strokeDashoffset: 0 }
        }
        transition={
          mode === "focusing"
            ? { duration: 2.6, repeat: Infinity, ease: "linear" }
            : { duration: 0.9, ease: [0.22, 1, 0.36, 1] }
        }
      />
      <motion.circle
        cx="16"
        cy="16"
        r="5.5"
        fill="currentColor"
        style={{ transformOrigin: "16px 16px" }}
        initial={still ? false : { scale: 0.2, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={
          still
            ? { duration: 0 }
            : // Lands just after the ring closes: the ring is the attention
              // arriving, the dot is it settling.
              { duration: 0.5, delay: mode === "draw" ? 0.42 : 0, ease: [0.22, 1, 0.36, 1] }
        }
      />
    </svg>
  );
}

/**
 * The mark as a loading indicator.
 *
 * Used instead of a generic spinner wherever the wait is ours rather than the
 * network's — generating a study set, most of all. A spinner says "something
 * is happening"; the mark says "Tuón is doing it".
 */
export function MarkSpinner({
  className,
  label = "Working",
}: {
  className?: string;
  label?: string;
}) {
  return (
    <span role="status" className={cn("inline-flex items-center", className)}>
      <AnimatedMark motion="focusing" className="text-primary size-6" />
      <span className="sr-only">{label}</span>
    </span>
  );
}
