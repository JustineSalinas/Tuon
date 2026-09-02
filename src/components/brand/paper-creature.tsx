"use client";

import {
  motion,
  useReducedMotion,
  type TargetAndTransition,
  type Transition,
} from "motion/react";
import { useId } from "react";

import { cn } from "@/lib/utils";

/**
 * Tala, Tuón's owl.
 *
 * Same species as the logo, deliberately: the mark is an owl whose eyes are the
 * point-of-focus motif, and a companion of a different animal would read as two
 * brands.
 *
 * Drawn as inline SVG rather than Lottie or a sprite sheet for three reasons:
 * it costs a couple of kB on a mobile connection, it scales from a 48px corner
 * to a hero without a second asset, and every animated property is transform or
 * opacity — nothing that triggers layout — so it composites on the GPU.
 *
 * Shading is done with GRADIENTS, never filters. A top-lit gradient per form
 * plus a dark contact shadow under each overhang gives the rounded, painted
 * look; `feGaussianBlur` would look the same and cost a repaint of the whole
 * element on every frame, on the mid-range Android this app is built for.
 *
 * Three rules about her that are easy to get wrong:
 *
 * 1. Gradient ids MUST be instance-unique. SVG ids are document-global, so a
 *    second Tala on the page would silently steal the first one's fills. Hence
 *    `useId`, with its colons stripped — legal in an id, not in `url(#…)`.
 * 2. She holds the BOOK only while there are cards in front of you, and that is
 *    a prop, not something derived from `state` — see `studying` below.
 * 3. Her resting behaviour is HEAD MOVEMENT — the sharp tilt-and-hold owls do —
 *    plus a wave. Owls move in steps, so the keyframes cluster with long
 *    stillnesses between them; evenly spaced ones read as a constant sway,
 *    which is a pigeon.
 */

export type CreatureState =
  | "idle"
  | "thinking"
  | "correct"
  | "wrong"
  | "asleep"
  | "overdue"
  | "celebrating"
  /**
   * Mid-sentence. Only ever driven by a real stream of words arriving — see
   * the note on `beakAnimation` for why that distinction is the whole point.
   */
  | "talking"
  /** Waiting on the student. Head cocked, still, eyes open. */
  | "listening";

/**
 * Tala's own colours, which deliberately do NOT follow the theme.
 *
 * Her plumage is the terracotta family so she stays tied to the brand, but she
 * is a character rather than a surface: an illustrated owl has a cream face and
 * dark pupils whatever colour the page behind her is. Wiring these to `--card`
 * and `--foreground` flipped them in dark mode and gave her blank white eyes.
 * Only her ground shadow belongs to the page.
 */
const INK = "#3B2418"; // outline — warm near-black, never pure black
const CAP_LIGHT = "#B9673F";
const CAP_DARK = "#8B4526";
const FACE_LIGHT = "#FDEFDC";
const FACE_DARK = "#EBCFAB";
const BELLY_LIGHT = "#F8C976";
const BELLY_DARK = "#E5A03E";
const AMBER = "#F2A93B"; // beak and feet
const PUPIL = "#241610";
const PAPER = "#FFFFFF";
const BOOK = "#7C9C74"; // sage, the one non-terracotta note

/** Eye centres. Everything in the eye is built from these two points. */
const EYES = [41, 79] as const;
const EYE_Y = 45;
const EYE_R = 14;

/**
 * Wings. Both are drawn once facing left, and the right is that path mirrored —
 * symmetry by construction, rather than two hand-tuned curves that drift apart
 * on the next edit.
 */
const WING_SPREAD =
  "M36 62 C 20 63 8 70 3 80 Q 10 86 18 84 Q 16 93 12 99 Q 22 96 29 90 Q 29 99 27 105 Q 38 96 42 84 C 44 74 42 63 36 62 Z";
/**
 * The holding pose is deliberately NARROWER than the spread one. At its first
 * width the wings covered x 40–49, which is exactly the margin where the book's
 * cover shows around its pages, so she appeared to be holding a blank white
 * card. It now stops at the cover's edge instead of crossing it.
 */
const WING_HOLDING =
  "M31 62 C 22 66 17 77 19 89 Q 25 93 31 91 Q 31 98 29 103 Q 36 97 39 87 C 41 77 37 65 34 62 Z";
/** Feather divisions, drawn over the wing. */
const WING_LINES_SPREAD = "M33 68 Q 24 74 18 84 M36 74 Q 31 84 27 105";
const WING_LINES_HOLDING = "M31 68 Q 26 76 24 89 M35 70 Q 34 82 30 103";

export function PaperCreature({
  state = "idle",
  studying = false,
  className,
  title,
}: {
  state?: CreatureState;
  /**
   * Whether there are cards in front of you right now. Puts the book in her
   * wings and brings them forward to hold it.
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

  // Colons are valid in an id but not in a url(#…) reference, so strip them.
  const uid = useId().replace(/[^a-zA-Z0-9]/g, "");
  const g = (name: string) => `url(#${uid}-${name})`;

  /**
   * Whole-body motion. Transforms only, so nothing reflows.
   *
   * Idle and overdue are built around the tilt: breathe, then snap the head
   * over and hold it there, then settle.
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
    /**
     * Speech is in the beak; the body only carries its rhythm. Small, uneven
     * nods — a head that swings in time with a syllable is a puppet, and the
     * amplitude here is a third of the idle tilt on purpose.
     */
    talking: { y: [0, -1.5, 0, -1, 0], rotate: [0, -2.5, 1.5, -1, 0] },
    /**
     * The cocked hold. One move into the tilt and then nothing: an owl
     * listening is conspicuously STILL, and animating through it would read
     * as impatience.
     */
    listening: { y: 0, rotate: -9, scale: 1 },
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
    talking: {
      duration: 1.9,
      repeat: Infinity,
      times: [0, 0.22, 0.44, 0.7, 1],
      ease: "easeInOut",
    },
    // Snap into the tilt the way an owl does, then hold.
    listening: { duration: 0.42, ease: [0.34, 1.4, 0.64, 1] },
  };

  /**
   * Wing motion. While she has the book the wings hold still against it — a
   * wing that drifts off a book it is meant to be holding reads as a book stuck
   * to her chest. Otherwise the near wing waves, and celebrating throws both up.
   */
  const wingAnimation = (side: -1 | 1): TargetAndTransition => {
    if (reduce || asleep || holdsBook) return { rotate: 0 };
    if (state === "celebrating") {
      return { rotate: [0, side * 40, side * 20, side * 36, 0] };
    }
    // Only the near wing waves. Both at once is a semaphore, not a hello.
    if (side === 1) return { rotate: 0 };
    return state === "overdue"
      ? { rotate: [0, 0, -34, -14, -34, 0, 0] }
      : { rotate: [0, 0, -32, -12, -32, -12, 0, 0] };
  };

  const wingTransition = (side: -1 | 1): Transition => {
    const still =
      reduce || asleep || holdsBook || (side === 1 && state !== "celebrating");
    if (still) return { duration: 0.3 };
    switch (state) {
      case "celebrating":
        return { duration: 1.1, ease: "easeInOut" };
      case "overdue":
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
   * deliberate one. Asleep is drawn separately — squashing a stack of circles
   * to nothing goes muddy, whereas a plain arc reads as a shut eye instantly.
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
      case "talking":
        // Wide and open. Blinking mid-sentence is what a face does, but the
        // beak is already carrying the motion and a second rhythm on top of
        // it reads as twitching.
        return { scaleY: 1 };
      case "listening":
        // Fractionally wider than resting. Attention, without a cartoon
        // pop — anything past about 1.1 reads as alarm rather than interest.
        return { scaleY: [1, 1.06, 1.06, 0.12, 1.06] };
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
      case "listening":
        return {
          duration: 5.5,
          repeat: Infinity,
          times: [0, 0.06, 0.9, 0.95, 1],
          ease: "easeInOut",
          delay,
        };
      default:
        return { duration: 0.4, delay };
    }
  };

  /**
   * The beak, which is the only part that actually says anything.
   *
   * Scaled from its TOP edge so the lower mandible drops and the upper one
   * stays put, which is how a beak opens. Scaling from the centre pulls the
   * whole thing off the face.
   *
   * The timing is deliberately uneven — 0.34s of syllables, then a gap the
   * length of a breath, then more. An evenly spaced open-shut is a nutcracker;
   * speech has stresses and pauses in it, and the eye reads the gaps as words
   * even at this size.
   *
   * It only runs on `talking`, and `talking` is only ever set while text is
   * genuinely streaming in. A mouth that moves while nothing is being said is
   * the exact tell that makes a mascot feel fake, and it costs nothing to
   * avoid: the state is driven by the stream, not by a timer.
   */
  const beakAnimation = (): TargetAndTransition =>
    reduce || state !== "talking"
      ? { scaleY: 1 }
      : { scaleY: [1, 1.55, 1, 1.35, 1, 1.6, 1, 1, 1] };

  const beakTransition = (): Transition =>
    reduce || state !== "talking"
      ? { duration: 0.2 }
      : {
          duration: 1.15,
          repeat: Infinity,
          times: [0, 0.08, 0.17, 0.26, 0.34, 0.43, 0.52, 0.7, 1],
          ease: "easeInOut",
        };

  /** The hop squashes the shadow; nothing else touches it. */
  const hops = state === "correct" || state === "celebrating";

  const wingPath = holdsBook ? WING_HOLDING : WING_SPREAD;
  const wingLines = holdsBook ? WING_LINES_HOLDING : WING_LINES_SPREAD;

  /** One wing, drawn left-facing; `side` 1 mirrors it across the centre. */
  const wing = (side: -1 | 1) => (
    <motion.g
      key={side}
      animate={wingAnimation(side)}
      transition={wingTransition(side)}
      style={{ transformOrigin: side === -1 ? "37px 63px" : "83px 63px" }}
    >
      <g transform={side === 1 ? "translate(120,0) scale(-1,1)" : undefined}>
        <path
          d={wingPath}
          fill={g("wing")}
          stroke={INK}
          strokeWidth="3"
          strokeLinejoin="round"
        />
        <path
          d={wingLines}
          fill="none"
          stroke={INK}
          strokeWidth="2"
          strokeLinecap="round"
          opacity="0.55"
        />
      </g>
    </motion.g>
  );

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
      <defs>
        {/* Top-lit: every form is lighter where the light lands and darker
            where it turns away. That is the whole of the shading. */}
        <linearGradient id={`${uid}-cap`} x1="0" y1="0" x2="0.35" y2="1">
          <stop offset="0" stopColor={CAP_LIGHT} />
          <stop offset="1" stopColor={CAP_DARK} />
        </linearGradient>
        <radialGradient id={`${uid}-face`} cx="0.5" cy="0.32" r="0.78">
          <stop offset="0" stopColor={FACE_LIGHT} />
          <stop offset="1" stopColor={FACE_DARK} />
        </radialGradient>
        <radialGradient id={`${uid}-belly`} cx="0.5" cy="0.28" r="0.85">
          <stop offset="0" stopColor={BELLY_LIGHT} />
          <stop offset="1" stopColor={BELLY_DARK} />
        </radialGradient>
        <linearGradient id={`${uid}-wing`} x1="0" y1="0" x2="0.2" y2="1">
          <stop offset="0" stopColor={CAP_LIGHT} />
          <stop offset="1" stopColor={CAP_DARK} />
        </linearGradient>
        {/* The contact shadow an overhang casts on the form below it. */}
        <linearGradient id={`${uid}-ao`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={INK} stopOpacity="0.26" />
          <stop offset="1" stopColor={INK} stopOpacity="0" />
        </linearGradient>
      </defs>

      {/* Ground shadow — sells the hop without moving the body's own origin. */}
      <motion.ellipse
        cx="60"
        cy="115"
        rx="26"
        ry="3.5"
        className="fill-foreground/10"
        animate={
          reduce
            ? {}
            : hops
              ? { scaleX: [1, 0.7, 1], opacity: [0.5, 0.25, 0.5] }
              : { scaleX: 1, opacity: 0.5 }
        }
        transition={hops ? bodyTransition[state] : { duration: 0.3 }}
        style={{ transformOrigin: "60px 115px" }}
      />

      {/* Feet, behind the body so the toes read as poking out from under her. */}
      <g fill={AMBER} stroke={INK} strokeWidth="2.6" strokeLinejoin="round">
        <path d="M44 100 C 38 100 35 105 38 109 C 41 113 51 113 54 109 C 57 105 54 100 48 100 Z" />
        <path d="M72 100 C 66 100 63 105 66 109 C 69 113 79 113 82 109 C 85 105 82 100 76 100 Z" />
      </g>

      {/* Spread wings sit BEHIND her; the holding pose goes in front, over the
          book, and is rendered further down. */}
      {holdsBook ? null : [-1 as const, 1 as const].map(wing)}

      {/* Head and body in one shape, ear tufts included. Drawing the tufts
          separately left a seam where they met the head, and two thin slivers
          rising off a dome read as antennae rather than as ears. */}
      <path
        d="M60 12 C 70 12 79 15 86 21 L96 5 L95 27 C 99 35 101 45 100 55 C 100 76 88 105 60 105 C 32 105 20 76 20 55 C 19 45 21 35 25 27 L24 5 L34 21 C 41 15 50 12 60 12 Z"
        fill={g("cap")}
        stroke={INK}
        strokeWidth="3"
        strokeLinejoin="round"
      />

      {/* Crown speckles and the stitched brow line, straight off the reference:
          the small marks that stop the cap reading as a plain block of colour. */}
      <g fill={AMBER}>
        <circle cx="50" cy="17" r="2.2" />
        <circle cx="60" cy="14" r="2.2" />
        <circle cx="70" cy="17" r="2.2" />
        <circle cx="55" cy="24" r="1.9" />
        <circle cx="65" cy="24" r="1.9" />
        <circle cx="60" cy="31" r="1.9" />
      </g>
      <path
        d="M28 32 C 31 25 37 20 45 18 M92 32 C 89 25 83 20 75 18"
        fill="none"
        stroke={INK}
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeDasharray="1 5"
        opacity="0.7"
      />

      {/* The facial disc: two big lobes meeting in the heart point every owl
          has, and the reason her eyes read as enormous. */}
      <path
        d="M60 40 C 56 30 48 24 38 26 C 26 29 20 42 21 56 C 22 74 34 88 50 90 C 57 91 63 91 70 90 C 86 88 98 74 99 56 C 100 42 94 29 82 26 C 72 24 64 30 60 40 Z"
        fill={g("face")}
        stroke={INK}
        strokeWidth="3"
        strokeLinejoin="round"
      />
      {/* Contact shadow where the cap overhangs the face. */}
      <path
        d="M60 40 C 56 30 48 24 38 26 C 30 28 25 34 22 43 C 30 36 40 33 52 36 Z M60 40 C 64 30 72 24 82 26 C 90 28 95 34 98 43 C 90 36 80 33 68 36 Z"
        fill={g("ao")}
      />

      {/* Eyes. The sparkle is two highlights, not one: a big one where the
          light lands and a small one opposite it. */}
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
              d={`M${cx - 12} ${EYE_Y - 2} q12 11 24 0`}
              fill="none"
              stroke={INK}
              strokeWidth="3.4"
              strokeLinecap="round"
            />
          ) : (
            <>
              <circle
                cx={cx}
                cy={EYE_Y}
                r={EYE_R}
                fill={PAPER}
                stroke={INK}
                strokeWidth="3"
              />
              <circle cx={cx + 1} cy={EYE_Y - 1} r={EYE_R - 3} fill={PUPIL} />
              <circle cx={cx - 3.5} cy={EYE_Y - 5} r="4.2" fill={PAPER} />
              <circle cx={cx + 4.5} cy={EYE_Y + 3.5} r="2.2" fill={PAPER} />
            </>
          )}
        </motion.g>
      ))}

      {/* Beak, at the point where the two halves of the facial disc meet.
          Its transform origin is the top edge, so it opens downward. */}
      <motion.path
        d="M60 50 C 63.5 50 65.5 53 65 56.5 C 64.5 60 62 63.5 60 64.5 C 58 63.5 55.5 60 55 56.5 C 54.5 53 56.5 50 60 50 Z"
        fill={AMBER}
        stroke={INK}
        strokeWidth="2.6"
        strokeLinejoin="round"
        animate={beakAnimation()}
        transition={beakTransition()}
        style={{ transformOrigin: "60px 50px" }}
      />

      {/* Belly, with the scalloped feather markings from the reference. */}
      <path
        d="M60 71 C 74 71 83 81 83 91 C 83 101 72 107 60 107 C 48 107 37 101 37 91 C 37 81 46 71 60 71 Z"
        fill={g("belly")}
        stroke={INK}
        strokeWidth="3"
        strokeLinejoin="round"
      />
      <path
        d="M45 81 q5 6 10 0 M55 81 q5 6 10 0 M65 81 q5 6 10 0 M43 93 q4.5 6 9 0 q4.5 6 9 0 q4.5 6 9 0 q4.5 6 9 0"
        fill="none"
        stroke={INK}
        strokeWidth="2"
        strokeLinecap="round"
        opacity="0.5"
      />

      {/* The book, out only while there are cards in front of her. */}
      {holdsBook ? (
        <g>
          <path
            d="M60 74 C 54 70 47 68.5 40 69 L40 95 C 47 94.5 54 96 60 99 C 66 96 73 94.5 80 95 L80 69 C 73 68.5 66 70 60 74 Z"
            fill={BOOK}
            stroke={INK}
            strokeWidth="2.8"
            strokeLinejoin="round"
          />
          <path
            d="M60 79 C 55 75.5 50 74.5 46 74.8 L46 91 C 50 90.7 55 92 60 94.5 C 65 92 70 90.7 74 91 L74 74.8 C 70 74.5 65 75.5 60 79 Z"
            fill={FACE_LIGHT}
          />
          <path
            d="M50 81 h7 M50 85 h7 M63 81 h7 M63 85 h7 M60 79 V94.5"
            fill="none"
            stroke={INK}
            strokeWidth="1.8"
            strokeLinecap="round"
            opacity="0.4"
          />
        </g>
      ) : null}

      {holdsBook ? [-1 as const, 1 as const].map(wing) : null}

      {/* Sleeping: the small breath, in place of a snore cliché. */}
      {asleep && !reduce ? (
        <motion.g
          className="fill-muted-foreground"
          animate={{ y: [-2, -14], opacity: [0, 0.7, 0] }}
          transition={{ duration: 2.6, repeat: Infinity, ease: "easeOut" }}
        >
          <circle cx="104" cy="26" r="2.5" />
        </motion.g>
      ) : null}
    </motion.svg>
  );
}
