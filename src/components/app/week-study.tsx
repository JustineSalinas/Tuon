"use client";

import { useMemo } from "react";

import { useAuth } from "@/components/providers/auth-provider";
import { useI18n } from "@/components/providers/i18n-provider";
import { useStudySessions } from "@/lib/hooks/use-firestore";
import { usePreferences } from "@/lib/hooks/use-preferences";
import { dayKey } from "@/lib/hooks/use-review-cards";
import {
  formatMinutes,
  minutesByDay,
  weekDayKeys,
} from "@/lib/organiser/sessions";
import { buildStreaks } from "@/lib/stats/heatmap";
import { Panel, PanelLede } from "@/components/app/panel";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

/**
 * This week's study time, on the dashboard.
 *
 * The year grid used to sit here, and it was answering the wrong question for
 * this screen. A dashboard is about today: 52 weeks of squares is a thing you
 * look at monthly, and putting it under the plan meant the one number a
 * student actually wants — did I do anything this week — was the hardest thing
 * on the page to read. The year still exists, on the calendar page, where the
 * rest of "your time" lives and where the dashboard's own link already went.
 *
 * Seven bars rather than seven squares. At a week's width there is room to
 * encode the amount as a height instead of as a shade, and a height is read
 * without a legend.
 */

/**
 * The tallest bar's worth, in minutes.
 *
 * A floor, not a fixed scale: without it, a week with one nine-minute session
 * draws a single full-height bar and looks like a heavy week. With it, a light
 * week looks light — which is the honest thing for a habit tracker to do, and
 * the reason the whole card exists.
 */
const SCALE_FLOOR = 60;

export function WeekStudy() {
  const { user } = useAuth();
  const { t } = useI18n();
  const { timeZone } = usePreferences();
  const { sessions, loading } = useStudySessions(user?.uid);

  const today = dayKey(new Date(), timeZone);
  const byDay = useMemo(() => minutesByDay(sessions), [sessions]);
  const days = useMemo(() => weekDayKeys(today), [today]);
  const streaks = useMemo(() => buildStreaks(byDay, today), [byDay, today]);

  if (loading) return <Skeleton className="h-52 w-full rounded-2xl" />;

  const minutes = days.map((key) => byDay.get(key) ?? 0);
  const total = minutes.reduce((sum, value) => sum + value, 0);
  const scale = Math.max(SCALE_FLOOR, ...minutes);

  return (
    <Panel>
      <PanelLede
        value={formatMinutes(total)}
        aside={
          <p className="text-muted-foreground text-sm">
            {t.dashboard.streakDays(streaks.current)}
          </p>
        }
      />

      <div className="mt-5 flex items-end justify-between gap-1.5">
        {days.map((key, index) => {
          const value = minutes[index];
          const isToday = key === today;
          // A day that has not happened yet is drawn as an empty slot rather
          // than as a zero — nobody has failed to study on Saturday on a
          // Tuesday.
          const future = key > today;

          return (
            <div
              key={key}
              className="flex min-w-0 flex-1 flex-col items-center gap-1.5"
            >
              <div className="flex h-20 w-full items-end justify-center">
                <div
                  className={cn(
                    "w-full max-w-8 rounded-t-[3px] transition-[height]",
                    value === 0
                      ? future
                        ? "bg-secondary/40"
                        : "bg-secondary"
                      : isToday
                        ? "bg-primary"
                        : "bg-primary/55",
                  )}
                  style={{
                    // A floor so a short session is still a visible mark; zero
                    // days keep a hairline so the week reads as seven slots.
                    height:
                      value === 0
                        ? 3
                        : `${Math.max(8, (value / scale) * 80)}px`,
                  }}
                />
              </div>
              <span
                className={cn(
                  "text-[11px]",
                  isToday
                    ? "text-foreground font-medium"
                    : "text-muted-foreground",
                )}
              >
                {t.common.weekdaysNarrow[index]}
              </span>
            </div>
          );
        })}
      </div>
    </Panel>
  );
}
