"use client";

/**
 * A year of study time, as a grid.
 *
 * The only view in the app that answers "have I actually been doing this?" —
 * everything else answers a question about the material rather than about the
 * habit. It reads the same `studySessions` the week view does, so the timer,
 * a finished test and anything added by hand all land here.
 *
 * The streak is shown because it was asked for, and shown as a RECORD: it
 * counts up, the best run sits beside it so a broken one still leaves
 * something standing, and nothing warns that it is about to be lost. A study
 * app that makes you afraid to miss a day has stopped being on your side.
 */

import { useEffect, useMemo, useRef, useState } from "react";

import { useAuth } from "@/components/providers/auth-provider";
import { useStudySessions } from "@/lib/hooks/use-firestore";
import { usePreferences } from "@/lib/hooks/use-preferences";
import { dayKey } from "@/lib/hooks/use-review-cards";
import { minutesByDay } from "@/lib/organiser/sessions";
import {
  buildHeatmap,
  buildStreaks,
  formatHours,
  type HeatLevel,
} from "@/lib/stats/heatmap";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

/**
 * One hue, five steps, dark = more. An ordered quantity takes an ordinal ramp;
 * different colours per level would imply the levels are categories.
 *
 * The empty step is the page's own warm stone rather than a grey, and the
 * first lit step is `accent` — the faint terracotta wash the rest of the app
 * uses for "something is here" — so a light week glows rather than looking
 * like an error state. The top step is the brand terracotta itself.
 */
const LEVEL_CLASS: Record<HeatLevel, string> = {
  0: "bg-secondary",
  1: "bg-accent",
  2: "bg-primary/35",
  3: "bg-primary/65",
  4: "bg-primary",
};

/** What each step is worth, said in the legend rather than "less / more". */
const LEVEL_LABEL = ["none", "under 15m", "15m", "30m", "1h+"];

const WEEKDAY_LABEL = ["", "Mon", "", "Wed", "", "Fri", ""];

/**
 * A full year, the way GitHub shows it.
 *
 * Half a year left most of the card empty on a desktop, and a year is the
 * window that makes a term's shape visible — you can see the weeks before an
 * exam and the ones after it.
 */
const WEEKS = 52;

/**
 * Cell and gap, in px. The month labels are positioned against this.
 *
 * Bigger and further apart than the grid this borrows its shape from, with a
 * radius closer to a bead than a pixel. A dense field of hard little squares
 * reads as a developer tool; Tuón is a study app a seventeen-year-old opens at
 * eleven at night, and the difference is almost entirely in the corners and
 * the breathing room.
 */
const CELL = 13;
const GAP = 4;
const RADIUS = 4;

export function StudyHeatmap() {
  const { user } = useAuth();
  const { sessions, loading } = useStudySessions(user?.uid);
  const { timeZone } = usePreferences();

  const today = dayKey(new Date(), timeZone);
  const byDay = useMemo(() => minutesByDay(sessions), [sessions]);
  const map = useMemo(() => buildHeatmap(byDay, today, WEEKS), [byDay, today]);
  const streaks = useMemo(() => buildStreaks(byDay, today), [byDay, today]);

  // Touch devices have no hover, so a tapped cell shows its figure instead.
  const [picked, setPicked] = useState<string | null>(null);
  const pickedDay = picked
    ? map.weeks.flat().find((d) => d.day === picked)
    : null;

  /**
   * Open on the most recent weeks.
   *
   * A year of columns does not fit a phone, and the grid starts at the oldest
   * week — so without this a student opened it on twelve months of empty
   * squares and had to drag sideways to find the days they actually studied.
   * The interesting end is the right-hand one.
   */
  const scrollerRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = scrollerRef.current;
    if (el) el.scrollLeft = el.scrollWidth;
  }, [loading]);

  if (loading) return <Skeleton className="h-44 w-full rounded-2xl" />;

  return (
    <div className="bg-card rounded-2xl border p-5">
      {/* A sentence first, then the figures. Every other card in Tuón opens
          by saying what it means — "8 cards need work", "All caught up" — and
          leads the numbers rather than opening with a scoreboard. */}
      <div className="flex flex-wrap items-start justify-between gap-x-6 gap-y-2">
        <div>
          <p className="text-muted-foreground text-xs font-medium tracking-widest uppercase">
            Your year
          </p>
          <p className="font-display mt-1.5 text-2xl font-semibold tracking-tight">
            {map.activeDays === 0
              ? "No study logged yet"
              : `${formatHours(map.totalMinutes)} across ${map.activeDays} ${
                  map.activeDays === 1 ? "day" : "days"
                }`}
          </p>
        </div>

        <p
          className="text-muted-foreground text-xs tabular-nums"
          // Reserves the line so hovering a cell does not nudge the layout.
          style={{ minHeight: "1rem" }}
        >
          {pickedDay
            ? `${formatDay(pickedDay.day)} · ${formatHours(pickedDay.minutes)}`
            : ""}
        </p>
      </div>

      {/* Both runs, always. Hiding the longest until it differed meant the
          number appeared from nowhere the first time a streak broke — the
          worst possible moment to introduce a figure whose whole job is to
          say "you have done better than this before". */}
      <dl className="mt-3 flex flex-wrap gap-x-8 gap-y-2">
        <Figure
          value={`${streaks.current} ${streaks.current === 1 ? "day" : "days"}`}
          label="current run"
        />
        <Figure
          value={`${streaks.longest} ${streaks.longest === 1 ? "day" : "days"}`}
          label="longest run"
          muted
        />
      </dl>

      {/* Horizontal scroll only. The page still scrolls normally over it,
          which is not true of a box that scrolls vertically. */}
      <div ref={scrollerRef} className="mt-4 overflow-x-auto pb-1">
        <div className="w-max">
          {/* Month labels sit over the column each month starts in. */}
          <div className="relative mb-1 ml-10 h-4">
            {map.months.map((month) => (
              <span
                key={`${month.label}-${month.column}`}
                className="text-muted-foreground absolute text-[10px] font-medium tracking-widest uppercase"
                style={{ left: `${month.column * (CELL + GAP)}px` }}
              >
                {month.label}
              </span>
            ))}
          </div>

          <div className="flex" style={{ gap: `${GAP}px` }}>
            {/* Pinned. It lives inside the scroller so it lines up with the
                rows, and the grid opens scrolled to the right — without this
                the day names slide out of view exactly when the grid is
                showing the days you care about. */}
            <div
              className="bg-card sticky left-0 z-10 mr-1 flex w-8 flex-col pr-1"
              style={{ gap: `${GAP}px` }}
            >
              {WEEKDAY_LABEL.map((label, i) => (
                <span
                  key={i}
                  className="text-muted-foreground text-[10px]"
                  style={{ height: `${CELL}px`, lineHeight: `${CELL}px` }}
                >
                  {label}
                </span>
              ))}
            </div>

            {map.weeks.map((week, w) => (
              <div key={w} className="flex flex-col" style={{ gap: `${GAP}px` }}>
                {week.map((day) =>
                  day.future ? (
                    <span key={day.day} style={{ width: CELL, height: CELL }} />
                  ) : (
                    <button
                      key={day.day}
                      type="button"
                      onClick={() => setPicked(day.day === picked ? null : day.day)}
                      onMouseEnter={() => setPicked(day.day)}
                      onMouseLeave={() => setPicked(null)}
                      title={`${formatDay(day.day)} — ${formatHours(day.minutes)}`}
                      aria-label={`${formatDay(day.day)}, ${formatHours(day.minutes)}`}
                      style={{ width: CELL, height: CELL, borderRadius: RADIUS }}
                      className={cn(
                        "focus-visible:ring-ring transition-transform focus-visible:ring-2 focus-visible:outline-none",
                        LEVEL_CLASS[day.level],
                        day.day === picked && "scale-125",
                      )}
                    />
                  ),
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Named amounts rather than "less / more". A student wants to know
          what a dark square is worth, and the borrowed version answers that
          with a shrug. */}
      <div className="text-muted-foreground mt-4 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[11px]">
        {([1, 2, 3, 4] as HeatLevel[]).map((level) => (
          <span key={level} className="flex items-center gap-1.5">
            <span
              aria-hidden="true"
              style={{ width: CELL, height: CELL, borderRadius: RADIUS }}
              className={LEVEL_CLASS[level]}
            />
            {LEVEL_LABEL[level]}
          </span>
        ))}
      </div>
    </div>
  );
}

function Figure({
  value,
  label,
  muted,
}: {
  value: string;
  label: string;
  muted?: boolean;
}) {
  return (
    <div>
      <dt className="text-muted-foreground text-xs">{label}</dt>
      <dd
        className={cn(
          "font-display mt-0.5 text-lg font-semibold tabular-nums",
          muted ? "text-muted-foreground" : "text-primary",
        )}
      >
        {value}
      </dd>
    </div>
  );
}

function formatDay(key: string): string {
  const [year, month, day] = key.split("-").map(Number);
  return new Date(year, month - 1, day).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}
