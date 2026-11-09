"use client";

/**
 * Four numbers, one row — not four identical cards.
 *
 * The first version of this was a grid of same-size bordered boxes, each with
 * a big number over a small label: the generic dashboard-metric template.
 * Nothing here actually needs its own card chrome; they're one fact-strip,
 * the way a receipt lists totals, divided by hairlines instead of repeated
 * borders and shadows.
 */

import { useI18n } from "@/components/providers/i18n-provider";

export function StatRow({
  streakDays,
  setsInProgress,
  cardsThisWeek,
  readinessPct,
}: {
  streakDays: number;
  setsInProgress: number;
  cardsThisWeek: number;
  /** null when there is nothing to project readiness from yet. */
  readinessPct: number | null;
}) {
  const { t } = useI18n();

  const stats = [
    { value: String(streakDays), label: t.dashboard.statStreak },
    { value: String(setsInProgress), label: t.dashboard.statSets },
    { value: String(cardsThisWeek), label: t.dashboard.statCardsWeek },
    {
      value: readinessPct === null ? "—" : `${readinessPct}%`,
      label: t.dashboard.statReady,
    },
  ];

  return (
    <div className="divide-border grid grid-cols-2 divide-x divide-y sm:grid-cols-4 sm:divide-y-0">
      {stats.map((stat) => (
        <div key={stat.label} className="px-4 py-3 first:pl-0 sm:py-0">
          <p className="font-display text-2xl font-semibold tracking-tight tabular-nums">
            {stat.value}
          </p>
          <p className="text-muted-foreground mt-0.5 text-sm">{stat.label}</p>
        </div>
      ))}
    </div>
  );
}
