"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { motion } from "motion/react";
import { AlertTriangle, Table2, TrendingUp } from "lucide-react";

import { useI18n } from "@/components/providers/i18n-provider";
import type { Messages } from "@/lib/i18n/en";
import type { ReviewCard } from "@/lib/hooks/use-review-cards";
import {
  AT_RISK_EASE,
  buildForecast,
  difficultyOf,
  maturityBreakdown,
  summarise,
  type ForecastDay,
  type MaturityStage,
} from "@/lib/stats/retention";
import { PaperCreature } from "@/components/brand/paper-creature";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

/**
 * Retention, as a component rather than a page body.
 *
 * It was 200 lines inline in `/app/stats`, which meant the only way to see it
 * was to sign in AND hold a paid plan AND already have a review history —
 * three conditions that make a screen impossible to check, and it is the most
 * chart-dense screen in the product. Now the page supplies the cards and this
 * draws them, so `/dev-retention` can draw the same thing from a fixture.
 */

/** The validated ordinal ramp, in stage order. See globals.css. */
const STAGE_COLOR: Record<MaturityStage, string> = {
  new: "var(--seq-1)",
  learning: "var(--seq-2)",
  young: "var(--seq-3)",
  mature: "var(--seq-4)",
};

export function RetentionReport({
  cards,
  loading,
  now,
  timeZone,
}: {
  cards: ReviewCard[];
  loading: boolean;
  now: number;
  timeZone: string;
}) {
  const { t } = useI18n();
  const [showTable, setShowTable] = useState(false);

  const summary = useMemo(() => summarise(cards, now), [cards, now]);
  const maturity = useMemo(() => maturityBreakdown(cards), [cards]);
  const forecast = useMemo(() => buildForecast(cards, now), [cards, now]);

  // Stage names, keyed by stage, so the catalogue can hold them side by side.
  const STAGE_LABEL = {
    new: t.stats.maturity.new,
    learning: t.stats.maturity.learning,
    young: t.stats.maturity.young,
    mature: t.stats.maturity.matureStage,
  } as const;
  const STAGE_HINT = {
    new: t.stats.maturity.newHint,
    learning: t.stats.maturity.learningHint,
    young: t.stats.maturity.youngHint,
    mature: t.stats.maturity.matureHint,
  } as const;

  if (loading) {
    return (
      <div className="mt-8 space-y-4">
        <Skeleton className="h-28 w-full rounded-2xl" />
        <Skeleton className="h-56 w-full rounded-2xl" />
      </div>
    );
  }

  if (summary.reviewed === 0) {
    return <NothingYet hasCards={cards.length > 0} t={t} />;
  }

  return (
    <>
      {/* --- Headline. A single number, not a chart. ----------------- */}
      <motion.section
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="mt-8 grid gap-3 sm:grid-cols-3"
      >
        <div
          className={cn(
            "rounded-2xl border p-5 sm:col-span-1",
            summary.atRisk.length > 0 &&
              "border-destructive/40 bg-destructive/5",
          )}
        >
          <div className="text-muted-foreground flex items-center gap-1.5 text-xs font-medium">
            {summary.atRisk.length > 0 ? (
              <AlertTriangle className="text-destructive size-3.5" />
            ) : (
              <TrendingUp className="text-success size-3.5" />
            )}
            {t.stats.keepForgetting}
          </div>
          <div className="font-display mt-2 text-4xl font-semibold tabular-nums">
            {summary.atRisk.length}
          </div>
          <p className="text-muted-foreground mt-1 text-xs leading-relaxed">
            {summary.atRisk.length > 0
              ? t.stats.failedRepeatedly
              : t.stats.nothingTroubling}
          </p>
        </div>

        <StatTile
          label={t.stats.dueNow}
          value={summary.overdue}
          hint={
            summary.overdue > 0 ? t.stats.waitingForYou : t.stats.allCaughtUp
          }
        />
        <StatTile
          label={t.stats.mature}
          value={`${Math.round(summary.matureShare * 100)}%`}
          hint={t.stats.matureHint}
        />
      </motion.section>

      {/* --- Forecast: discrete daily buckets, so bars. -------------- */}
      <section className="mt-8">
        <div className="flex items-baseline justify-between gap-3">
          <div>
            <h2 className="font-display text-lg font-semibold tracking-tight">
              {t.stats.nextTwoWeeks}
            </h2>
            <p className="text-muted-foreground mt-0.5 text-sm">
              {t.stats.perDay}
            </p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowTable((v) => !v)}
            aria-pressed={showTable}
          >
            <Table2 />
            {showTable ? t.stats.chart : t.stats.table}
          </Button>
        </div>

        {showTable ? (
          <ForecastTable forecast={forecast} t={t} timeZone={timeZone} />
        ) : (
          <ForecastChart forecast={forecast} t={t} timeZone={timeZone} />
        )}
      </section>

      {/* --- Maturity: ordered stages of one pipeline. --------------- */}
      <section className="mt-10">
        <h2 className="font-display text-lg font-semibold tracking-tight">
          {t.stats.whereCardsAre}
        </h2>
        <p className="text-muted-foreground mt-0.5 text-sm">
          {t.stats.whereCardsAreHint}
        </p>

        <div className="mt-4 flex h-11 w-full gap-[2px] overflow-hidden rounded-xl">
          {maturity.map(({ stage, count, share }) =>
            count === 0 ? null : (
              <motion.div
                key={stage}
                initial={{ flexGrow: 0 }}
                animate={{ flexGrow: share }}
                transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
                style={{ backgroundColor: STAGE_COLOR[stage], flexBasis: 0 }}
                className="min-w-1 first:rounded-l-xl last:rounded-r-xl"
                title={t.stats.stageCount(STAGE_LABEL[stage], count)}
              />
            ),
          )}
        </div>

        {/* Legend is always present; four stages so each is labelled too. */}
        <dl className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {maturity.map(({ stage, count }) => (
            <div key={stage} className="flex items-start gap-2">
              <span
                aria-hidden="true"
                className="mt-1 size-2.5 shrink-0 rounded-[3px]"
                style={{ backgroundColor: STAGE_COLOR[stage] }}
              />
              <div className="min-w-0">
                <dt className="text-sm font-medium">
                  {STAGE_LABEL[stage]}{" "}
                  <span className="text-muted-foreground tabular-nums">
                    {count}
                  </span>
                </dt>
                <dd className="text-muted-foreground text-xs leading-snug">
                  {STAGE_HINT[stage]}
                </dd>
              </div>
            </div>
          ))}
        </dl>
      </section>

      {/* --- At risk ------------------------------------------------- */}
      {summary.atRisk.length > 0 ? (
        <section className="mt-10">
          <h2 className="font-display text-lg font-semibold tracking-tight">
            {t.stats.atRiskTitle}
          </h2>
          <p className="text-muted-foreground mt-0.5 text-sm">
            {t.stats.atRiskHint(AT_RISK_EASE.toFixed(1))}
          </p>

          <div className="mt-4 divide-y rounded-xl border">
            {summary.atRisk.slice(0, 10).map((card) => {
              const difficulty = difficultyOf(card.log?.easeFactor ?? 2.5);
              return (
                <Link
                  key={card.id}
                  href={`/app/sets/${card.studySetId}`}
                  className="hover:bg-accent/30 flex items-center gap-4 p-4 transition-colors"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{card.front}</p>
                    <p className="text-muted-foreground mt-0.5 truncate text-xs">
                      {card.studySetTitle}
                    </p>
                  </div>
                  <div className="w-24 shrink-0">
                    <div className="bg-secondary h-1.5 overflow-hidden rounded-full">
                      <div
                        className="bg-destructive h-full rounded-full"
                        style={{ width: `${Math.round(difficulty * 100)}%` }}
                      />
                    </div>
                    <p className="text-muted-foreground mt-1 text-right text-[11px] tabular-nums">
                      {t.stats.ease((card.log?.easeFactor ?? 0).toFixed(2))}
                    </p>
                  </div>
                </Link>
              );
            })}
          </div>
        </section>
      ) : null}
    </>
  );
}

function StatTile({
  label,
  value,
  hint,
}: {
  label: string;
  value: number | string;
  hint: string;
}) {
  return (
    <div className="rounded-2xl border p-5">
      <div className="text-muted-foreground text-xs font-medium">{label}</div>
      <div className="font-display mt-2 text-4xl font-semibold tabular-nums">
        {value}
      </div>
      <p className="text-muted-foreground mt-1 text-xs leading-relaxed">
        {hint}
      </p>
    </div>
  );
}

function ForecastChart({
  forecast,
  t,
  timeZone,
}: {
  forecast: ForecastDay[];
  t: Messages;
  timeZone: string;
}) {
  const max = Math.max(1, ...forecast.map((d) => d.count));

  return (
    <div className="bg-card mt-4 rounded-2xl border p-5">
      <div className="flex h-44 items-end gap-1.5">
        {forecast.map((day) => {
          const height = (day.count / max) * 100;
          return (
            <div
              key={day.key}
              className="group relative flex h-full flex-1 flex-col justify-end"
            >
              {/* Hover tooltip — the hit target is the whole column. */}
              <div
                role="tooltip"
                className="bg-popover pointer-events-none absolute bottom-full left-1/2 z-10 mb-1.5 -translate-x-1/2 rounded-lg border px-2 py-1 text-center text-xs opacity-0 shadow-md transition-opacity group-hover:opacity-100"
              >
                <div className="font-medium tabular-nums">{day.count}</div>
                <div className="text-muted-foreground whitespace-nowrap">
                  {day.isOverdue
                    ? t.stats.overdue
                    : formatDay(day.date, t.common.dateLocale, timeZone)}
                </div>
              </div>

              <motion.div
                initial={{ scaleY: 0 }}
                animate={{ scaleY: 1 }}
                transition={{
                  duration: 0.5,
                  delay: Math.min(forecast.indexOf(day) * 0.02, 0.3),
                  ease: [0.22, 1, 0.36, 1],
                }}
                style={{
                  height: `${Math.max(day.count > 0 ? 4 : 1, height)}%`,
                  transformOrigin: "bottom",
                  backgroundColor: day.isOverdue
                    ? "var(--destructive)"
                    : day.count > 0
                      ? "var(--primary)"
                      : "var(--border)",
                }}
                className="w-full rounded-t-[4px]"
              />
            </div>
          );
        })}
      </div>

      {/* Sparse axis: only the ends and today carry a label. */}
      <div className="text-muted-foreground mt-2 flex gap-1.5 text-[10px]">
        {forecast.map((day, index) => (
          <div key={day.key} className="flex-1 text-center">
            {day.isOverdue ? (
              <span className="text-destructive font-medium">
                {t.stats.late}
              </span>
            ) : day.isToday ? (
              <span className="text-foreground font-medium">
                {t.stats.today}
              </span>
            ) : index === forecast.length - 1 ? (
              formatDay(day.date, t.common.dateLocale, timeZone)
            ) : (
              ""
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function ForecastTable({
  forecast,
  t,
  timeZone,
}: {
  forecast: ForecastDay[];
  t: Messages;
  timeZone: string;
}) {
  return (
    <div className="mt-4 overflow-x-auto rounded-xl border">
      <table className="w-full text-sm">
        <caption className="sr-only">{t.stats.tableCaption}</caption>
        <thead className="bg-secondary/50 text-muted-foreground">
          <tr>
            <th scope="col" className="px-4 py-2 text-left font-medium">
              {t.stats.day}
            </th>
            <th scope="col" className="px-4 py-2 text-right font-medium">
              {t.stats.cardsDue}
            </th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {forecast.map((day) => (
            <tr key={day.key}>
              <td className="px-4 py-2">
                {day.isOverdue ? (
                  <span className="text-destructive font-medium">
                    {t.stats.overdueRow}
                  </span>
                ) : day.isToday ? (
                  <span className="font-medium">{t.stats.todayRow}</span>
                ) : (
                  formatDay(day.date, t.common.dateLocale, timeZone)
                )}
              </td>
              <td className="px-4 py-2 text-right tabular-nums">{day.count}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function NothingYet({ hasCards, t }: { hasCards: boolean; t: Messages }) {
  return (
    <div className="mt-10 rounded-2xl border border-dashed py-14 text-center">
      <PaperCreature state="idle" className="mx-auto size-28" />
      <h2 className="font-display mt-2 text-lg font-semibold tracking-tight">
        {t.stats.noHistory}
      </h2>
      <p className="text-muted-foreground mx-auto mt-1.5 max-w-xs text-sm leading-relaxed">
        {t.stats.noHistoryHint}
      </p>
      <Button
        className="mt-6"
        render={<Link href={hasCards ? "/app/review" : "/app/notes/new"} />}
      >
        {hasCards ? t.stats.startReviewing : t.stats.makeASet}
      </Button>
    </div>
  );
}

/**
 * The student's own zone, not Manila.
 *
 * This used to hardcode `Asia/Manila`, so an OFW reviewing in Dubai read a
 * forecast whose day labels were someone else's — the same bug `time-zone.ts`
 * exists to prevent, and it says why: a wrong zone silently shifts the whole
 * schedule and the clock on screen still looks right.
 */
function formatDay(date: Date, locale: string, timeZone: string): string {
  return new Intl.DateTimeFormat(locale, {
    weekday: "short",
    day: "numeric",
    timeZone,
  }).format(date);
}
