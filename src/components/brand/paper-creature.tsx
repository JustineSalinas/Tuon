"use client";

import {
  motion,
  useReducedMotion,
  type TargetAndTransition,
  type Transition,
} from "motion/react";

import { cn } from "@/lib/utils";

/**
 * Tala, Tuón's owl.
 *
 * Same species as the logo, deliberately: the mark is an owl whose eyes are the
 * point-of-focus motif, and a companion of a different animal would read as two
 * brands. Tala is that mark grown into a character.
 *
 * Drawn as inline SVG rather than Lottie or a sprite sheet for three reasons:
 * it costs a couple of kB on a mobile connection, it inherits the theme through
 * CSS custom properties (so dark mode is free), and every animated property is
 * transform or opacity — nothing that triggers layout — so it composites on the
 * GPU.
 *
 * Two rules about her behaviour, because they are easy to get wrong:
 *
 * 1. She holds the BOOK only while you are actually working through cards. A
 *    prop she never puts down stops meaning anything; a prop she picks up when
 *    the session starts tells you the session started.
 * 2. Her resting behaviour is HEAD MOVEMENT — the sharp tilt-and-hold owls do —
 *    plus an occasional wave. Not a generic float. The tilt is what makes her
 *    read as an owl rather than as a round bird, and it costs nothing.
 */

export type CreatureState =
  | "idle"
  | "thinking"
  | "correct"
  | "wrong"
  | "asleep"
  | "overdue"
  | "celebrating";

/** Eye centres. Every ring in the eye is built from these two points. */
const EYES = [45, 75] as const;
const EYE_Y = 49;

/** Wing shapes. Mirrored, so the shoulder pivots mirror too. */
const WINGS = [
  {
    d: "M33 60 C 27 72 29 88 44 93 C 49 88 45 72 41 60 Z",
    pivot: "37px 61px",
    side: -1,
  },
  {
    d: "M87 60 C 93 72 91 88 76 93 C 71 88 75 72 79 60 Z",
    pivot: "83px 61px",
    side: 1,
  },
] as const;

/**
 * Tala's own colours, which deliberately do NOT follow the theme.
 *
 * Her outline and feathers are `--primary`, because terracotta reads on both
 * grounds and keeping her tied to the brand colour is the point. But her face,
 * her eyes and the pages of her book are parts of a character, not surfaces —
 * an illustrated owl has a cream face whatever colour the page behind her is.
 * Wiring them to `--card` and `--foreground` flipped them in dark mode and gave
 * her blank white eyes with no pupils.
 */
const FACE = "#F4E9DC";
const PUPIL = "#2A1D16";
const GLINT = "#FFFFFF";
const RULE = "#B9A894";

export function PaperCreature({
  state = "idle",
  studying = false,
  className,
  title,
}: {
  state?: CreatureState;
  /**
   * Whether there are cards in front of you right now. Puts the book in her
   * wings.
   *
   * This is a prop and not something derived from `state`, and the difference
   * matters: during a review she sits at `idle` between answers and only dips
   * into `correct`/`wrong` for a moment after each rating, so a book keyed to
   * those states would flash in and out on every card. Being in a session is
   * something only the caller knows.
   */
  studying?: boolean;
  className?: string;
  /** Accessible label. Omit for purely decorative placements. */
  title?: string;
}) {
  const reduce = useReducedMotion();
  const asleep = state === "asleep";
  // She puts the book down to sleep, and to celebrate with both wings.
  const holdsBook = studying && !asleep && state !== "celebrating";

  /**
   * Whole-body motion. Transforms only, so nothing reflows.
   *
   * Idle and overdue are built around the tilt: breathe, then snap the head
   * over and hold it there, then settle. Owls move in steps, not curves, so the
   * keyframes sit close together with long gaps of stillness between them —
   * evenly spaced keyframes would produce a constant sway, which is a pigeon.
   */
  const body: Record<CreatureState, TargetAndTransition> = {
    idle: {
      y: [0, -3, 0, -3, 0, 0, 0, 0, 0],
      rotate: [0, 0, 0, 0, 0, -11, 11, 0, 0],
    },
    // A long, slow tilt: the "working on it" pose.
    thinking: { y: 0, rotate: [-6, 6, -6], scale: 1 },
    correct: { y: [0, -14, 0], rotate: 0, scale: [1, 1.06, 1] },
    wrong: { y: 0, rotate: [0, -4, 4, 0], scale: 0.98 },
    asleep: { y: 0, rotate: 0, scale: 0.94 },
    overdue: { y: [0, -2, 0, 0, 0], rotate: [0, 0, -9, 9, 0] },
    celebrating: { y: [0, -18, 0, -8, 0], rotate: [0, -8, 8, 0], scale: 1 },
  };

  const bodyTransition: Record<CreatureState, Transition> = {
    idle: {
      duration: 7,
      repeat: Infinity,
      times: [0, 0.09, 0.18, 0.27, 0.36, 0.5, 0.58, 0.66, 1],
      ease: "easeInOut",
    },
    thinking: { duration: 2.2, repeat: Infinity, ease: "easeInOut" },
    // A hop needs three keyframes (up, then back), and Motion supports only
    // two under a spring — pairing them threw on every correct answer. A
    // back-out curve keeps the springy overshoot without the constraint.
    correct: { duration: 0.5, ease: [0.34, 1.56, 0.64, 1] },
    wrong: { duration: 0.42 },
    asleep: { duration: 0.5 },
    overdue: {
      duration: 2.6,
      repeat: Infinity,
      times: [0, 0.15, 0.35, 0.5, 1],
      ease: "easeInOut",
    },
    celebrating: { duration: 1.1 },
  };

  /**
   * Wing motion.
   *
   * While she has the book the wings hold still against it — a wing that drifts
   * off a book it is meant to be holding reads as a book stuck to her chest.
   * The rest of the time the near wing waves, and celebrating throws both up.
   */
  const wingAnimation = (side: -1 | 1): TargetAndTransition => {
    if (reduce || asleep || holdsBook) return { rotate: 0 };
    if (state === "celebrating") {
      return { rotate: [0, side * 44, side * 22, side * 40, 0] };
    }
    // Only the near wing waves. Both at once is a semaphore, not a hello.
    if (side === 1) return { rotate: 0 };
    return state === "overdue"
      ? { rotate: [0, 0, -42, -20, -42, 0, 0] }
      : { rotate: [0, 0, -40, -18, -40, -18, 0, 0] };
  };

  const wingTransition = (side: -1 | 1): Transition => {
    const stillWing =
      reduce || asleep || holdsBook || (side === 1 && state !== "celebrating");
    if (stillWing) return { duration: 0.3 };
    switch (state) {
      case "celebrating":
        return { duration: 1.1, ease: "easeInOut" };
      case "overdue":
        // Waves on the same 2.6s loop the body is on, just after the tilt.
        return {
          duration: 2.6,
          repeat: Infinity,
          times: [0, 0.35, 0.45, 0.55, 0.65, 0.78, 1],
          ease: "easeInOut",
        };
      default:
        // Waves once per idle cycle, after the head has settled from its tilt.
        return {
          duration: 7,
          repeat: Infinity,
          times: [0, 0.7, 0.755, 0.79, 0.825, 0.86, 0.915, 1],
          ease: "easeInOut",
        };
    }
  };

  /**
   * Eye motion. The eyes carry most of the character, so each state gets a
   * deliberate one rather than sharing a default. Asleep is drawn separately —
   * squashing four concentric circles to nothing goes muddy, whereas a plain
   * arc reads as a shut eye instantly.
   */
  const eyeAnimation = (): TargetAndTransition => {
    if (reduce) return { scaleY: 1 };
    switch (state) {
      case "thinking":
        // Half-lidded: concentrating, not staring.
        return { scaleY: 0.72 };
      case "wrong":
        // One slow blink reads as "ah" — a shake would read as scolding, and
        // getting a card wrong is the normal case in spaced repetition.
        return { scaleY: [1, 0.1, 1] };
      case "correct":
      case "celebrating":
        return { scaleY: [1, 1.15, 1] };
      case "overdue":
        return { scaleY: [1, 1, 0.15, 1] };
      default:
        // Idle: an occasional blink, offset per eye so it looks alive.
        return { scaleY: [1, 1, 0.12, 1] };
    }
  };

  const eyeTransition = (delay: number): Transition => {
    if (reduce) return { duration: 0 };
    switch (state) {
      case "idle":
        return {
          duration: 4.2,
          repeat: Infinity,
          times: [0, 0.86, 0.92, 0.97],
          ease: "easeInOut",
          delay,
        };
      case "overdue":
        return {
          duration: 1.8,
          repeat: Infinity,
          times: [0, 0.7, 0.8, 0.9],
          ease: "easeInOut",
          delay,
        };
      case "wrong":
        return { duration: 0.5, delay };
      default:
        return { duration: 0.4, delay };
    }
  };

  /** The hop squashes the shadow; nothing else touches it. */
  const hops = state === "correct" || state === "celebrating";

  return (
    <motion.svg
      viewBox="0 0 120 120"
      className={cn("size-24 overflow-visible", className)}
      role={title ? "img" : "presentation"}
      aria-label={title}
      aria-hidden={title ? undefined : true}
      initial={false}
      animate={reduce ? {} : body[state]}
      transition={reduce ? { duration: 0 } : bodyTransition[state]}
      // Percentages, not viewBox units: the transform is applied in CSS pixels
      // against the rendered box, so px here would be wrong at every size but
      // 120. Low and central, so a tilt swings her head and barely moves her
      // feet.
      style={{ willChange: "transform", transformOrigin: "50% 73%" }}
    >
      {/* Ground shadow — sells the hop without moving the body's own origin. */}
      <motion.ellipse
        cx="60"
        cy="113"
        rx="27"
        ry="4"
        className="fill-foreground/10"
        animate={
          reduce
            ? {}
            : hops
              ? { scaleX: [1, 0.7, 1], opacity: [0.5, 0.25, 0.5] }
              : { scaleX: 1, opacity: 0.5 }
        }
        transition={hops ? bodyTransition[state] : { duration: 0.3 }}
        style={{ transformOrigin: "60px 113px" }}
      />

      {/* Feet. Drawn before the body so the toes read as poking out from
          underneath her rather than sitting on top. */}
      <g
        className="stroke-warning"
        strokeWidth="3"
        strokeLinecap="round"
        fill="none"
      >
        <path d="M50 96 v6 M50 102 l-5 5 M50 102 v6 M50 102 l5 5" />
        <path d="M70 96 v6 M70 102 l-5 5 M70 102 v6 M70 102 l5 5" />
      </g>

      {/* Body and ear tufts as ONE outline. Drawing the tufts as separate
          triangles left a seam where they met the head, and two thin slivers
          rising off a dome read as antennae rather than as ears. */}
      <path
        d="M60 19 C 66 19 70 20.5 73.5 22.5 L90 12 L86.5 30 C 94 36.5 100 45 100 56 C 101 80 87 101 60 101 C 33 101 19 80 20 56 C 20 45 26 36.5 33.5 30 L30 12 L46.5 22.5 C 50 20.5 54 19 60 19 Z"
        className="fill-primary/25 stroke-primary"
        strokeWidth="3"
        strokeLinejoin="round"
      />

      {/* Crown feathers — the tick marks that stop the head reading as a
          plain dome. */}
      <path
        d="M50 27 l-1.5 -5 M56 24 l-1 -5 M64 24 l1 -5 M70 27 l1.5 -5"
        className="stroke-primary/45"
        strokeWidth="2"
        strokeLinecap="round"
        fill="none"
      />

      {/* Facial disc: the heart shape every owl has, and the reason the eyes
          read as enormous. */}
      <path
        d="M60 34 C 55.5 29.5 49 27.5 43 29.5 C 34.5 32.5 29 40.5 29 50 C 29 60.5 36 68.5 45 70.5 C 51 71.8 56.5 69 60 64.5 C 63.5 69 69 71.8 75 70.5 C 84 68.5 91 60.5 91 50 C 91 40.5 85.5 32.5 77 29.5 C 71 27.5 64.5 29.5 60 34 Z"
        fill={FACE}
        className="stroke-primary/70"
        strokeWidth="2.5"
        strokeLinejoin="round"
      />

      {/* The eyes: a ring around a filled dot, which is the original Tuón mark
          drawn twice. */}
      {EYES.map((cx, i) => (
        <motion.g
          key={cx}
          style={{ transformOrigin: `${cx}px ${EYE_Y}px` }}
          animate={asleep ? { scaleY: 1 } : eyeAnimation()}
          // The second eye trails the first: a perfectly synchronised blink
          // reads as a shutter, a staggered one reads as alive.
          transition={eyeTransition(i * 0.07)}
        >
          {asleep ? (
            <path
              d={`M${cx - 11} ${EYE_Y - 1} q11 9 22 0`}
              className="stroke-primary"
              strokeWidth="3"
              strokeLinecap="round"
              fill="none"
            />
          ) : (
            <>
              <circle
                cx={cx}
                cy={EYE_Y}
                r="12.5"
                fill={FACE}
                className="stroke-primary/70"
                strokeWidth="2.5"
              />
              <circle
                cx={cx}
                cy={EYE_Y}
                r="8"
                className="stroke-primary"
                strokeWidth="3"
                fill="none"
              />
              <circle cx={cx} cy={EYE_Y} r="5.5" fill={PUPIL} />
              <circle
                cx={cx + 2.2}
                cy={EYE_Y - 2.6}
                r="2.1"
                fill={GLINT}
              />
            </>
          )}
        </motion.g>
      ))}

      {/* Beak, at the point where the two halves of the facial disc meet. */}
      <path
        d="M60 60 L53.5 66 Q60 74.5 66.5 66 Z"
        className="fill-warning stroke-primary/70"
        strokeWidth="2"
        strokeLinejoin="round"
      />

      {/* The book, out only while there are cards in front of her. Drawn under
          the wings so their inner edges lap over the cover — in front of them
          it reads as floating rather than as held. */}
      {holdsBook ? (
        <g>
          <path
            d="M60 76 C 54 72 47 70.5 40 71 L40 94 C 47 93.5 54 95 60 98 C 66 95 73 93.5 80 94 L80 71 C 73 70.5 66 72 60 76 Z"
            className="fill-success stroke-success"
            strokeWidth="2.5"
            strokeLinejoin="round"
          />
          <path
            d="M60 79 C 55 75.5 49 74.5 44 74.8 L44 91.5 C 49 91.2 55 92.5 60 95 C 65 92.5 71 91.2 76 91.5 L76 74.8 C 71 74.5 65 75.5 60 79 Z"
            fill={FACE}
          />
          <path
            d="M48 81 h8 M48 85 h8 M64 81 h8 M64 85 h8"
            stroke={RULE}
            strokeWidth="1.5"
            strokeLinecap="round"
            fill="none"
          />
          <path
            d="M60 79 V95"
            className="stroke-success"
            strokeWidth="2"
            strokeLinecap="round"
            fill="none"
          />
        </g>
      ) : null}

      {WINGS.map(({ d, pivot, side }) => (
        <motion.path
          key={pivot}
          d={d}
          className="fill-primary/45 stroke-primary"
          strokeWidth="3"
          strokeLinejoin="round"
          animate={wingAnimation(side)}
          transition={wingTransition(side)}
          style={{ transformOrigin: pivot }}
        />
      ))}

      {/* Sleeping: the small breath, in place of a snore cliché. */}
      {asleep && !reduce ? (
        <motion.g
          className="fill-muted-foreground"
          animate={{ y: [-2, -14], opacity: [0, 0.7, 0] }}
          transition={{ duration: 2.6, repeat: Infinity, ease: "easeOut" }}
        >
          <circle cx="98" cy="30" r="2.5" />
        </motion.g>
      ) : null}
    </motion.svg>
  );
}
