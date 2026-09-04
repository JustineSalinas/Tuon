"use client";

import { useEffect, useRef, useState } from "react";
import { useInView, useReducedMotion } from "motion/react";

import { useI18n } from "@/components/providers/i18n-provider";
import {
  HORIZON_DAYS,
  REVIEW_DAYS,
  asPercent,
  recallWithReviews,
  recallWithoutReview,
  reviewsDoneBy,
} from "@/lib/marketing/memory";
import { cn } from "@/lib/utils";

/**
 * Forgetting, happening to one card you are looking at.
 *
 * This replaced a two-series chart. The chart was accurate and nobody read it:
 * two curves, four dots and four labels is six things to decode, and the
 * eyebrow above it asks "why you forget" — a question about a mechanism, which
 * a shape on an axis cannot answer.
 *
 * So the mechanism is shown instead of plotted. One real card, two copies of
 * it, and a month you can drag through. The answer on the unreviewed copy
 * blurs away as the days pass until it cannot be read; the reviewed copy stays
 * sharp. Nobody has to interpret anything — they watch it go.
 *
 * The QUESTION stays sharp on both, which is not decoration: recognising the
 * prompt long after you have lost the answer is exactly what forgetting feels
 * like, and it is the reason people think they know material they cannot
 * actually produce.
 *
 * It plays itself once when scrolled into view, because most visitors will
 * never touch a control, and hands over the moment anyone drags the slider.
 * The numbers all come from `lib/marketing/memory`, which is tested against
 * the figures the copy states in words.
 */

const SWEEP_MS = 2600;

/** Blur in px at total loss. Enough to be unreadable, short of a grey smear. */
const MAX_BLUR = 4.5;

function AnswerText({ text, recall }: { text: string; recall: number }) {
  return (
    <p
      className="mt-2 text-[0.9375rem] leading-relaxed"
      style={{
        filter: `blur(${((1 - recall) * MAX_BLUR).toFixed(2)}px)`,
        opacity: 0.12 + recall * 0.88,
      }}
    >
      {text}
    </p>
  );
}

function Readout({ percent, accent }: { percent: number; accent: boolean }) {
  const { t } = useI18n();
  return (
    <div className="mt-5 flex items-baseline gap-2 border-t pt-4">
      <span
        className={cn(
          "font-display text-3xl font-semibold tabular-nums tracking-tight",
          accent ? "text-primary" : "text-muted-foreground",
        )}
      >
        {percent}%
      </span>
      <span className="text-muted-foreground text-sm">{t.marketing.curve.recall}</span>
    </div>
  );
}

export function MemoryDecay() {
  const { t } = useI18n();
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-100px" });
  const reduce = useReducedMotion();

  const [day, setDay] = useState(0);
  /** Once someone drags, the demo stops driving itself and never resumes. */
  const touched = useRef(false);

  useEffect(() => {
    if (!inView || touched.current) return;

    // Reduced motion still gets the answer, just without the journey: a zero
    // duration lands on the end state on the first frame.
    const duration = reduce ? 0 : SWEEP_MS;
    const started = performance.now();
    let frame = 0;

    const tick = (now: number) => {
      if (touched.current) return;
      const progress = duration === 0 ? 1 : Math.min(1, (now - started) / duration);
      // Decelerating, so it settles into the month rather than stopping dead.
      const eased = 1 - Math.pow(1 - progress, 3);
      setDay(eased * HORIZON_DAYS);
      if (progress < 1) frame = requestAnimationFrame(tick);
    };

    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [inView, reduce]);

  const alone = recallWithoutReview(day);
  const scheduled = recallWithReviews(day);
  const done = reviewsDoneBy(day);
  const wholeDay = Math.round(day);

  return (
    <div ref={ref} className="mt-8">
      <p className="max-w-2xl text-lg leading-relaxed">{t.marketing.curve.lead}</p>

      <div
        className="mt-8 grid gap-4 sm:grid-cols-2"
        role="img"
        aria-label={t.marketing.curve.alt}
      >
        {/* Left — the card nobody comes back to. */}
        <div className="border-border bg-card rounded-2xl border p-5">
          <p className="text-muted-foreground text-xs font-medium tracking-widest uppercase">
            {t.marketing.curve.onceLabel}
          </p>
          <p className="mt-4 text-sm font-medium">{t.marketing.curve.question}</p>
          <AnswerText text={t.marketing.curve.answer} recall={alone} />
          <Readout percent={asPercent(alone)} accent={false} />
        </div>

        {/* Right — the same card, met again on schedule. */}
        <div className="border-primary/40 bg-accent/25 rounded-2xl border p-5">
          <div className="flex items-center justify-between gap-3">
            <p className="text-muted-foreground text-xs font-medium tracking-widest uppercase">
              {t.marketing.curve.reviewedLabel}
            </p>
            {/* One dot per scheduled review, filling in as the month passes. */}
            <span className="flex gap-1" aria-hidden="true">
              {REVIEW_DAYS.map((reviewDay, index) => (
                <span
                  key={reviewDay}
                  className={cn(
                    "size-1.5 rounded-full transition-colors",
                    index < done ? "bg-primary" : "bg-primary/20",
                  )}
                />
              ))}
            </span>
          </div>
          <p className="mt-4 text-sm font-medium">{t.marketing.curve.question}</p>
          <AnswerText text={t.marketing.curve.answer} recall={scheduled} />
          <Readout percent={asPercent(scheduled)} accent />
        </div>
      </div>

      {/* The control. Labelled at both ends, because a bare slider does not
          say what dragging it means. */}
      <div className="mt-5">
        <div className="text-muted-foreground flex items-baseline justify-between text-xs">
          <span>{t.marketing.curve.today}</span>
          <span className="text-foreground font-medium tabular-nums">
            {t.marketing.curve.dayLabel(wholeDay)}
          </span>
          <span>{t.marketing.curve.oneMonth}</span>
        </div>
        <input
          type="range"
          min={0}
          max={HORIZON_DAYS}
          step={0.5}
          value={day}
          aria-label={t.marketing.curve.scrub}
          onChange={(event) => {
            touched.current = true;
            setDay(Number(event.target.value));
          }}
          className="accent-primary mt-2 h-1.5 w-full cursor-grab appearance-none rounded-full bg-[color-mix(in_oklch,var(--color-primary)_22%,transparent)] active:cursor-grabbing"
        />
      </div>

      <p className="mt-6 flex flex-wrap items-center gap-x-2 text-sm">
        <span className="bg-primary size-2 rounded-full" aria-hidden="true" />
        <span className="font-medium">{t.marketing.curve.fourReviews}</span>
        <span className="text-muted-foreground">
          {t.marketing.curve.wholeDifference}
        </span>
      </p>

      <p className="text-muted-foreground mt-3 text-xs leading-relaxed">
        {t.marketing.curve.source}
      </p>
    </div>
  );
}
