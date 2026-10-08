"use client";

import { motion, useReducedMotion } from "motion/react";

import { PaperCreature } from "@/components/brand/paper-creature";
import { TuonMark } from "@/components/brand/logo";
import { useI18n } from "@/components/providers/i18n-provider";
import { PLANS } from "@/lib/ai/config";

/** Fixed, not random — same reasoning as the hero's tree layout: stable
 *  across renders, doesn't reshuffle on every Fast Refresh. */
const FIREFLY_SPOTS = [
  { left: "12%", top: "22%", duration: 3.2, delay: 0 },
  { left: "78%", top: "16%", duration: 2.8, delay: 0.6 },
  { left: "88%", top: "58%", duration: 3.6, delay: 1.1 },
  { left: "8%", top: "68%", duration: 3.0, delay: 1.8 },
  { left: "40%", top: "8%", duration: 2.6, delay: 0.4 },
] as const;

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
      {/* Two soft forest-green blobs rather than a flat wash — depth without
          a single hard gradient edge anywhere in the panel. Clipped to the
          panel by the aside's own overflow-hidden, so neither ever reaches
          the divider against the form. Fixed hex rather than --primary: this
          panel is now locked to the forest palette regardless of whatever
          palette the page itself resolves to, so it needs its own colour,
          not the token that would follow a different one. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-24 -left-24 size-[380px] rounded-full bg-[#6fa478]/15 blur-3xl"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -bottom-32 left-1/2 size-[320px] -translate-x-1/2 rounded-full bg-[#6fa478]/10 blur-3xl"
      />

      {/* A handful of static fireflies — the hero's WebGL ones would be
          heavy to ship on a page students land on mid-signup-funnel, where
          load speed matters more than atmosphere. A few CSS-animated dots
          carry the same motif at near-zero cost. */}
      {!reduceMotion
        ? FIREFLY_SPOTS.map((f, i) => (
            <motion.span
              key={i}
              aria-hidden="true"
              className="pointer-events-none absolute size-1 rounded-full bg-[#f2c879]"
              style={{
                left: f.left,
                top: f.top,
                boxShadow: "0 0 6px 2px rgba(242,200,121,0.7)",
              }}
              animate={{ opacity: [0.2, 0.9, 0.2], y: [0, -10, 0] }}
              transition={{
                duration: f.duration,
                delay: f.delay,
                repeat: Infinity,
                ease: "easeInOut",
              }}
            />
          ))
        : null}

      <motion.div className="relative z-10 w-full max-w-md" {...container}>
        <motion.div {...item} className="flex items-center gap-3">
          <TuonMark className="text-primary size-9" />
          <span className="text-primary text-xs font-medium tracking-widest uppercase">
            {t.auth.aside.eyebrow}
          </span>
        </motion.div>

        <motion.p
          {...item}
          className="font-display mt-8 text-4xl leading-[1.1] font-semibold tracking-tight text-balance"
        >
          {t.auth.aside.meaning}
        </motion.p>

        <motion.p {...item} className="text-muted-foreground mt-5 text-[15px] leading-relaxed">
          {t.auth.aside.body}
        </motion.p>

        <motion.dl {...item} className="mt-10 grid grid-cols-3 gap-3">
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

        {/* Grounded rather than pinned to a corner: a small shadow under her
            feet is what tells the eye she's standing on something, not
            dropped onto the panel. Previously sat in the header row next to
            the eyebrow text with nothing under her — "anchored to the mark
            and eyebrow" only worked as a baseline argument, not a visual
            one, and read as floating regardless of the reasoning behind it. */}
        <motion.div {...item} className="mt-8">
          <div className="relative inline-block">
            <PaperCreature state="idle" className="size-16 shrink-0" />
            <div
              aria-hidden="true"
              className="absolute -bottom-1 left-1/2 h-2 w-10 -translate-x-1/2 rounded-full bg-black/25 blur-sm"
            />
          </div>
        </motion.div>
      </motion.div>
    </aside>
  );
}
