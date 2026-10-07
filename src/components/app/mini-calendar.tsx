"use client";

import { useMemo } from "react";
import Link from "next/link";

import { useAuth } from "@/components/providers/auth-provider";
import { useI18n } from "@/components/providers/i18n-provider";
import { usePlanItems } from "@/lib/hooks/use-firestore";
import { usePreferences } from "@/lib/hooks/use-preferences";
import { dayKey } from "@/lib/hooks/use-review-cards";
import { Panel } from "@/components/app/panel";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

/**
 * The current month, at a glance, from the dashboard.
 *
 * Deliberately not the full `/app/calendar` page shrunk down: no month
 * navigation, no selected-day detail panel, no timetable or study log. One
 * question only — which days this month have something due — answered by a
 * dot, with today ringed so "where am I" needs no second look. Anything past
 * that question is a tap away, which is the same bargain `WeekStudy` and
 * `Upcoming` already make.
 *
 * Reads `planItems`, already fetched for the dashboard's own plan and
 * `Upcoming` card, rather than opening a second subscription.
 */
export function MiniCalendar() {
  const { user } = useAuth();
  const { t } = useI18n();
  const { timeZone } = usePreferences();
  const { items, loading } = usePlanItems(user?.uid);

  const todayKey = dayKey(new Date(), timeZone);

  const deadlineDays = useMemo(() => {
    const days = new Set<string>();
    for (const item of items) {
      if (item.kind === "deadline" && item.dueDate) days.add(item.dueDate);
    }
    return days;
  }, [items]);

  const month = useMemo(() => buildMonthGrid(todayKey), [todayKey]);

  if (loading) return <Skeleton className="h-64 w-full rounded-2xl" />;

  return (
    <Link href="/app/calendar" className="block">
      <Panel className="hover:border-primary/40 transition-colors">
        <div className="flex items-baseline justify-between">
          <p className="font-display text-lg font-semibold tracking-tight">
            {month.label}
          </p>
          <span className="text-muted-foreground text-xs">
            {t.dashboard.openCalendar}
          </span>
        </div>

        <div className="mt-4 grid grid-cols-7 gap-y-1.5 text-center">
          {t.common.weekdaysNarrow.map((label, i) => (
            <span key={i} className="text-muted-foreground text-[10px]">
              {label}
            </span>
          ))}

          {month.days.map((day) => {
            const isToday = day.key === todayKey;
            const hasDeadline = deadlineDays.has(day.key);

            return (
              <div
                key={day.key}
                className="flex flex-col items-center gap-0.5 py-0.5"
              >
                <span
                  className={cn(
                    "grid size-6 place-items-center rounded-full text-[12px] tabular-nums",
                    !day.inMonth && "text-muted-foreground/40",
                    day.inMonth && !isToday && "text-foreground",
                    isToday && "bg-primary text-primary-foreground font-medium",
                  )}
                >
                  {day.dayOfMonth}
                </span>
                <span
                  aria-hidden="true"
                  className={cn(
                    "size-1 rounded-full",
                    hasDeadline && day.inMonth ? "bg-primary" : "bg-transparent",
                  )}
                />
              </div>
            );
          })}
        </div>
      </Panel>
    </Link>
  );
}

interface MonthDay {
  key: string;
  dayOfMonth: number;
  inMonth: boolean;
}

/** Sunday-first 6x7 grid for the month `todayKey` falls in, in local time. */
function buildMonthGrid(todayKey: string): { label: string; days: MonthDay[] } {
  const [year, month] = todayKey.split("-").map(Number);
  const first = new Date(year, month - 1, 1);

  const label = new Intl.DateTimeFormat(undefined, {
    month: "long",
    year: "numeric",
  }).format(first);

  const gridStart = new Date(first);
  gridStart.setDate(1 - first.getDay());

  const days: MonthDay[] = [];
  for (let i = 0; i < 42; i += 1) {
    const date = new Date(gridStart);
    date.setDate(gridStart.getDate() + i);
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(
      date.getDate(),
    ).padStart(2, "0")}`;
    days.push({
      key,
      dayOfMonth: date.getDate(),
      inMonth: date.getMonth() === first.getMonth(),
    });
  }
  return { label, days };
}
