"use client";

import { Panel } from "@/components/app/panel";
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
    <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-4">
      {stats.map((stat) => (
        <Panel key={stat.label} className="p-4 sm:p-5">
          <p className="font-display text-2xl font-semibold tracking-tight tabular-nums sm:text-3xl">
            {stat.value}
          </p>
          <p className="text-muted-foreground mt-1 text-sm">{stat.label}</p>
        </Panel>
      ))}
    </div>
  );
}
