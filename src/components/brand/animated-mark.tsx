"use client";

import { motion, useReducedMotion } from "motion/react";

import { cn } from "@/lib/utils";

/**
 * The Tuón mark, in motion.
 *
 * The mark is an owl whose eyes are the original point-of-focus motif, so its
 * honest motions are an owl's: the outline drawing itself and the eyes opening
 * ("draw"), or a slow blink ("focusing"). The previous version rotated the
 * ring, which was right for a ring and would be faintly horrifying on a head.
 *
 * Everything animated here is `stroke-dashoffset`, `scale` or `opacity` —
 * compositor-friendly, so it stays cheap on the mid-range Android this app is
 * built for.
 */

/** Rough length of the head outline, for the draw-on effect. */
const OUTLINE_LENGTH = 76;

export type MarkMotion =
  /** Draws itself and opens its eyes once, then rests. Heroes, auth screens. */
  | "draw"
  /** Blinks slowly and forever. The loading state for generation. */
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

  const outline = {
    stroke: "currentColor",
    strokeWidth: 2,
    strokeLinecap: "round" as const,
    opacity: 0.45,
  };

  /** The eyes: pop open on draw, blink on a loop while focusing. */
  const eye = (delay: number) => {
    if (still) return { initial: false as const, animate: { scaleY: 1, opacity: 1 } };
    if (mode === "focusing") {
      return {
        initial: false as const,
        animate: { scaleY: [1, 1, 0.12, 1], opacity: 1 },
        transition: {
          duration: 2.8,
          repeat: Infinity,
          times: [0, 0.82, 0.88, 0.94],
          ease: "easeInOut" as const,
          delay,
        },
      };
    }
    return {
      initial: { scale: 0.2, opacity: 0 },
      animate: { scale: 1, opacity: 1 },
      transition: {
        duration: 0.45,
        // Lands just after the outline closes: the shape arrives, then it
        // looks at you.
        delay: 0.4 + delay,
        ease: [0.22, 1, 0.36, 1] as const,
      },
    };
  };

  return (
    <svg
      viewBox="0 0 32 32"
      fill="none"
      aria-hidden="true"
      className={cn("size-7", className)}
    >
      <motion.path
        d="M4.5 17.5 A11.5 11.5 0 0 1 27.5 17.5"
        {...outline}
        initial={still || mode !== "draw" ? false : { strokeDashoffset: OUTLINE_LENGTH }}
        animate={{ strokeDashoffset: 0 }}
        strokeDasharray={mode === "draw" && !still ? OUTLINE_LENGTH : undefined}
        transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
      />
      <motion.path
        d="M4.5 17.5 A11.5 11.5 0 0 0 27.5 17.5"
        {...outline}
        initial={still || mode !== "draw" ? false : { strokeDashoffset: OUTLINE_LENGTH }}
        animate={{ strokeDashoffset: 0 }}
        strokeDasharray={mode === "draw" && !still ? OUTLINE_LENGTH : undefined}
        transition={{ duration: 0.55, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
      />
      <motion.path
        d="M8.5 8.5 L6.5 4.5 M23.5 8.5 L25.5 4.5"
        {...outline}
        initial={still || mode !== "draw" ? false : { opacity: 0 }}
        animate={{ opacity: 0.45 }}
        transition={{ duration: 0.3, delay: 0.35 }}
      />

      <motion.circle
        cx="12"
        cy="15"
        r="3.6"
        fill="currentColor"
        style={{ transformOrigin: "12px 15px" }}
        {...eye(0)}
      />
      <motion.circle
        cx="20"
        cy="15"
        r="3.6"
        fill="currentColor"
        style={{ transformOrigin: "20px 15px" }}
        // A hair behind the other eye — a perfectly synchronised blink reads
        // as a shutter, a staggered one reads as alive.
        {...eye(0.06)}
      />

      <motion.path
        d="M16 19.5 L14.6 21.8 H17.4 Z"
        fill="currentColor"
        opacity={0.55}
        initial={still || mode !== "draw" ? false : { opacity: 0 }}
        animate={{ opacity: 0.55 }}
        transition={{ duration: 0.3, delay: 0.55 }}
      />
    </svg>
  );
}

/**
 * The mark as a loading indicator.
 *
 * Used instead of a generic spinner wherever the wait is ours rather than the
 * network's — generating a study set, most of all. A spinner says "something
 * is happening"; a blinking owl says "Tuón is reading it".
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
