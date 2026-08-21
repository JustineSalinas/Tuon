"use client";

import { motion, useReducedMotion } from "motion/react";

import { cn } from "@/lib/utils";

/**
 * The Tuón mark, in motion.
 *
 * The mark is a solid little owl, so the honest motion is an owl's: it settles
 * into place and opens its eyes ("draw"), or blinks slowly and forever
 * ("focusing"). An earlier version rotated the ring, which was right for a ring
 * and would be faintly horrifying on a head.
 *
 * The blink is done with LIDS — discs of the body colour that drop over the
 * punched-out eyes — rather than by squashing the pupils. Squashing a pupil
 * reads as a glare; filling the socket reads as a closed eye. Both are pure
 * transform + opacity, so this stays compositor-only on mid-range Android.
 */

export type MarkMotion =
  /** Settles in and opens its eyes once, then rests. Heroes, auth screens. */
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

  /** A lid is closed at scaleY 1 and open at 0. */
  const lid = (delay: number) => {
    if (still) {
      return { initial: false as const, animate: { scaleY: 0 } };
    }
    if (mode === "focusing") {
      return {
        initial: false as const,
        animate: { scaleY: [0, 0, 1, 0] },
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
      initial: { scaleY: 1 },
      animate: { scaleY: 0 },
      // Lands just after the body settles: the shape arrives, then it looks
      // at you.
      transition: { duration: 0.32, delay: 0.34 + delay, ease: "easeOut" as const },
    };
  };

  return (
    <svg
      viewBox="0 0 32 32"
      fill="none"
      aria-hidden="true"
      className={cn("size-7", className)}
    >
      <motion.g
        initial={still || mode !== "draw" ? false : { scale: 0.62, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.5, ease: [0.34, 1.4, 0.64, 1] }}
        style={{ transformOrigin: "16px 22px" }}
      >
        <path
          d="M10.6 8.6 L6.4 2.6 L15.2 6.6 Z M21.4 8.6 L25.6 2.6 L16.8 6.6 Z"
          fill="currentColor"
          strokeLinejoin="round"
        />
        <path
          fillRule="evenodd"
          clipRule="evenodd"
          d="M16 6.2 C 21.4 6.2 25.2 8.8 26.6 12.4 C 27.8 15.4 27.8 19.8 26.4 22.8
             C 24.4 27 20.6 29.4 16 29.4 C 11.4 29.4 7.6 27 5.6 22.8
             C 4.2 19.8 4.2 15.4 5.4 12.4 C 6.8 8.8 10.6 6.2 16 6.2 Z
             M15.6 15.6 A4.4 4.4 0 1 0 6.8 15.6 A4.4 4.4 0 1 0 15.6 15.6 Z
             M25.2 15.6 A4.4 4.4 0 1 0 16.4 15.6 A4.4 4.4 0 1 0 25.2 15.6 Z
             M16 20.2 L13.9 23.4 H18.1 Z"
          fill="currentColor"
        />

        <circle cx="11.2" cy="15.7" r="2.5" fill="currentColor" />
        <circle cx="20.8" cy="15.7" r="2.5" fill="currentColor" />

        {/* Lids, in the body colour, filling the sockets when closed. */}
        <motion.circle
          cx="11.2"
          cy="15.6"
          r="4.45"
          fill="currentColor"
          style={{ transformOrigin: "11.2px 15.6px" }}
          {...lid(0)}
        />
        <motion.circle
          cx="20.8"
          cy="15.6"
          r="4.45"
          fill="currentColor"
          style={{ transformOrigin: "20.8px 15.6px" }}
          // A hair behind the other eye — a perfectly synchronised blink reads
          // as a shutter, a staggered one reads as alive.
          {...lid(0.06)}
        />
      </motion.g>
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
