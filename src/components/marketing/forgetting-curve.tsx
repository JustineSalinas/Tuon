"use client";

import { motion, useInView, useReducedMotion } from "motion/react";
import { useRef } from "react";

/**
 * The forgetting curve — the page's "why this exists at all".
 *
 * Every other section explains what Tuón does. This one explains why anyone
 * should care: studying once does not work, and the shape of that failure is
 * well documented. Spaced repetition is the standard answer, and scheduling
 * those reviews is the entire product.
 *
 * HONESTY: this is the classic Ebbinghaus shape, drawn to illustrate the
 * mechanism — not measured data from Tuón users. The caption says so. Once
 * there is real retention data, replace the curves and say which it is; do
 * not quietly leave an illustration looking like a measurement.
 *
 * Two series, so a legend is present and both lines are directly labelled —
 * identity is never carried by colour alone.
 */

const W = 720;
const H = 250;
const LEFT = 46;
const RIGHT = 690;
const TOP = 20;
const BASE = 210;

const x = (day: number) => LEFT + (day / 30) * (RIGHT - LEFT);
const y = (pct: number) => BASE - (pct / 100) * (BASE - TOP);

/** Studied once, never revisited. */
const WITHOUT: [number, number][] = [
  [0, 100],
  [1, 58],
  [2, 44],
  [3, 36],
  [5, 28],
  [7, 23],
  [14, 17],
  [21, 14],
  [30, 12],
];

/** Reviewed on schedule: each review resets recall and the next gap is longer. */
const REVIEW_DAYS = [1, 3, 7, 16];
const WITH: [number, number][] = [
  [0, 100],
  [1, 72],
  [1, 100],
  [3, 84],
  [3, 100],
  [7, 88],
  [7, 100],
  [16, 90],
  [16, 100],
  [30, 93],
];

const toPath = (points: [number, number][]) =>
  points.map(([d, p], i) => `${i === 0 ? "M" : "L"}${x(d)},${y(p)}`).join(" ");

export function ForgettingCurve() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });
  const reduceMotion = useReducedMotion();

  return (
    <div ref={ref} className="mt-10">
      {/* Legend — always present for two series. */}
      <div className="mb-4 flex flex-wrap items-center gap-x-6 gap-y-2">
        <span className="flex items-center gap-2 text-sm">
          <span className="bg-primary h-0.5 w-6 rounded-full" aria-hidden="true" />
          Reviewed on Tuón&rsquo;s schedule
        </span>
        <span className="text-muted-foreground flex items-center gap-2 text-sm">
          <span
            className="border-muted-foreground/60 w-6 border-t-2 border-dashed"
            aria-hidden="true"
          />
          Studied once, the night before
        </span>
      </div>

      <div className="border-border bg-card overflow-x-auto rounded-2xl border p-4 sm:p-6">
        <svg
          viewBox={`0 0 ${W} ${H}`}
          className="h-auto w-full min-w-[560px]"
          role="img"
          aria-label="How much you remember over thirty days. Studied once, recall falls to around a tenth within a month. Reviewed on schedule, each review restores it and the gaps get longer, so recall stays high."
        >
          {/* Recessive grid */}
          {[0, 50, 100].map((pct) => (
            <g key={pct}>
              <line
                x1={LEFT}
                y1={y(pct)}
                x2={RIGHT}
                y2={y(pct)}
                className="stroke-border"
                strokeWidth="1"
              />
              <text
                x={LEFT - 10}
                y={y(pct) + 4}
                textAnchor="end"
                className="fill-muted-foreground text-[11px]"
              >
                {pct}%
              </text>
            </g>
          ))}

          {[0, 7, 14, 21, 30].map((day) => (
            <text
              key={day}
              x={x(day)}
              y={BASE + 22}
              textAnchor="middle"
              className="fill-muted-foreground text-[11px]"
            >
              {day === 0 ? "Today" : `Day ${day}`}
            </text>
          ))}

          {/* Studied once */}
          <motion.path
            d={toPath(WITHOUT)}
            fill="none"
            className="stroke-muted-foreground/50"
            strokeWidth="2"
            strokeLinecap="round"
            strokeDasharray="5 4"
            initial={reduceMotion ? undefined : { opacity: 0 }}
            animate={inView && !reduceMotion ? { opacity: 1 } : undefined}
            transition={{ duration: 0.7, ease: "easeOut" }}
          />

          {/* Reviewed on schedule */}
          <motion.path
            d={toPath(WITH)}
            fill="none"
            className="stroke-primary"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            initial={reduceMotion ? undefined : { pathLength: 0 }}
            animate={inView && !reduceMotion ? { pathLength: 1 } : undefined}
            transition={{ duration: 1.3, ease: "easeOut", delay: 0.25 }}
          />

          {/* A dot at each scheduled review — the thing Tuón actually does. */}
          {REVIEW_DAYS.map((day, i) => (
            <motion.circle
              key={day}
              cx={x(day)}
              cy={y(100)}
              r="4"
              className="fill-primary stroke-card"
              strokeWidth="2"
              initial={reduceMotion ? undefined : { opacity: 0, scale: 0 }}
              animate={inView && !reduceMotion ? { opacity: 1, scale: 1 } : undefined}
              transition={{ delay: 0.6 + i * 0.15, duration: 0.3 }}
            />
          ))}

          {/* Direct labels — colour is never the only cue. */}
          <text
            x={RIGHT}
            y={y(93) - 12}
            textAnchor="end"
            className="fill-primary text-[12px] font-medium"
          >
            You still know it
          </text>
          <text
            x={RIGHT}
            y={y(12) - 12}
            textAnchor="end"
            className="fill-muted-foreground text-[12px]"
          >
            Gone
          </text>
        </svg>
      </div>

      <p className="text-muted-foreground mt-3 text-xs leading-relaxed">
        The classic forgetting curve, first measured by Hermann Ebbinghaus in
        1885 and reproduced many times since. Drawn here to show the mechanism —
        these are not measurements of Tuón users. Spaced repetition is the
        standard answer to it, and the dots are the reviews Tuón schedules for
        you.
      </p>
    </div>
  );
}
