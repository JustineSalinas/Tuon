"use client";

import Link from "next/link";
import { motion } from "motion/react";
import { ArrowRight, FileText, Layers, Plus, Sparkles } from "lucide-react";

import { PaperCreature } from "@/components/brand/paper-creature";
import { useI18n } from "@/components/providers/i18n-provider";
import type { Messages } from "@/lib/i18n/en";
import { CREATURE_NAME } from "@/lib/brand";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * The first thing a new account sees.
 *
 * It is also the only screen guaranteed to be seen by everyone, and the one
 * with no data to lean on — so it has to carry the product on its own. The
 * version this replaces was a bordered box of three bullet points sitting in
 * two-thirds of a blank page: accurate, and it read as an app that had failed
 * to load.
 *
 * Three things earn their place here. Tala, because a mascot that appears
 * everywhere except a user's first impression is a wasted mascot. The steps
 * laid out horizontally, because a short vertical list in a wide column is
 * what made the page look empty. And a worked example at the bottom, because
 * "Tuón writes the flashcards" is a claim, while showing one is not.
 */

/** The words are in the catalogue; only the icons are structural. */
const STEP_ICONS = [FileText, Sparkles, Layers];

export function FirstRun() {
  const { t } = useI18n();
  const steps = t.firstRun.steps;

  return (
    <div className="py-4 md:py-8">
      {/* Welcome. Centred and given room, because everything below is optional
          reading and this is not. */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
        className="paper-grain border-primary/25 bg-accent/30 relative overflow-hidden rounded-3xl border px-6 py-10 text-center sm:px-10 sm:py-14"
      >
        <div className="relative z-10">
          <PaperCreature
            state="idle"
            className="mx-auto size-28 sm:size-32"
            title={t.firstRun.companion(CREATURE_NAME)}
          />

          <h2 className="font-display mt-4 text-3xl font-semibold tracking-tight text-balance sm:text-4xl">
            {t.firstRun.heading}
          </h2>
          <p className="text-muted-foreground mx-auto mt-3 max-w-md leading-relaxed text-balance">
            {t.firstRun.body(CREATURE_NAME)}
          </p>

          <Button
            size="lg"
            className="mt-8 text-base max-sm:w-full"
            render={<Link href="/app/notes/new" />}
          >
            <Plus />
            {t.firstRun.createFirst}
          </Button>
          <p className="text-muted-foreground mt-3 text-sm">
            {t.firstRun.aboutAMinute}
          </p>
        </div>

        {/* Warmth behind the card, not on top of the text. */}
        <div
          aria-hidden="true"
          className="bg-primary/10 pointer-events-none absolute -top-24 -right-24 size-72 rounded-full blur-3xl"
        />
      </motion.div>

      {/* The loop, across the page rather than down it. */}
      <div className="mt-12 grid gap-8 sm:grid-cols-3 sm:gap-6">
        {steps.map((step, index) => {
          const Icon = STEP_ICONS[index];
          return (
          <motion.div
            key={step.title}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, delay: 0.1 + index * 0.08 }}
            className="relative"
          >
            {/* Joins the steps into one sequence on wide screens. Decorative,
                so it stops before the last column rather than dangling. */}
            {index < steps.length - 1 ? (
              <span
                aria-hidden="true"
                className="bg-border absolute top-5 left-[calc(50%+2rem)] hidden h-px w-[calc(100%-4rem)] sm:block"
              />
            ) : null}

            <div className="flex items-center gap-3 sm:flex-col sm:items-start">
              <span
                className={cn(
                  "bg-card relative z-10 grid size-10 shrink-0 place-items-center rounded-xl border",
                  index === 0 ? "border-primary/50 text-primary" : "text-muted-foreground",
                )}
              >
                <Icon className="size-4.5" />
              </span>
              <div className="text-muted-foreground text-xs font-medium tracking-widest uppercase sm:mt-4">
                {t.firstRun.step(index + 1)}
              </div>
            </div>

            <h3 className="font-display mt-2 text-lg font-semibold tracking-tight">
              {step.title}
            </h3>
            <p className="text-muted-foreground mt-1.5 text-sm leading-relaxed">
              {step.body}
            </p>
          </motion.div>
          );
        })}
      </div>

      <SampleOutput t={t} />
    </div>
  );
}

/**
 * One real card, so the promise above is shown rather than asserted.
 *
 * Static markup on purpose: this renders before the account has any data, and
 * it must never wait on a request or look like something that failed to load.
 */
function SampleOutput({ t }: { t: Messages }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: 0.35 }}
      className="mt-14"
    >
      <p className="text-muted-foreground text-xs font-medium tracking-widest uppercase">
        {t.firstRun.whatComesOut}
      </p>

      <div className="mt-4 grid items-center gap-4 md:grid-cols-[1fr_auto_1fr]">
        <div className="border-border bg-card rounded-2xl border p-4">
          <div className="text-muted-foreground mb-2 flex items-center gap-2 text-xs font-medium">
            <FileText className="size-3.5" />
            {t.firstRun.yourNote}
          </div>
          <p className="text-muted-foreground text-sm leading-relaxed">
            {t.firstRun.sampleNote}
          </p>
        </div>

        <ArrowRight
          className="text-muted-foreground mx-auto size-5 max-md:rotate-90"
          aria-hidden="true"
        />

        <div className="border-primary/30 bg-accent/30 rounded-2xl border p-4">
          <div className="text-primary mb-2 text-xs font-medium tracking-widest uppercase">
            {t.firstRun.sampleCardIndex}
          </div>
          <p className="font-display text-base font-semibold">
            {t.firstRun.sampleFront}
          </p>
          <p className="text-muted-foreground mt-2 border-t pt-2 text-sm">
            {t.firstRun.sampleBack}
          </p>
          <p className="text-muted-foreground mt-2 text-xs">{t.firstRun.sampleNext}</p>
        </div>
      </div>
    </motion.div>
  );
}
