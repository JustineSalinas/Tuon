"use client";

import Link from "next/link";
import { motion } from "motion/react";
import { ArrowRight } from "lucide-react";

import { PaperCreature, type CreatureState } from "@/components/brand/paper-creature";
import { useI18n } from "@/components/providers/i18n-provider";
import type { Messages } from "@/lib/i18n/en";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { daysUntil } from "@/lib/srs/sm2";
import type { ReadinessReport, SubjectReadiness } from "@/lib/stats/readiness";
import { CREATURE_ROLE } from "@/lib/brand";
import { cn } from "@/lib/utils";

/**
 * The readiness hero.
 *
 * Rival dashboards open with a queue — Anki's deck rows, Quizlet's grid of
 * sets, Duolingo's streak. This opens with an answer to "am I going to be
 * ready?", which is the thing a student is actually anxious about and which
 * none of them can answer, because none of them knows about a deadline.
 *
 * It leads with the GAP rather than a score. "38 cards need work" is something
 * you can act on this evening; "68% ready" is a number to feel bad about. The
 * percentage is still there, underneath, for people who want it.
 */

/**
 * The three buckets, in the order they appear in the bar and the legend.
 *
 * `swatch` and `fill` are separate on purpose. The legend needs full-strength
 * colour to name a thing; the bar does not, and giving it the same strength
 * was the bug: the bar is always the full width of the card, so a solid amber
 * fill across all of it read as a COMPLETED progress bar at a glance — the
 * exact opposite of "none of this is ready". In the bar, only "on track" is
 * solid, and everything else has to look like open ground.
 */
const BUCKETS = [
  {
    key: "onTrack" as const,
    labelKey: "onTrack" as const,
    swatch: "bg-success",
    fill: "bg-success",
    /** Only ready work fills the bar's full height. See ReadinessBar. */
    full: true,
    hint: "still fresh on the day",
  },
  {
    key: "atRisk" as const,
    labelKey: "shaky" as const,
    swatch: "bg-warning",
    fill: "bg-warning/60",
    full: false,
    hint: "will have faded, or you keep missing it",
  },
  {
    key: "notStarted" as const,
    labelKey: "notStarted" as const,
    swatch: "bg-muted-foreground/35",
    fill: "bg-muted-foreground/30",
    full: false,
    hint: "never reviewed once",
  },
];

function horizonLabel(report: ReadinessReport): string {
  if (report.source === "deadline" && report.horizonLabel) return report.horizonLabel;
  if (report.source === "rolling") return "the next 30 days";
  return report.horizon.toLocaleDateString(undefined, {
    month: "long",
    day: "numeric",
  });
}

/** The eyebrow, phrased so it reads as a sentence rather than a label. */
function horizonEyebrow(report: ReadinessReport, t: Messages): string {
  if (report.source === "rolling") return t.dashboard.nextDays(30);
  const left = daysUntil(report.horizon);
  const when = horizonLabel(report);
  if (left <= 0) return t.dashboard.todayIs(when);
  return t.dashboard.daysTo(left, when);
}

/**
 * Nothing has been reviewed even once.
 *
 * Worth its own case because the numbers are identical to "badly behind" and
 * the meaning is the opposite. A new account seeded with a sample set would
 * otherwise be greeted with "8 cards need work, 0%" and a worried owl, which
 * is an accusation about work they have had no chance to do.
 */
function isUntouched(report: ReadinessReport): boolean {
  return report.total > 0 && report.notStarted === report.total;
}

/** Tala delivers the verdict before the numbers do. */
function creatureFor(report: ReadinessReport): CreatureState {
  if (report.needsWork === 0) return "celebrating";
  if (isUntouched(report)) return "idle";
  const share = report.share ?? 0;
  if (share >= 0.7) return "idle";
  if (share >= 0.4) return "thinking";
  return "overdue";
}

export function ReadinessCard({ report }: { report: ReadinessReport }) {
  const { t } = useI18n();
  const ready = report.needsWork === 0;
  const untouched = isUntouched(report);
  const pct = Math.round((report.share ?? 0) * 100);

  return (
    <Card
      className={cn(
        "overflow-hidden",
        ready ? "border-success/40 bg-success/5" : "border-primary/30 bg-accent/40",
      )}
    >
      <CardContent className="py-1">
        {/* Stacked on a phone. Side by side, `flex-1` let the headline shrink
            to a four-line column beside the button instead of wrapping. */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0 sm:flex-1">
            <p className="text-muted-foreground text-xs font-medium tracking-widest uppercase">
              {horizonEyebrow(report, t)}
            </p>

            {ready ? (
              <p className="font-display mt-2 text-2xl font-semibold tracking-tight">
                {t.dashboard.everythingOnTrack}
              </p>
            ) : untouched ? (
              <p className="font-display mt-2 text-2xl font-semibold tracking-tight">
                {t.dashboard.cardsReadyToStart(report.total)}
              </p>
            ) : (
              <p className="font-display mt-2 text-2xl font-semibold tracking-tight">
                {t.dashboard.cardsNeedWork(report.needsWork)}
              </p>
            )}

            {untouched ? (
              <p className="text-muted-foreground mt-1 text-sm">
                {t.dashboard.rateEachOne}
              </p>
            ) : report.onTrack === 0 ? (
              // "0 of 8 cards will still be fresh — 0%" said the same thing as
              // the headline three more times. When the answer is none, say
              // none and name the date it is measured against.
              <p className="text-muted-foreground mt-1 text-sm">
                {t.dashboard.noneWillHold(horizonLabel(report))}
              </p>
            ) : (
              <p className="text-muted-foreground mt-1 text-sm">
                {t.dashboard.freshLine(report.onTrack, report.total, pct)}
              </p>
            )}
          </div>

          <div className="flex shrink-0 items-center gap-3 max-sm:w-full">
            <PaperCreature
              state={creatureFor(report)}
              className="hidden size-16 sm:block"
              title={CREATURE_ROLE}
            />
            {!ready ? (
              <Button
                size="lg"
                className="max-sm:w-full"
                render={<Link href="/app/review" />}
              >
                {t.dashboard.startReviewing}
                <ArrowRight />
              </Button>
            ) : null}
          </div>
        </div>

        <ReadinessBar report={report} className="mt-4" />

        {/* A legend is always present, so identity is never colour alone. */}
        <dl className="mt-3 flex flex-wrap gap-x-5 gap-y-1.5">
          {BUCKETS.map(({ key, labelKey, swatch }) =>
            report[key] === 0 ? null : (
              <div key={key} className="flex items-center gap-1.5">
                <span
                  aria-hidden="true"
                  className={cn("size-2.5 shrink-0 rounded-[3px]", swatch)}
                />
                <dt className="text-sm">{t.dashboard[labelKey]}</dt>
                <dd className="text-muted-foreground text-sm tabular-nums">
                  {report[key]}
                </dd>
              </div>
            ),
          )}
        </dl>

        {/* Nothing is scheduled yet, so there is nothing to project from.
            Claiming otherwise would be noise on a user's first screen. */}
        {untouched ? null : (
          <p className="text-muted-foreground mt-3 text-xs leading-relaxed">
            {t.dashboard.projectedNote}
          </p>
        )}
      </CardContent>
    </Card>
  );
}

function ReadinessBar({
  report,
  className,
}: {
  report: ReadinessReport;
  className?: string;
}) {
  if (!report.total) return null;

  /**
   * HEIGHT carries readiness; COLOUR carries which kind of not-ready.
   *
   * The bar is always the full width of the card, so a stacked breakdown drawn
   * at one height read as a completed progress bar whenever a single bucket
   * dominated — a student with every card shaky saw a full amber bar, which at
   * a glance says "done" and means the exact opposite. Only work that is
   * actually ready gets the full height now; everything else is a thin band on
   * open ground, so a set with nothing ready looks like nothing ready.
   */
  return (
    <div
      className={cn("flex h-2.5 w-full items-center overflow-hidden rounded-full", className)}
      role="img"
      aria-label={`${report.onTrack} on track, ${report.atRisk} shaky, ${report.notStarted} not started, out of ${report.total} cards`}
    >
      {BUCKETS.map(({ key, fill, full }) =>
        report[key] === 0 ? null : (
          <motion.div
            key={key}
            initial={{ flexGrow: 0 }}
            animate={{ flexGrow: report[key] / report.total }}
            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
            style={{ flexBasis: 0 }}
            className={cn("min-w-1 rounded-full", full ? "h-2.5" : "h-1")}
          >
            <div className={cn("h-full w-full rounded-full", fill)} />
          </motion.div>
        ),
      )}
    </div>
  );
}

/**
 * Readiness per subject, weakest first.
 *
 * The ordering is the opinion. A board exam fails you on one subject below the
 * floor and a Senior High student carries six to eight at once, so a single
 * global number hides the one about to sink them. Every rival sorts decks
 * alphabetically or by recency; sorting by risk is what a tutor would do.
 */
export function SubjectReadinessList({
  subjects,
  limit = 6,
}: {
  subjects: SubjectReadiness[];
  limit?: number;
}) {
  if (subjects.length < 2) return null;
  const shown = subjects.slice(0, limit);

  return (
    <div className="grid gap-2.5">
      {shown.map((subject, index) => {
        const pct = Math.round(subject.share * 100);
        const needsWork = subject.atRisk + subject.notStarted;
        return (
          <motion.div
            key={subject.subject}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25, delay: index * 0.04 }}
            className="rounded-xl border p-3"
          >
            <div className="flex items-baseline justify-between gap-3">
              <span className="truncate text-sm font-medium">{subject.subject}</span>
              <span className="text-muted-foreground shrink-0 text-xs tabular-nums">
                {needsWork > 0
                  ? `${needsWork} to work on`
                  : `all ${subject.total} on track`}
              </span>
            </div>
            <div className="mt-2 flex items-center gap-2.5">
              <div className="bg-muted h-1.5 flex-1 overflow-hidden rounded-full">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${pct}%` }}
                  transition={{ duration: 0.6, delay: index * 0.04, ease: [0.22, 1, 0.36, 1] }}
                  className={cn(
                    "h-full rounded-full",
                    subject.share >= 0.7
                      ? "bg-success"
                      : subject.share >= 0.4
                        ? "bg-warning"
                        : "bg-destructive",
                  )}
                />
              </div>
              <span className="text-muted-foreground w-9 shrink-0 text-right text-xs tabular-nums">
                {pct}%
              </span>
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}
