"use client";

import { useEffect, useState } from "react";

import {
  AnimatePresence,
  motion,
  useReducedMotion,
  type TargetAndTransition,
  type Transition,
} from "motion/react";

import { cn } from "@/lib/utils";

/**
 * Tuón's companion: a small creature folded out of the same cream stock the
 * notes are written on.
 *
 * Drawn as inline SVG rather than Lottie or a sprite sheet for three reasons:
 * it costs a couple of kB on a mobile connection, it inherits the theme through
 * CSS custom properties (so it is correct in dark mode for free), and every
 * animated property here is transform or opacity — nothing that triggers
 * layout — so it composites on the GPU.
 */

export type CreatureState =
  | "idle"
  | "thinking"
  | "correct"
  | "wrong"
  | "asleep"
  | "overdue"
  | "celebrating";

const SPRING = { type: "spring", stiffness: 260, damping: 18 } as const;

export function PaperCreature({
  state = "idle",
  className,
  title,
}: {
  state?: CreatureState;
  className?: string;
  /** Accessible label. Omit for purely decorative placements. */
  title?: string;
}) {
  const reduce = useReducedMotion();

  // Whole-body motion per state. Kept to transforms so nothing reflows.
  const body: Record<CreatureState, TargetAndTransition> = {
    idle: { y: [0, -2.5, 0], rotate: 0, scale: 1 },
    thinking: { y: 0, rotate: [-3, 3, -3], scale: 1 },
    correct: { y: [0, -14, 0], rotate: 0, scale: [1, 1.06, 1] },
    wrong: { y: 0, rotate: [0, -5, 5, 0], scale: 0.97 },
    asleep: { y: 0, rotate: 0, scale: 0.94 },
    overdue: { y: [0, -1.5, 0], rotate: 0, scale: 1 },
    celebrating: { y: [0, -18, 0, -8, 0], rotate: [0, -8, 8, 0], scale: 1 },
  };

  const bodyTransition: Record<CreatureState, Transition> = {
    idle: { duration: 3.4, repeat: Infinity, ease: "easeInOut" },
    thinking: { duration: 1.6, repeat: Infinity, ease: "easeInOut" },
    correct: { ...SPRING },
    wrong: { duration: 0.42 },
    asleep: { duration: 0.5 },
    overdue: { duration: 1.1, repeat: Infinity, ease: "easeInOut" },
    celebrating: { duration: 1.1 },
  };

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
      style={{ willChange: "transform" }}
    >
      {/* Ground shadow — sells the hop without moving the body's own origin */}
      <motion.ellipse
        cx="60"
        cy="104"
        rx="26"
        ry="4"
        className="fill-foreground"
        initial={false}
        animate={{
          opacity: state === "asleep" ? 0.1 : 0.07,
          scaleX: state === "correct" || state === "celebrating" ? 0.78 : 1,
        }}
        transition={{ duration: 0.3 }}
        style={{ transformOrigin: "60px 104px" }}
      />

      {/* --- The fold ------------------------------------------------------
          Two stacked planes: a back fold in shadow and a front fold catching
          the light. The crease down the middle is what reads as "paper". */}
      <g>
        {/* back fold */}
        <motion.path
          d="M60 24 L96 88 L24 88 Z"
          className="fill-secondary stroke-border"
          strokeWidth="1.5"
          strokeLinejoin="round"
          initial={false}
          animate={{
            // Unfolding is the creature's "I am working" gesture.
            scaleY: state === "thinking" ? 1.1 : state === "asleep" ? 0.62 : 1,
            scaleX: state === "asleep" ? 1.16 : 1,
          }}
          transition={SPRING}
          style={{ transformOrigin: "60px 88px" }}
        />

        {/* front fold, lighter */}
        <motion.path
          d="M60 34 L84 88 L36 88 Z"
          className="fill-card stroke-border"
          strokeWidth="1.5"
          strokeLinejoin="round"
          initial={false}
          animate={{
            scaleY: state === "thinking" ? 1.06 : state === "asleep" ? 0.66 : 1,
            scaleX: state === "asleep" ? 1.1 : 1,
          }}
          transition={SPRING}
          style={{ transformOrigin: "60px 88px" }}
        />

        {/* centre crease */}
        <path
          d="M60 34 L60 88"
          className="stroke-border"
          strokeWidth="1"
          opacity="0.7"
        />

        {/* --- Ears: two corner folds, the most expressive part ----------- */}
        <motion.path
          d="M60 24 L44 42 L60 40 Z"
          className="fill-secondary stroke-border"
          strokeWidth="1.4"
          strokeLinejoin="round"
          initial={false}
          animate={{
            rotate:
              state === "wrong" || state === "asleep"
                ? 26
                : state === "thinking"
                  ? -10
                  : state === "correct" || state === "celebrating"
                    ? -16
                    : 0,
          }}
          transition={SPRING}
          style={{ transformOrigin: "60px 26px" }}
        />
        <motion.path
          d="M60 24 L76 42 L60 40 Z"
          className="fill-secondary stroke-border"
          strokeWidth="1.4"
          strokeLinejoin="round"
          initial={false}
          animate={{
            rotate:
              state === "wrong" || state === "asleep"
                ? -26
                : state === "thinking"
                  ? 10
                  : state === "correct" || state === "celebrating"
                    ? 16
                    : 0,
          }}
          transition={SPRING}
          style={{ transformOrigin: "60px 26px" }}
        />

        {/* --- Face ------------------------------------------------------- */}
        <Eyes state={state} reduce={Boolean(reduce)} />

        {/* mouth — only drawn where it adds something */}
        <AnimatePresence>
          {state === "correct" || state === "celebrating" ? (
            <motion.path
              key="smile"
              d="M54 72 Q60 78 66 72"
              className="stroke-foreground"
              strokeWidth="2"
              strokeLinecap="round"
              fill="none"
              initial={{ opacity: 0, scale: 0.6 }}
              animate={{ opacity: 0.75, scale: 1 }}
              exit={{ opacity: 0 }}
              style={{ transformOrigin: "60px 74px" }}
            />
          ) : state === "wrong" ? (
            <motion.path
              key="frown"
              d="M54 76 Q60 71 66 76"
              className="stroke-foreground"
              strokeWidth="2"
              strokeLinecap="round"
              fill="none"
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.55 }}
              exit={{ opacity: 0 }}
            />
          ) : null}
        </AnimatePresence>
      </g>

      {/* --- Per-state flourishes ----------------------------------------- */}
      <AnimatePresence>
        {state === "thinking" && !reduce ? <ThinkingDots key="dots" /> : null}
        {state === "asleep" && !reduce ? <SleepZs key="zs" /> : null}
        {state === "celebrating" && !reduce ? <Confetti key="confetti" /> : null}
        {state === "overdue" ? <OverdueMark key="bang" /> : null}
      </AnimatePresence>
    </motion.svg>
  );
}

function Eyes({ state, reduce }: { state: CreatureState; reduce: boolean }) {
  // Called before any early return: hooks must run in the same order every
  // render, and "asleep" bails out below.
  const gesture = useIdleGesture(state === "idle" && !reduce);

  // Asleep is two closed lines rather than dots — much readable at 24px.
  if (state === "asleep") {
    return (
      <g className="stroke-foreground" strokeWidth="2.2" strokeLinecap="round">
        <path d="M48 64 Q52 61 56 64" opacity="0.7" />
        <path d="M64 64 Q68 61 72 64" opacity="0.7" />
      </g>
    );
  }

  const squint = state === "thinking";
  const wide = state === "correct" || state === "celebrating";
  const ry = squint ? 1.6 : wide ? 6 : 4.6;

  // A fixed-interval blink reads as mechanical within about thirty seconds —
  // roughly how long a review session keeps this on screen. The schedule is
  // randomised instead, and every so often it blinks twice or glances aside.
  const blinkKeyframes =
    gesture === "double-blink"
      ? [ry, 0.6, ry, 0.6, ry]
      : gesture === "blink"
        ? [ry, 0.6, ry]
        : ry;

  return (
    <motion.g
      className="fill-foreground"
      initial={false}
      // A glance is the whole face shifting a couple of pixels, not the pupils
      // sliding inside the eyes — at 24px the latter is invisible.
      animate={{ x: gesture === "glance" ? [0, 3.5, 3.5, 0] : 0 }}
      transition={
        gesture === "glance"
          ? { duration: 1.5, times: [0, 0.18, 0.8, 1], ease: "easeInOut" }
          : { duration: 0.3 }
      }
    >
      {[52, 68].map((cx) => (
        <motion.ellipse
          key={cx}
          cx={cx}
          cy="63"
          rx={squint ? 5 : 3.6}
          initial={false}
          animate={reduce ? { ry } : { ry: blinkKeyframes }}
          transition={
            reduce
              ? { duration: 0 }
              : typeof blinkKeyframes === "number"
                ? SPRING
                : { duration: gesture === "double-blink" ? 0.42 : 0.22 }
          }
          opacity="0.85"
        />
      ))}
    </motion.g>
  );
}

type IdleGesture = "none" | "blink" | "double-blink" | "glance";

/**
 * Schedules the next small idle movement at an irregular interval.
 *
 * Randomising the *timing* matters more than adding more gestures: the tell
 * that something is animated rather than alive is metronomic repetition.
 */
function useIdleGesture(enabled: boolean): IdleGesture {
  const [gesture, setGesture] = useState<IdleGesture>("none");

  useEffect(() => {
    if (!enabled) return;

    let timer: ReturnType<typeof setTimeout>;

    const schedule = () => {
      // 2.4-7.4s apart, so two consecutive gaps are rarely the same length.
      timer = setTimeout(
        () => {
          const roll = Math.random();
          setGesture(roll < 0.62 ? "blink" : roll < 0.84 ? "double-blink" : "glance");
          // Return to rest, then queue the next one.
          timer = setTimeout(() => {
            setGesture("none");
            schedule();
          }, 1600);
        },
        2400 + Math.random() * 5000,
      );
    };

    schedule();
    return () => {
      clearTimeout(timer);
      // Cleared on the way out rather than on the way in, so disabling never
      // sets state during the render that disabled it.
      setGesture("none");
    };
  }, [enabled]);

  // Derived rather than stored: a disabled creature is never mid-gesture,
  // and reading it this way needs no extra render to settle.
  return enabled ? gesture : "none";
}

function ThinkingDots() {
  return (
    <motion.g exit={{ opacity: 0 }}>
      {[0, 1, 2].map((i) => (
        <motion.circle
          key={i}
          cx={86 + i * 9}
          cy={30 - i * 5}
          r={2 + i * 0.6}
          className="fill-primary"
          initial={{ opacity: 0, scale: 0.4 }}
          animate={{ opacity: [0, 0.9, 0], scale: [0.4, 1, 0.4] }}
          transition={{
            duration: 1.5,
            repeat: Infinity,
            delay: i * 0.22,
            ease: "easeInOut",
          }}
        />
      ))}
    </motion.g>
  );
}

function SleepZs() {
  return (
    <motion.g exit={{ opacity: 0 }} className="fill-muted-foreground">
      {[0, 1].map((i) => (
        <motion.text
          key={i}
          x={84 + i * 10}
          y={38 - i * 12}
          fontSize={11 + i * 4}
          fontWeight="600"
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: [0, 0.7, 0], y: [6, -6, -14] }}
          transition={{
            duration: 2.6,
            repeat: Infinity,
            delay: i * 0.9,
            ease: "easeOut",
          }}
        >
          z
        </motion.text>
      ))}
    </motion.g>
  );
}

function Confetti() {
  // Deterministic offsets — a random() here would differ between the server
  // and client render and trip hydration.
  const bits = [
    { x: 24, y: 30, r: -20, c: "fill-primary" },
    { x: 96, y: 26, r: 25, c: "fill-success" },
    { x: 34, y: 16, r: 40, c: "fill-warning" },
    { x: 88, y: 46, r: -35, c: "fill-primary" },
    { x: 60, y: 8, r: 10, c: "fill-success" },
  ];
  return (
    <motion.g exit={{ opacity: 0 }}>
      {bits.map((bit, i) => (
        <motion.rect
          key={i}
          x={bit.x}
          y={bit.y}
          width="5"
          height="3"
          rx="1"
          className={bit.c}
          initial={{ opacity: 0, scale: 0, rotate: 0 }}
          animate={{
            opacity: [0, 1, 0],
            scale: [0, 1, 0.8],
            rotate: bit.r,
            y: [bit.y, bit.y - 16],
          }}
          transition={{ duration: 1.1, delay: i * 0.06, ease: "easeOut" }}
        />
      ))}
    </motion.g>
  );
}

function OverdueMark() {
  return (
    <motion.g
      initial={{ opacity: 0, scale: 0.5, y: 4 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.5 }}
      transition={SPRING}
    >
      <circle cx="92" cy="30" r="11" className="fill-primary" />
      <path
        d="M92 24 L92 32"
        className="stroke-primary-foreground"
        strokeWidth="2.6"
        strokeLinecap="round"
      />
      <circle cx="92" cy="36" r="1.5" className="fill-primary-foreground" />
    </motion.g>
  );
}
