"use client";

import { useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import {
  ArrowRight,
  CalendarDays,
  Check,
  FileText,
  Home,
  Layers,
  MessageCircle,
  Flag,
  Network,
  Plus,
  TrendingUp,
  Users,
} from "lucide-react";
import Link from "next/link";

import { TuonMark } from "@/components/brand/logo";
import { useI18n } from "@/components/providers/i18n-provider";
import { Button } from "@/components/ui/button";
import { SAMPLE_FLASHCARDS, SAMPLE_NOTE } from "@/lib/marketing/sample-set";
import { scheduleNextReview, shouldRequeueInSession } from "@/lib/srs/sm2";
import type { SrsState } from "@/lib/srs/sm2";
import type { SrsRating } from "@/lib/types";
import { cn } from "@/lib/utils";

/**
 * The signed-in dashboard, in the hero, working.
 *
 * Two rules govern what is in here. It has to be the REAL dashboard — the same
 * eight nav items in the same order as `app-shell`, the same section headings
 * from the same catalogue keys the app itself reads, the same greeting —
 * because a landing page that shows a tidier app than the one you get is a
 * promise the product breaks on its first screen. And Today's plan has to
 * actually work, because the question this answers ("is this any good?")
 * arrives in the first three seconds, and a visitor who has already rated a
 * card has stopped asking it.
 *
 * The intervals under the four buttons come from `lib/srs/sm2`, the same module
 * the product schedules against. Press Easy and the number you see is the
 * number you would get.
 */

const NAV = [
  { key: "home", icon: Home },
  { key: "notes", icon: FileText },
  { key: "sets", icon: Layers },
  { key: "calendar", icon: CalendarDays },
  { key: "tala", icon: MessageCircle },
  { key: "groups", icon: Users },
  { key: "graph", icon: Network },
  { key: "retention", icon: TrendingUp },
] as const;

const RATINGS: SrsRating[] = ["again", "hard", "good", "easy"];
const CARDS = SAMPLE_FLASHCARDS;

/**
 * A plausible week or two of history per card.
 *
 * Not `initialSrsState()`, which was the first version and was wrong for a
 * demo: on a card that has never been reviewed SM-2 returns one day for every
 * passing rating, so all four buttons read the same and the most interesting
 * thing about the product — that the four choices lead somewhere different —
 * is invisible at the moment someone is deciding whether to care.
 */
const SEEDS: SrsState[] = [
  { easeFactor: 2.5, intervalDays: 6, repetitions: 2 },
  { easeFactor: 2.36, intervalDays: 3, repetitions: 1 },
  { easeFactor: 2.6, intervalDays: 15, repetitions: 3 },
  { easeFactor: 2.22, intervalDays: 2, repetitions: 1 },
  { easeFactor: 2.5, intervalDays: 9, repetitions: 2 },
  { easeFactor: 2.68, intervalDays: 21, repetitions: 3 },
];

/** A plausible week: a couple of heavy nights, a quiet Friday, a gap. */
const WEEK = [25, 0, 48, 32, 0, 15, 40];

/** Deadlines a real term produces, for the column beside the week. */
const DUE = [
  { title: "Gen Chem long quiz", subject: "General Chemistry 1", when: "today" },
  { title: "Bio lab report", subject: "General Biology 1", when: "tomorrow" },
  { title: "Pre-Calc problem set", subject: "Pre-Calculus", when: "days" },
] as const;

function WeekBars() {
  const { t } = useI18n();
  const total = WEEK.reduce((sum, value) => sum + value, 0);
  const scale = Math.max(60, ...WEEK);

  return (
    <div className="border-border bg-card rounded-xl border p-3.5">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <p className="font-display text-lg font-semibold tracking-tight">
          {t.marketing.hero.hoursMinutes(2, 40)}
        </p>
        <p className="text-muted-foreground text-[11px]">
          {t.dashboard.streakDays(12)}
        </p>
      </div>
      <div className="mt-3 flex items-end justify-between gap-1">
        {WEEK.map((value, index) => (
          <div key={index} className="flex min-w-0 flex-1 flex-col items-center gap-1">
            <div className="flex h-12 w-full items-end justify-center">
              <div
                className={cn(
                  "w-full max-w-5 rounded-t-[2px]",
                  value === 0 ? "bg-secondary" : index === 6 ? "bg-primary" : "bg-primary/55",
                )}
                style={{ height: value === 0 ? 2 : `${Math.max(6, (value / scale) * 48)}px` }}
              />
            </div>
            <span
              className={cn(
                "text-[10px]",
                index === 6 ? "text-foreground font-medium" : "text-muted-foreground",
              )}
            >
              {t.common.weekdaysNarrow[index]}
            </span>
          </div>
        ))}
      </div>
      <span className="sr-only">{total}</span>
    </div>
  );
}

function ComingUp() {
  const { t } = useI18n();

  return (
    <div className="flex flex-col gap-1.5">
      {DUE.map((item) => (
        <div
          key={item.title}
          className="border-border bg-card flex items-center gap-2 rounded-lg border p-2.5"
        >
          <Flag className="text-muted-foreground size-3.5 shrink-0" />
          <span className="min-w-0 flex-1">
            <span className="block truncate text-[13px] font-medium">{item.title}</span>
            <span className="text-muted-foreground block truncate text-[11px]">
              {item.subject}
            </span>
          </span>
          <span className="text-muted-foreground shrink-0 text-[11px]">
            {item.when === "today"
              ? t.common.today
              : item.when === "tomorrow"
                ? t.common.tomorrow
                : t.common.inDays(4)}
          </span>
        </div>
      ))}
    </div>
  );
}

function Sidebar() {
  const { t } = useI18n();

  return (
    <div className="bg-sidebar border-border hidden w-[186px] shrink-0 flex-col border-r p-3 lg:flex">
      <div className="mb-4 flex items-center gap-2 px-2 pt-1">
        <TuonMark className="text-primary size-6" />
        <span className="font-display text-lg font-semibold tracking-tight">Tuón</span>
      </div>

      <nav className="flex flex-col gap-0.5">
        {NAV.map(({ key, icon: Icon }, index) => (
          <span
            key={key}
            className={cn(
              "flex items-center gap-2.5 rounded-lg px-2.5 py-[7px] text-[13px]",
              index === 0
                ? "bg-accent text-foreground font-medium"
                : "text-muted-foreground",
            )}
          >
            <Icon className="size-4 shrink-0" />
            {t.nav[key]}
          </span>
        ))}
      </nav>

      <span className="bg-primary text-primary-foreground mt-4 flex items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-[13px] font-medium">
        <Plus className="size-4" />
        {t.nav.newNote}
      </span>

      {/* The quota, because it is on the real sidebar and because a visitor
          working out whether the free tier is usable should not have to find
          the pricing section to see the shape of it. */}
      <div className="border-border mt-auto rounded-lg border p-2.5">
        <div className="flex items-baseline justify-between">
          <span className="text-[11px] font-medium">{t.nav.sets}</span>
          <span className="text-muted-foreground text-[11px] tabular-nums">2/5</span>
        </div>
        <div className="bg-secondary mt-1.5 h-1 overflow-hidden rounded-full">
          <div className="bg-primary h-full w-2/5 rounded-full" />
        </div>
      </div>
    </div>
  );
}

export function HeroDashboard() {
  const { t } = useI18n();
  const reduce = useReducedMotion();

  const [index, setIndex] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [lastDays, setLastDays] = useState<number | null>(null);

  const done = index >= CARDS.length;
  const card = done ? CARDS[CARDS.length - 1] : CARDS[index];
  const remaining = CARDS.length - index;

  // The label under each button comes from the same call the click will make,
  // so the number shown is the number you get. `requeues` is why Again and Hard
  // do not show a date: they put the card back into this session, and the
  // persisted interval would be describing a different event.
  const state = SEEDS[Math.min(index, SEEDS.length - 1)];
  const preview = RATINGS.map((rating) => ({
    rating,
    requeues: shouldRequeueInSession(rating),
    days: scheduleNextReview(state, rating).dueInDays,
  }));

  /** `null` for a rating that requeues rather than scheduling a date. */
  function rate(days: number | null) {
    setLastDays(days);
    setRevealed(false);
    setIndex((current) => current + 1);
  }

  function restart() {
    setIndex(0);
    setRevealed(false);
    setLastDays(null);
  }

  return (
    <div className="border-border bg-background overflow-hidden rounded-2xl border shadow-[0_24px_70px_-30px_rgba(0,0,0,0.35)]">
      {/* Window chrome — furniture, so it is drawn rather than described. It is
          what makes the panel read as an application rather than a figure. */}
      <div className="border-border bg-secondary/60 flex items-center gap-2 border-b px-4 py-2.5">
        <span className="flex gap-1.5" aria-hidden="true">
          <span className="size-2.5 rounded-full bg-[#ED6A5E]" />
          <span className="size-2.5 rounded-full bg-[#F4BF4F]" />
          <span className="size-2.5 rounded-full bg-[#61C554]" />
        </span>
        <span className="text-muted-foreground mx-auto text-xs">tuon.app</span>
      </div>

      <div className="flex min-h-[25rem]">
        <Sidebar />

        <div className="min-w-0 flex-1 p-4 sm:p-6">
          <h2 className="font-display text-xl font-semibold tracking-tight">
            {t.dashboard.goodAfternoon}
          </h2>

          <div className="mt-5 grid gap-5 lg:grid-cols-[1.25fr_1fr]">
            {/* Today's plan — the working half. */}
            <div>
              <div className="flex items-baseline justify-between gap-4">
                <h3 className="font-display text-base font-semibold tracking-tight">
                  {t.dashboard.todaysPlan}
                </h3>
                <span className="text-muted-foreground text-xs tabular-nums">
                  {t.marketing.hero.dueLeft(remaining)}
                </span>
              </div>

              <AnimatePresence mode="wait">
                {done ? (
                  <motion.div
                    key="done"
                    initial={reduce ? undefined : { opacity: 0, y: 8 }}
                    animate={reduce ? undefined : { opacity: 1, y: 0 }}
                    className="border-border bg-card mt-3 rounded-xl border p-5 text-center"
                  >
                    <span className="bg-primary/10 text-primary mx-auto grid size-10 place-items-center rounded-full">
                      <Check className="size-5" />
                    </span>
                    <p className="font-display mt-3 text-base font-semibold tracking-tight">
                      {t.marketing.hero.doneTitle}
                    </p>
                    <p className="text-muted-foreground mt-1.5 text-[13px] leading-relaxed">
                      {t.marketing.hero.doneBody}
                    </p>
                    <div className="mt-4 flex flex-wrap items-center justify-center gap-3">
                      <Button size="sm" render={<Link href="/signup" />}>
                        {t.marketing.hero.startFree}
                        <ArrowRight />
                      </Button>
                      <button
                        type="button"
                        onClick={restart}
                        className="text-muted-foreground hover:text-foreground text-[13px] transition-colors"
                      >
                        {t.marketing.hero.again}
                      </button>
                    </div>
                  </motion.div>
                ) : (
                  <motion.div
                    key={card.id}
                    initial={reduce ? undefined : { opacity: 0, y: 10 }}
                    animate={reduce ? undefined : { opacity: 1, y: 0 }}
                    exit={reduce ? undefined : { opacity: 0, y: -10 }}
                    transition={{ duration: 0.2 }}
                  >
                    {/* The last rating's consequence, kept on screen while the
                        next card is being read — the scheduler answering back. */}
                    {lastDays !== null ? (
                      <p className="text-primary mt-2 text-[13px]">
                        {t.marketing.hero.scheduled(lastDays)}
                      </p>
                    ) : index > 0 ? (
                      <p className="text-primary mt-2 text-[13px]">
                        {t.marketing.hero.requeued}
                      </p>
                    ) : null}

                    <button
                      type="button"
                      onClick={() => setRevealed(true)}
                      aria-expanded={revealed}
                      className={cn(
                        "border-border bg-card mt-3 block w-full rounded-xl border p-4 text-left transition-colors",
                        revealed ? "cursor-default" : "hover:border-primary/40",
                      )}
                    >
                      <span className="text-muted-foreground text-[11px]">
                        {SAMPLE_NOTE.courseTag}
                      </span>
                      <span className="mt-1.5 block text-sm leading-snug font-medium">
                        {card.front}
                      </span>

                      {revealed ? (
                        <motion.span
                          initial={reduce ? undefined : { opacity: 0 }}
                          animate={reduce ? undefined : { opacity: 1 }}
                          className="border-border mt-2.5 block border-t pt-2.5 text-sm leading-relaxed"
                        >
                          {card.back}
                        </motion.span>
                      ) : (
                        <span className="text-muted-foreground mt-2.5 block text-[13px]">
                          {t.marketing.hero.tapToReveal}
                        </span>
                      )}
                    </button>

                    {/* The four ratings only exist once the answer is showing —
                        the product's own rule, so you cannot grade yourself
                        before finding out whether you were right. */}
                    <div
                      className={cn(
                        "mt-2.5 grid grid-cols-4 gap-1.5 transition-opacity",
                        revealed ? "opacity-100" : "pointer-events-none opacity-40",
                      )}
                    >
                      {preview.map(({ rating, requeues, days }, position) => (
                        <button
                          key={rating}
                          type="button"
                          disabled={!revealed}
                          onClick={() => rate(requeues ? null : days)}
                          className={cn(
                            "rounded-lg border px-1.5 py-2 text-center transition-colors",
                            position === 2
                              ? "border-primary/50 hover:bg-primary hover:text-primary-foreground"
                              : "border-border hover:bg-secondary",
                          )}
                        >
                          <span className="block text-xs font-medium">
                            {t.marketing.how.ratings[position]}
                          </span>
                          <span className="text-muted-foreground mt-0.5 block text-[10px]">
                            {requeues
                              ? t.marketing.hero.thisSession
                              : t.marketing.hero.interval(days)}
                          </span>
                        </button>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Recent notes — real furniture from the real dashboard. */}
            <div>
              <h3 className="font-display text-base font-semibold tracking-tight">
                {t.dashboard.recentNotes}
              </h3>
              <div className="mt-3 flex flex-col gap-1.5">
                {t.marketing.devices.notes.slice(0, 3).map((note) => (
                  <div
                    key={note.title}
                    className="border-border bg-card flex items-start gap-2 rounded-lg border p-2.5"
                  >
                    <FileText className="text-muted-foreground mt-0.5 size-3.5 shrink-0" />
                    <span className="min-w-0">
                      <span className="block truncate text-[13px] font-medium">
                        {note.title}
                      </span>
                      <span className="text-muted-foreground block truncate text-[11px]">
                        {note.subject}
                      </span>
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="mt-6 grid gap-5 lg:grid-cols-[1.25fr_1fr]">
            <div>
              <h3 className="font-display text-base font-semibold tracking-tight">
                {t.dashboard.thisWeek}
              </h3>
              <div className="mt-3">
                <WeekBars />
              </div>
            </div>
            <div>
              <h3 className="font-display text-base font-semibold tracking-tight">
                {t.dashboard.comingUp}
              </h3>
              <div className="mt-3">
                <ComingUp />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
