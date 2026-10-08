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
        className="mt-8 grid grid-cols-1 gap-3 sm:grid-cols-3"
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

/**
 * A day's worth of pixels in a bar chart, made readable on a screen with no
 * hover.
 *
 * It used to rely entirely on a floating tooltip that only `:hover` could
 * open — on a phone that is most of this chart's audience, since retention
 * is exactly the kind of thing a student checks between classes. The fix
 * mirrors the `picked` pattern `study-heatmap.tsx` already uses: a tap opens
 * the same detail a hover does, and a reserved-height line above the chart
 * shows it, so nothing shifts layout when a value appears or disappears.
 *
 * The overdue bucket gets its own group, separated by a rule rather than
 * left to blend into the fourteen day-bars beside it. Two reasons: it is an
 * accumulation, not a day, so drawing it as "day zero" of the forecast
 * mischaracterises what it is; and its colour — destructive red — sits only
 * about ten degrees of hue from the primary terracotta the other bars use,
 * close enough that the difference reads as a shade rather than a distinct
 * colour, which matters most for exactly the readers a colour-only signal
 * fails. The diagonal fill on that one bar is the second channel: a texture
 * cue that survives colour-blindness, print and forced-colour modes, the
 * same reasoning `dataviz`'s own guidance gives for status colours.
 */
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
  const [picked, setPicked] = useState<string | null>(null);
  const pickedDay = picked ? forecast.find((d) => d.key === picked) : null;

  const overdue = forecast[0]?.isOverdue ? forecast[0] : null;
  const days = overdue ? forecast.slice(1) : forecast;

  function bar(day: ForecastDay, index: number) {
    const height = (day.count / max) * 100;
    return (
      <button
        key={day.key}
        type="button"
        onClick={() => setPicked(day.key === picked ? null : day.key)}
        onMouseEnter={() => setPicked(day.key)}
        onMouseLeave={() => setPicked(null)}
        aria-label={`${
          day.isOverdue
            ? t.stats.overdue
            : formatDay(day.date, t.common.dateLocale, timeZone)
        } — ${day.count}`}
        className="focus-visible:ring-ring flex h-full flex-1 flex-col justify-end rounded-t-[4px] focus-visible:ring-2 focus-visible:outline-none"
      >
        <motion.div
          initial={{ scaleY: 0 }}
          animate={{ scaleY: 1 }}
          transition={{
            duration: 0.5,
            delay: Math.min(index * 0.02, 0.3),
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
            // The second channel: diagonal stripes, only on the accumulation
            // bucket, so it reads as "a different kind of bar" even in
            // grayscale or to a reader who cannot separate the two hues.
            backgroundImage: day.isOverdue
              ? "repeating-linear-gradient(135deg, rgb(255 255 255 / 0.28) 0 3px, transparent 3px 7px)"
              : undefined,
            // `--foreground`, not `--ring`: ring is a terracotta within a few
            // degrees of hue of `--primary`, so a ring-coloured outline on a
            // primary-coloured bar is very nearly invisible — which is the
            // one thing a selection indicator cannot be. Foreground inverts
            // with the theme and so contrasts against every bar colour here.
            outline:
              day.key === picked ? "2px solid var(--foreground)" : undefined,
            outlineOffset: day.key === picked ? "-2px" : undefined,
          }}
          className="w-full rounded-t-[4px]"
        />
      </button>
    );
  }

  return (
    <div className="bg-card mt-4 rounded-2xl border p-5">
      {/* Reserved so picking a bar never nudges the chart underneath it. */}
      <p
        className="text-muted-foreground mb-2 text-xs tabular-nums"
        style={{ minHeight: "1rem" }}
      >
        {pickedDay
          ? `${pickedDay.isOverdue ? t.stats.overdue : formatDay(pickedDay.date, t.common.dateLocale, timeZone)} · ${pickedDay.count}`
          : ""}
      </p>

      <div className="flex h-44 items-end gap-1.5">
        {overdue ? (
          <>
            <div className="flex h-full w-8 shrink-0 flex-col justify-end">
              {bar(overdue, 0)}
            </div>
            <div
              className="bg-border mx-0.5 h-full w-px shrink-0"
              aria-hidden="true"
            />
          </>
        ) : null}
        {days.map((day, index) => bar(day, overdue ? index + 1 : index))}
      </div>

      {/* Sparse axis: only the ends and today carry a label — on a phone
          every third day besides, so a reader is never more than a couple
          of silent bars from a date. */}
      <div className="text-muted-foreground mt-2 flex gap-1.5 text-[10px]">
        {overdue ? (
          <>
            <div className="w-8 shrink-0 text-center">
              <span className="text-destructive font-medium">
                {t.stats.late}
              </span>
            </div>
            <div className="mx-0.5 w-px shrink-0" aria-hidden="true" />
          </>
        ) : null}
        {days.map((day, index) => (
          <div key={day.key} className="flex-1 text-center">
            {day.isToday ? (
              <span className="text-foreground font-medium">
                {t.stats.today}
              </span>
            ) : index === days.length - 1 ? (
              formatDay(day.date, t.common.dateLocale, timeZone)
            ) : index % 3 === 0 ? (
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
