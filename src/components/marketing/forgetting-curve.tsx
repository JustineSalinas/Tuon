"use client";

import { motion, useInView, useReducedMotion } from "motion/react";
import { useRef } from "react";

import { useI18n } from "@/components/providers/i18n-provider";

/**
 * Why studying once does not work.
 *
 * An earlier version of this was a proper two-series chart with a percentage
 * axis and a sawtooth. It was accurate and nobody could read it: it asked the
 * visitor to decode a shape before they got the point, and a landing page gets
 * about two seconds. This version leads with the ANSWER — one card in ten
 * versus nine — and uses the lines only as supporting illustration.
 *
 * The line that matters is the last one: the extra effort is about six
 * minutes. Without that, "review more" reads as "work harder", which is the
 * opposite of the pitch.
 *
 * HONESTY: these are the classic Ebbinghaus proportions, drawn to show the
 * mechanism — not measurements of Tuón users. The caption says so, and it
 * must keep saying so until there is real retention data to replace it with.
 */

const W = 640;
const H = 200;
const LEFT = 8;
const RIGHT = 632;
const BASE = 150;

// Only the x scale is still needed; the curves use explicit coordinates now.
const x = (day: number) => LEFT + (day / 30) * (RIGHT - LEFT);

/** Studied once, never revisited. */
const FORGOTTEN = "M8,16 C 40,100 70,124 110,132 C 220,146 400,152 632,152";

/**
 * Reviewed on schedule.
 *
 * Explicit anchor points rather than a freehand curve, so the review dots can
 * sit exactly on the recoveries. The true shape is a sawtooth; these are
 * gentle dips because vertical jumps read as rendering glitches and cost more
 * comprehension than the extra accuracy is worth.
 */
const REMEMBERED =
  "M8,16 Q24,34 40,40 Q56,30 70,24 Q100,40 130,46 Q145,34 160,28 " +
  "Q230,52 300,50 Q315,36 330,30 Q425,52 520,48 Q535,36 550,32 Q590,34 632,36";

/** Exactly the recovery peaks above — a dot each time the card comes back. */
const REVIEW_POINTS = [
  [70, 24],
  [160, 28],
  [330, 30],
  [550, 32],
] as const;

export function ForgettingCurve() {
  const { t } = useI18n();
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });
  const reduceMotion = useReducedMotion();

  const draw = (delay: number) =>
    reduceMotion
      ? {}
      : {
          initial: { pathLength: 0 },
          animate: inView ? { pathLength: 1 } : undefined,
          transition: { duration: 1.1, ease: "easeOut" as const, delay },
        };

  return (
    <div ref={ref} className="mt-10">
      {/* The answer first. Everything below is evidence for it. */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="border-border bg-card rounded-2xl border p-5">
          <p className="text-muted-foreground text-sm">{t.marketing.curve.onceLabel}</p>
          <p className="font-display mt-2 text-3xl font-semibold tracking-tight">
            {t.marketing.curve.onceValueBefore}{" "}
            <span className="text-muted-foreground">{t.marketing.curve.onceValue}</span>
          </p>
          <p className="text-muted-foreground mt-1 text-sm">
            {t.marketing.curve.aMonthLater}
          </p>
        </div>

        <div className="border-primary/40 bg-accent/30 rounded-2xl border p-5">
          <p className="text-muted-foreground text-sm">
            {t.marketing.curve.reviewedLabel}
          </p>
          <p className="font-display mt-2 text-3xl font-semibold tracking-tight">
            {t.marketing.curve.onceValueBefore}{" "}
            <span className="text-primary">{t.marketing.curve.reviewedValue}</span>
          </p>
          <p className="text-muted-foreground mt-1 text-sm">
            {t.marketing.curve.aMonthLater}
          </p>
        </div>
      </div>

      {/* Illustration, not homework. No axis, no percentages, no legend box —
          each line is labelled where it sits. */}
      <div className="border-border bg-card mt-4 overflow-x-auto rounded-2xl border p-5 sm:p-6">
        <svg
          viewBox={`0 0 ${W} ${H}`}
          className="h-auto w-full min-w-[460px]"
          role="img"
          aria-label={t.marketing.curve.chartAlt}
        >
          <motion.path
            d={FORGOTTEN}
            fill="none"
            className="stroke-muted-foreground/45"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeDasharray="6 5"
            // pathLength animation drives stroke-dasharray internally and
            // silently overrides ours, so this series fades in instead.
            initial={reduceMotion ? undefined : { opacity: 0 }}
            animate={inView && !reduceMotion ? { opacity: 1 } : undefined}
            transition={{ duration: 0.7, ease: "easeOut" }}
          />
          <motion.path
            d={REMEMBERED}
            fill="none"
            className="stroke-primary"
            strokeWidth="3"
            strokeLinecap="round"
            {...draw(0.3)}
          />

          {REVIEW_POINTS.map(([cx, cy], i) => (
            <motion.circle
              key={cx}
              cx={cx}
              cy={cy}
              r="4.5"
              className="fill-primary stroke-card"
              strokeWidth="2.5"
              initial={reduceMotion ? undefined : { opacity: 0, scale: 0 }}
              animate={inView && !reduceMotion ? { opacity: 1, scale: 1 } : undefined}
              transition={{ delay: 0.8 + i * 0.12, duration: 0.25 }}
            />
          ))}

          {/* Labelled at the right edge, where the lines are furthest apart. */}
          <text
            x={RIGHT}
            y="18"
            textAnchor="end"
            className="fill-primary text-[13px] font-medium"
          >
            {t.marketing.curve.keepIt}
          </text>
          <text
            x={RIGHT}
            y={BASE - 14}
            textAnchor="end"
            className="fill-muted-foreground text-[13px]"
          >
            {t.marketing.curve.fades}
          </text>

          <text x={LEFT} y={H - 8} className="fill-muted-foreground text-[11px]">
            {t.marketing.curve.today}
          </text>
          <text
            x={x(7)}
            y={H - 8}
            textAnchor="middle"
            className="fill-muted-foreground text-[11px]"
          >
            {t.marketing.curve.oneWeek}
          </text>
          <text
            x={RIGHT}
            y={H - 8}
            textAnchor="end"
            className="fill-muted-foreground text-[11px]"
          >
            {t.marketing.curve.oneMonth}
          </text>
        </svg>

        <p className="mt-4 flex flex-wrap items-center gap-x-2 text-sm">
          <span className="bg-primary size-2 rounded-full" aria-hidden="true" />
          <span className="font-medium">{t.marketing.curve.fourReviews}</span>
          <span className="text-muted-foreground">
            {t.marketing.curve.wholeDifference}
          </span>
        </p>
      </div>

      <p className="text-muted-foreground mt-3 text-xs leading-relaxed">
        {t.marketing.curve.source}
      </p>
    </div>
  );
}
