"use client";

import { useMemo } from "react";
import Link from "next/link";
import { motion } from "motion/react";
import {
  CalendarClock,
  FileText,
  Layers,
  Plus,
  Sparkles,
} from "lucide-react";

import { useAuth } from "@/components/providers/auth-provider";
import { PaperCreature } from "@/components/brand/paper-creature";
import { CREATURE_NAME, CREATURE_ROLE } from "@/lib/brand";
import { useNotes, useReviewLogs, useStudySets } from "@/lib/hooks/use-firestore";
import { useNow } from "@/lib/hooks/use-now";
import { daysUntil, parseExamDate } from "@/lib/srs/sm2";
import { QuotaIndicator } from "@/components/app/quota-indicator";
import { ReadinessCard, SubjectReadinessList } from "@/components/app/readiness";
import { buildReadiness } from "@/lib/stats/readiness";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

export default function DashboardPage() {
  const { user, profile } = useAuth();
  const { data: sets, loading: setsLoading } = useStudySets(user?.uid);
  const { data: notes, loading: notesLoading } = useNotes(user?.uid);
  const { logs, loading: logsLoading } = useReviewLogs(user?.uid);
  // Refreshed every minute so a card becoming due appears without a reload.
  const now = useNow(60_000);

  const loading = setsLoading || notesLoading || logsLoading;

  /** Due + never-seen counts per study set, derived without loading cards. */
  const setStats = useMemo(() => {
    const byStudySet = new Map<string, { due: number; reviewed: number }>();

    for (const log of logs) {
      const entry = byStudySet.get(log.studySetId) ?? { due: 0, reviewed: 0 };
      entry.reviewed += 1;
      if ((log.nextReviewAt?.toDate?.().getTime() ?? 0) <= now) entry.due += 1;
      byStudySet.set(log.studySetId, entry);
    }

    return sets.map((set) => {
      const entry = byStudySet.get(set.id) ?? { due: 0, reviewed: 0 };
      const fresh = Math.max(0, (set.flashcardCount ?? 0) - entry.reviewed);
      return { set, due: entry.due, fresh, pending: entry.due + fresh };
    });
  }, [sets, logs, now]);

  // Readiness is derived from the logs and sets already loaded above, so the
  // dashboard's most prominent number costs no extra reads.
  const readiness = useMemo(
    () => buildReadiness(sets, logs, parseExamDate(profile?.examDate), new Date(now)),
    [sets, logs, profile?.examDate, now],
  );

  const readyToReview = setStats.filter((s) => s.pending > 0);

  const firstName = (profile?.displayName || "there").trim().split(/\s+/)[0];

  return (
    <main className="mx-auto w-full max-w-4xl px-4 py-6 md:px-8 md:py-10">
      <motion.header
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <p className="text-muted-foreground text-sm">{greeting()}</p>
        <h1 className="font-display mt-1 text-3xl font-semibold tracking-tight">
          {firstName}
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

          {/* Sets with work waiting */}
          {readyToReview.length > 0 ? (
            <section className="mt-8">
              <SectionHeading title="Ready to study" href="/app/sets" linkLabel="All sets" />
              <div className="mt-3 grid gap-2">
                {readyToReview.slice(0, 5).map(({ set, due, fresh }, index) => (
                  <motion.div
                    key={set.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.25, delay: 0.06 + index * 0.04 }}
                  >
                    <Link
                      href={`/app/sets/${set.id}`}
                      className="hover:border-primary/40 hover:bg-accent/30 flex items-center gap-3 rounded-xl border p-3.5 transition-colors"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="truncate font-medium">{set.title}</div>
                        <div className="text-muted-foreground mt-0.5 flex flex-wrap items-center gap-x-2 text-xs">
                          {set.courseTag ? <span>{set.courseTag}</span> : null}
                          <span>{set.flashcardCount} cards</span>
                        </div>
                      </div>
                      <div className="flex shrink-0 items-center gap-1.5">
                        {due > 0 ? (
                          <Badge className="bg-primary/15 text-primary border-transparent tabular-nums">
                            {due} due
                          </Badge>
                        ) : null}
                        {fresh > 0 ? (
                          <Badge variant="secondary" className="tabular-nums">
                            {fresh} new
                          </Badge>
                        ) : null}
                      </div>
                    </Link>
                  </motion.div>
                ))}
              </div>
            </section>
          ) : null}

          {/* Recent notes */}
          {notes.length > 0 ? (
            <section className="mt-8">
              <SectionHeading title="Recent notes" href="/app/notes" linkLabel="All notes" />
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

          <div className="mt-8 md:hidden">
            <QuotaIndicator />
          </div>
        </>
      )}
    </main>
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

function FirstRun() {
  const steps = [
    {
      icon: FileText,
      title: "Paste your notes",
      body: "Lecture notes, a textbook excerpt, your reviewer — anything you need to know.",
    },
    {
      icon: Sparkles,
      title: "Generate a study set",
      body: "Tuón writes the flashcards and a practice quiz for you.",
    },
    {
      icon: Layers,
      title: "Review on schedule",
      body: "Each card comes back right before you would have forgotten it.",
    },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      className="mt-8"
    >
      <Card className="bg-secondary/30">
        <CardContent>
          <h2 className="font-display text-xl font-semibold tracking-tight">
            Let us make your first study set
          </h2>
          <p className="text-muted-foreground mt-1.5 text-sm">
            It takes about a minute.
          </p>

          <ol className="mt-6 space-y-4">
            {steps.map((step, index) => (
              <li key={step.title} className="flex gap-3.5">
                <span
                  className={cn(
                    "bg-background grid size-8 shrink-0 place-items-center rounded-full border",
                    index === 0 && "border-primary text-primary",
                  )}
                >
                  <step.icon className="size-4" />
                </span>
                <div>
                  <div className="text-sm font-medium">{step.title}</div>
                  <p className="text-muted-foreground mt-0.5 text-sm">{step.body}</p>
                </div>
              </li>
            ))}
          </ol>

          <Button size="lg" className="mt-7 w-full sm:w-auto" render={<Link href="/app/notes/new" />}>
              <Plus />
              Create your first note
            </Button>
        </CardContent>
      </Card>
    </motion.div>
  );
}

/** Manila-local greeting — the app is built for one timezone. */
function greeting(): string {
  const hour = Number(
    new Intl.DateTimeFormat("en-PH", {
      hour: "numeric",
      hour12: false,
      timeZone: "Asia/Manila",
    }).format(new Date()),
  );
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
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
