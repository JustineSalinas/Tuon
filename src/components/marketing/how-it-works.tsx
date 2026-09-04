"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useInView, useReducedMotion } from "motion/react";
import { FileText, Layers, Sparkles } from "lucide-react";

import { useI18n } from "@/components/providers/i18n-provider";
import { SAMPLE_FLASHCARDS, SAMPLE_NOTE } from "@/lib/marketing/sample-set";
import { cn } from "@/lib/utils";

/**
 * The three steps, as one thing changing rather than three pictures.
 *
 * They used to be three cards side by side — an icon, a heading and a
 * paragraph each. That layout hides the only interesting claim, which is that
 * the SAME material moves through all three: the note becomes the cards, and
 * the cards become the schedule. Three separate illustrations show three
 * unrelated features.
 *
 * So it is one panel with three states, playing itself once and handing over
 * the moment anyone touches a step. The content is the real sample set — the
 * same note and the same generated cards the "see it work" section uses
 * further down, so nothing here is a mockup of a thing the product might not
 * do.
 */

const STEP_ICONS = [FileText, Sparkles, Layers];
const DWELL_MS = 5200;

/** The cards the fan shows. Three is enough to read as "several". */
const FANNED = SAMPLE_FLASHCARDS.slice(0, 3);

function NoteStage() {
  const reduce = useReducedMotion();
  const body = SAMPLE_NOTE.excerpt.slice(0, 210);

  return (
    <div className="border-border bg-background rounded-xl border p-4 sm:p-5">
      <div className="flex items-center gap-2">
        <span className="bg-secondary text-muted-foreground rounded-md px-2 py-0.5 text-[11px]">
          {SAMPLE_NOTE.courseTag}
        </span>
      </div>
      <p className="mt-3 text-sm font-medium">{SAMPLE_NOTE.title}</p>
      <p className="text-muted-foreground mt-2 text-[13px] leading-relaxed">
        {/* Typed in rather than simply present: pasting notes is the step, and
            a block of text that was always there does not show a step. */}
        {reduce ? (
          body
        ) : (
          <motion.span
            initial={{ clipPath: "inset(0 100% 0 0)" }}
            animate={{ clipPath: "inset(0 0% 0 0)" }}
            transition={{ duration: 2.2, ease: "linear" }}
            className="inline-block"
          >
            {body}
          </motion.span>
        )}
        <span className="bg-primary ml-0.5 inline-block h-[13px] w-[1.5px] align-middle" />
      </p>
    </div>
  );
}

function CardsStage() {
  return (
    <div className="relative">
      <div className="grid gap-2.5">
        {FANNED.map((card, index) => (
          <motion.div
            key={card.id}
            initial={{ opacity: 0, y: -14, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ delay: index * 0.18, duration: 0.4, ease: "easeOut" }}
            className="border-border bg-background rounded-xl border p-3.5"
          >
            <p className="text-[13px] font-medium">{card.front}</p>
            <p className="text-muted-foreground mt-1.5 text-[13px]">{card.back}</p>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

function ReviewStage() {
  const { t } = useI18n();
  const card = SAMPLE_FLASHCARDS[0];

  return (
    <div>
      <motion.div
        initial={{ rotateX: -88, opacity: 0 }}
        animate={{ rotateX: 0, opacity: 1 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        style={{ transformPerspective: 900, transformOrigin: "top" }}
        className="border-border bg-background rounded-xl border p-4"
      >
        <p className="text-muted-foreground text-[11px] tracking-widest uppercase">
          {t.marketing.how.answer}
        </p>
        <p className="mt-1.5 text-sm">{card.back}</p>
      </motion.div>

      <div className="mt-3 grid grid-cols-4 gap-1.5">
        {t.marketing.how.ratings.map((rating, index) => (
          <motion.div
            key={rating}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35 + index * 0.07, duration: 0.25 }}
            className={cn(
              "rounded-lg border px-2 py-2 text-center text-[12px] font-medium",
              // "Good" is highlighted because a row of four identical buttons
              // does not show that one of them is about to be pressed.
              index === 2
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border text-muted-foreground",
            )}
          >
            {rating}
          </motion.div>
        ))}
      </div>

      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.8, duration: 0.3 }}
        className="text-muted-foreground mt-3 text-center text-[13px]"
      >
        {t.marketing.how.nextDue}
      </motion.p>
    </div>
  );
}

const STAGES = [NoteStage, CardsStage, ReviewStage];

export function HowItWorks() {
  const { t } = useI18n();
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-100px" });
  const reduce = useReducedMotion();

  const [step, setStep] = useState(0);
  /** Once a step is clicked, it stops advancing on its own and never resumes. */
  const chosen = useRef(false);

  useEffect(() => {
    if (!inView || chosen.current || reduce) return;
    const timer = setInterval(() => {
      if (chosen.current) return;
      setStep((current) => (current === STAGES.length - 1 ? current : current + 1));
    }, DWELL_MS);
    return () => clearInterval(timer);
  }, [inView, reduce]);

  const Stage = STAGES[step];

  return (
    <div ref={ref} className="mt-12 grid gap-8 lg:grid-cols-[1fr_1.1fr] lg:gap-12">
      {/* The steps, as controls rather than as headings. */}
      <ol className="space-y-2">
        {t.marketing.how.steps.map((entry, index) => {
          const Icon = STEP_ICONS[index];
          const active = index === step;
          return (
            <li key={entry.title}>
              <button
                type="button"
                onClick={() => {
                  chosen.current = true;
                  setStep(index);
                }}
                aria-current={active ? "step" : undefined}
                className={cn(
                  "flex w-full items-start gap-3.5 rounded-xl border p-4 text-left transition-colors",
                  active
                    ? "border-primary/40 bg-accent/30"
                    : "border-transparent hover:bg-secondary/60",
                )}
              >
                <span
                  className={cn(
                    "grid size-9 shrink-0 place-items-center rounded-lg transition-colors",
                    active
                      ? "bg-primary text-primary-foreground"
                      : "bg-secondary text-muted-foreground",
                  )}
                >
                  <Icon className="size-4" />
                </span>
                <span className="min-w-0">
                  <span className="text-muted-foreground block text-[11px] font-medium tracking-widest uppercase">
                    {t.marketing.how.step(index + 1)}
                  </span>
                  <span className="font-display mt-0.5 block text-lg font-semibold tracking-tight">
                    {entry.title}
                  </span>
                  {active ? (
                    <span className="text-muted-foreground mt-1.5 block text-sm leading-relaxed">
                      {entry.body}
                    </span>
                  ) : null}
                </span>
              </button>
            </li>
          );
        })}
      </ol>

      {/* The same material, at whichever point in its life the step describes. */}
      <div className="border-border bg-card min-h-[19rem] rounded-2xl border p-4 sm:p-6">
        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={reduce ? undefined : { opacity: 0 }}
            animate={reduce ? undefined : { opacity: 1 }}
            exit={reduce ? undefined : { opacity: 0 }}
            transition={{ duration: 0.22 }}
          >
            <Stage />
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
