"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { motion } from "motion/react";
import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";

import { useAuth } from "@/components/providers/auth-provider";
import { useNow } from "@/lib/hooks/use-now";
import { usePreferences } from "@/lib/hooks/use-preferences";
import {
  bucketByDue,
  dayKey,
  useForecast,
  useReviewCards,
  type ReviewCard,
} from "@/lib/hooks/use-review-cards";
import { PaperCreature } from "@/components/brand/paper-creature";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

const WEEKDAYS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

export default function CalendarPage() {
  const { user } = useAuth();
  const { cards, loading } = useReviewCards(user?.uid);
  const { timeZone } = usePreferences();
  const now = useNow(60_000);
  const forecast = useForecast(cards, timeZone);

  const [monthOffset, setMonthOffset] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);

  const todayKey = dayKey(new Date(now), timeZone);
  const buckets = useMemo(() => bucketByDue(cards, now), [cards, now]);
  const waiting = buckets.due.length + buckets.fresh.length;

  const month = useMemo(
    () => buildMonth(now, monthOffset, timeZone),
    [now, monthOffset, timeZone],
  );

  const selectedCards = selected ? (forecast.get(selected) ?? []) : [];

  return (
    <main className="mx-auto w-full max-w-4xl px-4 py-6 md:px-8 md:py-10">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-semibold tracking-tight">
            Calendar
          </h1>
          <p className="text-muted-foreground mt-1.5 text-sm">
            When each card comes back. Spaced repetition decides the dates — you
            just show up.
          </p>
        </div>
        {waiting > 0 ? (
          <Button size="lg" render={<Link href="/app/review" />}>
            Review {waiting} now
          </Button>
        ) : null}
      </header>

      {loading ? (
        <Skeleton className="mt-8 h-96 w-full rounded-2xl" />
      ) : cards.length === 0 ? (
        <EmptyCalendar />
      ) : (
        <>
          {/* Month navigation */}
          <div className="mt-8 flex items-center justify-between">
            <h2 className="font-display text-lg font-semibold tracking-tight">
              {month.label}
            </h2>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label="Previous month"
                onClick={() => setMonthOffset((m) => m - 1)}
              >
                <ChevronLeft />
              </Button>
              {monthOffset !== 0 ? (
                <Button variant="ghost" size="sm" onClick={() => setMonthOffset(0)}>
                  Today
                </Button>
              ) : null}
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label="Next month"
                onClick={() => setMonthOffset((m) => m + 1)}
              >
                <ChevronRight />
              </Button>
            </div>
          </div>

          {/* Grid */}
          <div className="bg-card mt-4 overflow-hidden rounded-2xl border">
            <div className="text-muted-foreground grid grid-cols-7 border-b text-center text-xs">
              {WEEKDAYS.map((day) => (
                <div key={day} className="py-2 font-medium">
                  {day}
                </div>
              ))}
            </div>

            <div className="grid grid-cols-7">
              {month.days.map((day, index) => {
                const count = forecast.get(day.key)?.length ?? 0;
                const isToday = day.key === todayKey;
                const isPast = day.key < todayKey;
                const isSelected = day.key === selected;

                return (
                  <motion.button
                    key={day.key}
                    type="button"
                    onClick={() => setSelected(isSelected ? null : day.key)}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: Math.min(index * 0.004, 0.2) }}
                    className={cn(
                      "relative flex aspect-square flex-col items-center justify-center gap-1 border-r border-b text-sm transition-colors last:border-r-0",
                      !day.inMonth && "text-muted-foreground/40",
                      isSelected ? "bg-accent" : "hover:bg-accent/40",
                    )}
                  >
                    <span
                      className={cn(
                        "grid size-7 place-items-center rounded-full tabular-nums",
                        isToday && "bg-primary text-primary-foreground font-semibold",
                      )}
                    >
                      {day.dayOfMonth}
                    </span>

                    {count > 0 ? (
                      <span
                        className={cn(
                          "rounded-full px-1.5 text-[10px] font-medium tabular-nums",
                          isPast
                            ? "bg-destructive/15 text-destructive"
                            : "bg-primary/15 text-primary",
                        )}
                      >
                        {count}
                      </span>
                    ) : (
                      <span className="h-[15px]" />
                    )}
                  </motion.button>
                );
              })}
            </div>
          </div>

          <Legend />

          {/* Selected day */}
          {selected ? (
            <DayDetail
              dayKeyValue={selected}
              cards={selectedCards}
              isPast={selected < todayKey}
            />
          ) : null}
        </>
      )}
    </main>
  );
}

function Legend() {
  return (
    <div className="text-muted-foreground mt-3 flex flex-wrap items-center gap-4 text-xs">
      <span className="flex items-center gap-1.5">
        <span className="bg-primary size-2.5 rounded-full" />
        Scheduled
      </span>
      <span className="flex items-center gap-1.5">
        <span className="bg-destructive size-2.5 rounded-full" />
        Overdue
      </span>
      <span>Tap a day to see which cards.</span>
    </div>
  );
}

function DayDetail({
  dayKeyValue,
  cards,
  isPast,
}: {
  dayKeyValue: string;
  cards: ReviewCard[];
  isPast: boolean;
}) {
  const bySet = useMemo(() => {
    const map = new Map<string, { title: string; count: number }>();
    for (const card of cards) {
      const entry = map.get(card.studySetId);
      if (entry) entry.count += 1;
      else map.set(card.studySetId, { title: card.studySetTitle, count: 1 });
    }
    return [...map.entries()];
  }, [cards]);

  return (
    <motion.section
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className="mt-6"
    >
      <h2 className="font-display text-lg font-semibold tracking-tight">
        {formatDayLabel(dayKeyValue)}
      </h2>

      {cards.length === 0 ? (
        <p className="text-muted-foreground mt-2 text-sm">Nothing scheduled.</p>
      ) : (
        <>
          <p className="text-muted-foreground mt-1 text-sm">
            {cards.length} {cards.length === 1 ? "card" : "cards"}
            {isPast ? " — overdue" : ""}
          </p>
          <div className="mt-3 grid gap-2">
            {bySet.map(([setId, entry]) => (
              <Link
                key={setId}
                href={`/app/sets/${setId}`}
                className="hover:border-primary/40 hover:bg-accent/30 flex items-center gap-3 rounded-xl border p-3.5 transition-colors"
              >
                <span className="min-w-0 flex-1 truncate text-sm font-medium">
                  {entry.title}
                </span>
                <Badge variant="secondary" className="tabular-nums">
                  {entry.count}
                </Badge>
              </Link>
            ))}
          </div>
        </>
      )}
    </motion.section>
  );
}

function EmptyCalendar() {
  return (
    <div className="mt-10 rounded-2xl border border-dashed py-14 text-center">
      <PaperCreature state="asleep" className="mx-auto size-28" />
      <h2 className="font-display mt-2 text-lg font-semibold tracking-tight">
        Nothing scheduled yet
      </h2>
      <p className="text-muted-foreground mx-auto mt-1.5 max-w-xs text-sm leading-relaxed">
        Once you review a card for the first time, it lands on this calendar —
        and comes back right before you would have forgotten it.
      </p>
      <Button className="mt-6" render={<Link href="/app/notes/new" />}>
        <CalendarDays />
        Make a study set
      </Button>
    </div>
  );
}

interface MonthDay {
  key: string;
  dayOfMonth: number;
  inMonth: boolean;
}

/** Builds a Sunday-aligned 6-week grid around the offset month. */
function buildMonth(
  now: number,
  offset: number,
  timeZone: string,
): { label: string; days: MonthDay[] } {
  const base = new Date(now);
  const first = new Date(base.getFullYear(), base.getMonth() + offset, 1);

  const label = new Intl.DateTimeFormat("en-PH", {
    month: "long",
    year: "numeric",
  }).format(first);

  const gridStart = new Date(first);
  gridStart.setDate(1 - first.getDay());

  const days: MonthDay[] = [];
  for (let i = 0; i < 42; i += 1) {
    const date = new Date(gridStart);
    date.setDate(gridStart.getDate() + i);
    days.push({
      key: dayKey(date, timeZone),
      dayOfMonth: date.getDate(),
      inMonth: date.getMonth() === first.getMonth(),
    });
  }
  return { label, days };
}

function formatDayLabel(key: string): string {
  const [year, month, day] = key.split("-").map(Number);
  return new Intl.DateTimeFormat("en-PH", {
    weekday: "long",
    month: "long",
    day: "numeric",
  }).format(new Date(year, month - 1, day));
}
