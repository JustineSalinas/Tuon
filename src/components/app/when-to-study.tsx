"use client";

import { useMemo } from "react";
import Link from "next/link";
import { CalendarPlus, Clock } from "lucide-react";

import { useAuth } from "@/components/providers/auth-provider";
import { useI18n } from "@/components/providers/i18n-provider";
import { usePlanItems } from "@/lib/hooks/use-firestore";
import { usePreferences } from "@/lib/hooks/use-preferences";
import { useNow } from "@/lib/hooks/use-now";
import {
  classesOn,
  formatMinute,
  weekdayOfKey,
} from "@/lib/organiser/plan-items";
import {
  minutesForCards,
  nextBusy,
  suggestWindow,
} from "@/lib/organiser/free-time";
import { minutesOfDayIn } from "@/lib/time-zone";
import { Panel } from "@/components/app/panel";
import { cn } from "@/lib/utils";

/**
 * The answer to "when", which the dashboard never had.
 *
 * "8 cards due today" is a fact a student already suspected. The question
 * they are actually holding is when they are supposed to do it, and that
 * depends on the one thing only they know — that Tuesday has a gap at ten and
 * Friday afternoon is empty. Everything needed to answer it was already in
 * the timetable; nothing read it.
 *
 * This is also why the timetable is worth filling in at all. Before this it
 * drew your week back at you and warned about clashes, which is not a trade
 * for twenty rows of typing. With no timetable the card says so and offers to
 * take one, which is the only place in the product that ever asks.
 */
export function WhenToStudy({
  cards,
  todayKey,
}: {
  /** Cards today's plan is asking for. Drives how long a block has to be. */
  cards: number;
  todayKey: string;
}) {
  const { user } = useAuth();
  const { t } = useI18n();
  const { timeZone } = usePreferences();
  const { items, loading } = usePlanItems(user?.uid);
  // A minute is the right resolution: the suggestion moves as the day does.
  const now = useNow(60_000);

  const nowMinute = minutesOfDayIn(new Date(now), timeZone);
  const weekday = weekdayOfKey(todayKey);

  const classes = useMemo(() => classesOn(items, weekday), [items, weekday]);

  const busy = useMemo(
    () =>
      classes.map((item) => ({
        startMinute: item.startMinute ?? 0,
        endMinute: item.endMinute ?? 0,
      })),
    [classes],
  );

  const needMinutes = minutesForCards(cards);
  const slot = useMemo(
    () => suggestWindow(busy, needMinutes, { nowMinute }),
    [busy, needMinutes, nowMinute],
  );

  const upNext = useMemo(() => {
    const next = nextBusy(
      classes.map((item) => ({
        ...item,
        startMinute: item.startMinute ?? 0,
        endMinute: item.endMinute ?? 0,
      })),
      nowMinute,
    );
    return next ?? null;
  }, [classes, nowMinute]);

  // Nothing to say while the timetable is still in flight, and nothing to say
  // when the plan is empty — a study window for no cards is noise.
  if (loading || cards <= 0) return null;

  // Nothing scheduled. An offer, not a panel.
  //
  // Two of Tuón's four kinds of student own a class timetable. A board or
  // licensure reviewer often has no fixed week at all, and plenty are working
  // while they review — for them a permanent dashed card saying "add your
  // schedule" is a standing reproach for using the product exactly as
  // intended. One quiet line stays findable without becoming furniture.
  if (items.every((item) => item.kind !== "class")) {
    return (
      <Link
        href="/app/calendar"
        className="text-muted-foreground hover:text-foreground flex items-start gap-2 text-xs leading-relaxed transition-colors"
      >
        <CalendarPlus className="mt-0.5 size-3.5 shrink-0" />
        <span>
          <span className="text-foreground font-medium">
            {t.whenToStudy.addTimetable}
          </span>
          {" — "}
          {t.whenToStudy.addTimetableWhy}
        </span>
      </Link>
    );
  }

  return (
    <Panel className="p-4">
      <div className="flex items-start gap-3">
        <Clock
          className={cn(
            "mt-0.5 size-4 shrink-0",
            slot && !slot.tight ? "text-primary" : "text-muted-foreground",
          )}
        />
        <div className="min-w-0 flex-1">
          {slot ? (
            <>
              <p className="text-sm font-medium tabular-nums">
                {t.whenToStudy.span(
                  formatMinute(slot.startMinute),
                  formatMinute(slot.endMinute),
                )}
              </p>
              <p className="text-muted-foreground mt-0.5 text-xs">
                {t.whenToStudy.reason[slot.reason]}{" "}
                {slot.tight
                  ? t.whenToStudy.tight(slot.minutes)
                  : t.whenToStudy.needs(needMinutes)}
              </p>
            </>
          ) : (
            <p className="text-sm font-medium">{t.whenToStudy.noneLeft}</p>
          )}

          {/* What is between them and that block. Rendered even when there is
              no window left, because "your last class ends at nine" is the
              reason there isn't one. */}
          <p className="text-muted-foreground mt-2 text-xs">
            {upNext
              ? t.whenToStudy.nextClass(
                  upNext.title,
                  formatMinute(upNext.startMinute ?? 0),
                )
              : t.whenToStudy.noClasses}
          </p>
        </div>
      </div>
    </Panel>
  );
}
