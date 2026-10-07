"use client";

import { motion, useReducedMotion } from "motion/react";

import { TuonMark } from "@/components/brand/logo";
import { TalaPerch } from "@/components/marketing/tala";
import { useI18n } from "@/components/providers/i18n-provider";
import { PLANS } from "@/lib/ai/config";

/**
 * The panel on auth screens that is not the form. Desktop only — on mobile
 * the form should own the whole viewport rather than making students scroll
 * past decoration to reach the password field.
 *
 * On the left of the form rather than the right: the form is the thing
 * someone came to do, and the eye lands on the left first in every language
 * this app ships in (including Filipino) — so the explanation of what
 * they're about to join reads before the field they're about to type into,
 * not after it.
 *
 * The third stat used to be "K-12 / SHS strands built in" — true only in the
 * Philippines, and the first thing an international visitor would read on
 * the page asking them to join. The free-tier count is the one number here
 * that is true of every account regardless of country, so it replaces it,
 * and is pulled from the same `PLANS` table the pricing section reads
 * rather than retyped.
 */
export function AuthAside() {
  const { t } = useI18n();
  const reduceMotion = useReducedMotion();

  const container = reduceMotion
    ? {}
    : {
        initial: "hidden" as const,
        animate: "visible" as const,
        variants: {
          hidden: {},
          visible: { transition: { staggerChildren: 0.09, delayChildren: 0.05 } },
        },
      };

  const item = reduceMotion
    ? {}
    : {
        variants: {
          hidden: { opacity: 0, y: 14 },
          visible: {
            opacity: 1,
            y: 0,
            transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] as const },
          },
        },
      };

  return (
    <aside className="bg-secondary/60 paper-grain relative hidden items-center justify-center overflow-hidden border-r px-12 lg:flex">
      {/* Two soft terracotta blobs rather than a flat wash — depth without
          a single hard gradient edge anywhere in the panel. */}
      <div
        aria-hidden="true"
        className="bg-primary/15 pointer-events-none absolute -top-24 -left-24 size-[380px] rounded-full blur-3xl"
      />
      <div
        aria-hidden="true"
        className="bg-primary/10 pointer-events-none absolute -right-32 bottom-0 size-[320px] rounded-full blur-3xl"
      />

      <TalaPerch className="top-10 right-10 size-20" />

      <motion.div className="relative z-10 max-w-md" {...container}>
        <motion.div {...item} className="flex items-center gap-3">
          <TuonMark className="text-primary size-9" />
          <span className="text-primary text-xs font-medium tracking-widest uppercase">
            {t.auth.aside.eyebrow}
          </span>
        </motion.div>

        <motion.p
          {...item}
          className="font-display mt-7 text-4xl leading-[1.1] font-semibold tracking-tight text-balance"
        >
          {t.auth.aside.meaning}
        </motion.p>

        <motion.p {...item} className="text-muted-foreground mt-5 text-[15px] leading-relaxed">
          {t.auth.aside.body}
        </motion.p>

        <motion.dl {...item} className="mt-11 grid grid-cols-3 gap-3">
          {[
            ["8–15", t.auth.aside.cardsPerNote],
            ["SM-2", t.auth.aside.spacedRepetition],
            [String(PLANS.free.monthlyGenerations), t.auth.aside.freeStudySets],
          ].map(([value, label]) => (
            <div
              key={label}
              className="border-border/60 bg-background/70 rounded-2xl border p-4 backdrop-blur-sm"
            >
              <dt className="font-display text-primary text-2xl font-semibold">
                {value}
              </dt>
              <dd className="text-muted-foreground mt-1.5 text-xs leading-snug">
                {label}
              </dd>
            </div>
          ))}
        </motion.dl>
      </motion.div>
    </aside>
  );
}
