"use client";

import { useMemo } from "react";
import Link from "next/link";
import { motion } from "motion/react";
import {
  ArrowRight,
  CalendarClock,
  FileText,
  LifeBuoy,
} from "lucide-react";

import { useAuth } from "@/components/providers/auth-provider";
import { useI18n } from "@/components/providers/i18n-provider";
import type { Messages } from "@/lib/i18n/en";
import { PaperCreature } from "@/components/brand/paper-creature";
import { CREATURE_NAME, CREATURE_ROLE } from "@/lib/brand";
import {
  useNotes,
  usePlanItems,
  useReviewLogs,
  useStudySets,
} from "@/lib/hooks/use-firestore";
import { dayKey } from "@/lib/hooks/use-review-cards";
import { nextDeadline } from "@/lib/organiser/plan-items";
import { useNow } from "@/lib/hooks/use-now";
import { DEFAULT_EASE_FACTOR, daysUntil, parseExamDate } from "@/lib/srs/sm2";
import { AT_RISK_EASE } from "@/lib/stats/retention";
import { QuotaIndicator } from "@/components/app/quota-indicator";
import { FirstRun } from "@/components/app/first-run";
import { ReadinessCard, SubjectReadinessList } from "@/components/app/readiness";
import { TodaysPlan } from "@/components/app/todays-plan";
import { WeekStudy } from "@/components/app/week-study";
import { Upcoming } from "@/components/app/upcoming";
import { buildReadiness } from "@/lib/stats/readiness";
import { Button } from "@/components/ui/button";
import { buildPlan } from "@/lib/stats/plan";
import { usePreferences } from "@/lib/hooks/use-preferences";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export default function DashboardPage() {
  const { user, profile } = useAuth();
  const { t } = useI18n();
  const { data: sets, loading: setsLoading } = useStudySets(user?.uid);
  const { data: notes, loading: notesLoading } = useNotes(user?.uid);
  const { logs, loading: logsLoading } = useReviewLogs(user?.uid);
  const { dailyCardGoal, timeZone } = usePreferences();
  const { items: planItems } = usePlanItems(user?.uid);
  // Refreshed every minute so a card becoming due appears without a reload.
  const now = useNow(60_000);

  const loading = setsLoading || notesLoading || logsLoading;

  /** Due + never-seen counts per study set, derived without loading cards. */
  const setStats = useMemo(() => {
    const byStudySet = new Map<
      string,
      { due: number; reviewed: number; shaky: number }
    >();

    for (const log of logs) {
      const entry = byStudySet.get(log.studySetId) ?? { due: 0, reviewed: 0, shaky: 0 };
      entry.reviewed += 1;
      if ((log.nextReviewAt?.toDate?.().getTime() ?? 0) <= now) entry.due += 1;
      // Same threshold the readiness projection uses, so the hero and the plan
      // are counting the same cards.
      if ((log.easeFactor ?? DEFAULT_EASE_FACTOR) < AT_RISK_EASE) entry.shaky += 1;
      byStudySet.set(log.studySetId, entry);
    }

    return sets.map((set) => {
      const entry = byStudySet.get(set.id) ?? { due: 0, reviewed: 0, shaky: 0 };
      const fresh = Math.max(0, (set.flashcardCount ?? 0) - entry.reviewed);
      return {
        set,
        due: entry.due,
        fresh,
        shaky: entry.shaky,
        pending: entry.due + fresh,
      };
    });
  }, [sets, logs, now]);

  /**
   * The soonest thing the student has actually told us they must be ready for.
   *
   * Without this the horizon is a rolling month, which is an arbitrary number
   * nobody chose. With it, "ready for Wednesday's quiz" is a question the
   * dashboard can answer - and it is what makes the organiser part of Tuón
   * rather than a todo list living next to it.
   */
  const deadline = useMemo(() => {
    const item = nextDeadline(planItems, dayKey(new Date(now), timeZone));
    if (!item?.dueDate) return null;
    const [year, month, day] = item.dueDate.split("-").map(Number);
    // Local midday, not midnight: the horizon is a calendar day, and midnight
    // in one zone is the day before in another.
    return { date: new Date(year, month - 1, day, 12), label: item.title };
  }, [planItems, now, timeZone]);

  // Readiness is derived from the logs and sets already loaded above, so the
  // dashboard's most prominent number costs no extra reads.
  const readiness = useMemo(
    () =>
      buildReadiness(sets, logs, parseExamDate(profile?.examDate), new Date(now), deadline),
    [sets, logs, profile?.examDate, now, deadline],
  );

  /** One ordered plan for today, weakest subject first. */
  const plan = useMemo(() => {
    const noteIdsWithSets = new Set(
      sets.map((set) => set.noteId).filter((id): id is string => Boolean(id)),
    );
    return buildPlan(
      setStats.map(({ set, due, fresh, shaky }) => ({
        id: set.id,
        title: set.title,
        courseTag: set.courseTag,
        due,
        fresh,
        shaky,
      })),
      notes.map((note) => ({
        id: note.id,
        title: note.title,
        hasSet: noteIdsWithSets.has(note.id),
      })),
      readiness.bySubject.map((s) => s.subject),
      dailyCardGoal,
    );
  }, [setStats, sets, notes, readiness, dailyCardGoal]);


  const firstName = (profile?.displayName || "there").trim().split(/\s+/)[0];

  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-6 md:px-8 md:py-10">
      <motion.header
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        {/* One line rather than two. The greeting is warmth, not content,
            and stacking it above the name pushed the readiness card — the
            thing the student actually opened the app for — most of a screen
            down on a laptop. */}
        <h1 className="font-display text-2xl font-semibold tracking-tight">
          {greeting(t)}, {firstName}
        </h1>
        <ExamCountdown
          examDate={profile?.examDate}
          examName={profile?.courses?.[0]}
        />
      </motion.header>

      {loading ? (
        <div className="mt-8 space-y-3">
          <Skeleton className="h-28 w-full rounded-xl" />
          <Skeleton className="h-20 w-full rounded-xl" />
        </div>
      ) : sets.length === 0 && notes.length === 0 ? (
        <FirstRun />
      ) : (
        <>
          {/* Review summary */}
          <motion.section
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.05 }}
            className="mt-6"
          >
            {readiness.total > 0 ? (
              <ReadinessCard report={readiness} />
            ) : (
              <Card className="bg-secondary/40">
                <CardContent className="flex items-center gap-4 py-1">
                  <PaperCreature
                    state="asleep"
                    className="size-16 shrink-0"
                    title={CREATURE_ROLE}
                  />
                  <div>
                    <p className="font-medium">
                      Nothing to study yet — {CREATURE_NAME} is resting.
                    </p>
                    <p className="text-muted-foreground mt-1 text-sm">
                      Turn a note into a study set and her first cards appear
                      here.
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}
          </motion.section>

          {/* Weakest subject first — the one about to sink you. */}
          {readiness.bySubject.length > 1 ? (
            <section className="mt-8">
              <SectionHeading
                title="Where you stand"
                href="/app/stats"
                linkLabel="Full stats"
              />
              <div className="mt-3">
                <SubjectReadinessList subjects={readiness.bySubject} />
              </div>
            </section>
          ) : null}

          {/* Side by side once there is width for it. Stacked, these two
              filled a laptop screen on their own and left the right half of a
              desktop empty; the plan is what you act on and recent notes is
              what you reach for, so they belong at the same height rather
              than one below the fold. */}
          <div className="mt-8 grid items-start gap-8 lg:grid-cols-2">
            {/* The plan replaces the old list of sets. That list was a menu,
                and a menu is where students pick the deck they already know. */}
            {/* min-w-0: a grid item defaults to min-width:auto, so a long
                set title refused to shrink and pushed this column straight
                over the top of the one beside it. */}
            {plan.steps.length > 0 ? (
              <section className="min-w-0">
                <SectionHeading
                  title={t.dashboard.todaysPlan}
                  href="/app/sets"
                  linkLabel={t.dashboard.allSets}
                />
                <div className="mt-3">
                  <TodaysPlan plan={plan} />
                </div>
              </section>
            ) : null}

            {notes.length > 0 ? (
              <section className="min-w-0">
                <SectionHeading title={t.dashboard.recentNotes} href="/app/notes" linkLabel={t.dashboard.allNotes} />
                <div className="mt-3 grid gap-2">
                  {notes.slice(0, 4).map((note) => (
                    <Link
                      key={note.id}
                      href={`/app/notes/${note.id}`}
                      className="hover:border-primary/40 hover:bg-accent/30 flex items-center gap-3 rounded-xl border p-3.5 transition-colors"
                    >
                      <FileText className="text-muted-foreground size-4 shrink-0" />
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm font-medium">{note.title}</div>
                        {note.courseTag ? (
                          <div className="text-muted-foreground truncate text-xs">
                            {note.courseTag}
                          </div>
                        ) : null}
                      </div>
                    </Link>
                  ))}
                </div>
              </section>
            ) : null}
          </div>

          {/* The habit and the horizon, side by side. Everything above
              answers a question about the cards; these two answer "have I
              actually been doing this" and "for what" — and neither is much
              use alone. An empty week is only alarming next to a deadline,
              and a deadline is only reassuring next to a week of work. */}
          <div className="mt-10 grid items-start gap-8 lg:grid-cols-2">
            <section className="min-w-0">
              <SectionHeading
                title={t.dashboard.thisWeek}
                href="/app/calendar"
                linkLabel={t.dashboard.fullYear}
              />
              <div className="mt-3">
                <WeekStudy />
              </div>
            </section>

            <section className="min-w-0">
              <SectionHeading
                title={t.dashboard.comingUp}
                href="/app/calendar"
                linkLabel={t.dashboard.allDeadlines}
              />
              <div className="mt-3">
                <Upcoming />
              </div>
            </section>
          </div>

          <HelpCard t={t} />

          <div className="mt-8 md:hidden">
            <QuotaIndicator />
          </div>
        </>
      )}
    </main>
  );
}

/**
 * The way into the help page, at the foot of the dashboard.
 *
 * Below everything, and deliberately quiet: a student who knows how the app
 * works scrolls past it every day, and it has to cost them nothing. It sits
 * here rather than in the sidebar rail because the rail is for places you go
 * daily, and this is a place you go twice.
 */
function HelpCard({ t }: { t: Messages }) {
  return (
    <section className="mt-10">
      <div className="bg-card flex flex-wrap items-center gap-4 rounded-2xl border border-dashed p-5">
        <span className="bg-secondary text-muted-foreground grid size-9 shrink-0 place-items-center rounded-xl">
          <LifeBuoy className="size-4" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="font-medium">{t.dashboardHelp.title}</p>
          <p className="text-muted-foreground mt-0.5 text-sm leading-relaxed">
            {t.dashboardHelp.body}
          </p>
        </div>
        <Button variant="outline" size="sm" render={<Link href="/app/help" />}>
          {t.dashboardHelp.action}
          <ArrowRight />
        </Button>
      </div>
    </section>
  );
}

function SectionHeading({
  title,
  href,
  linkLabel,
}: {
  title: string;
  href: string;
  linkLabel: string;
}) {
  return (
    <div className="flex items-baseline justify-between">
      <h2 className="font-display text-lg font-semibold tracking-tight">{title}</h2>
      <Link
        href={href}
        className="text-muted-foreground hover:text-foreground text-xs transition-colors"
      >
        {linkLabel}
      </Link>
    </div>
  );
}

/**
 * Takes the greetings rather than returning English.
 *
 * The hour still comes from Manila regardless of locale: it decides which
 * greeting is TRUE, and that is a fact about the clock, not about language.
 */
function greeting(t: Messages): string {
  const hour = Number(
    new Intl.DateTimeFormat("en-PH", {
      hour: "numeric",
      hour12: false,
      timeZone: "Asia/Manila",
    }).format(new Date()),
  );
  if (hour < 12) return t.dashboard.goodMorning;
  if (hour < 18) return t.dashboard.goodAfternoon;
  return t.dashboard.goodEvening;
}

/**
 * Days left until a board or licensure exam.
 *
 * Shown because the date is not decoration — it is actively changing how every
 * card is scheduled (see `clampToExam` in lib/srs/sm2.ts), and a setting that
 * silently alters behaviour should be visible where the behaviour happens.
 * Renders nothing for the students who have no such date, which is most of
 * them.
 */
function ExamCountdown({
  examDate,
  examName,
}: {
  examDate?: string | null;
  examName?: string | null;
}) {
  const parsed = parseExamDate(examDate);
  if (!parsed) return null;
  const left = daysUntil(parsed);
  if (left <= 0) return null;

  return (
    <p className="text-primary mt-2 flex items-center gap-1.5 text-sm font-medium">
      <CalendarClock className="size-4 shrink-0" />
      {(examName?.trim() || "Your exam")} in {left} {left === 1 ? "day" : "days"}
    </p>
  );
}
