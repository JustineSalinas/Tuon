/**
 * The study heatmap, and the streak that comes with it.
 *
 * A year of study time as one grid, the way GitHub shows commits. It is the
 * only view in Tuón that answers "have I actually been doing this?" — every
 * other screen answers a question about the material rather than about the
 * habit.
 *
 * A note on the streak, because it contradicts a decision made earlier in this
 * codebase and should not look like an accident. The study log deliberately
 * has no streak: a streak punishes the sick day and the week of finals, which
 * is exactly when a student needs the app on their side. This was asked for
 * anyway, so it is built — but built to be a RECORD rather than a threat. It
 * counts up, it is shown beside the best one so a broken run still leaves
 * something standing, and nothing anywhere warns that it is about to be lost.
 * That last part is the whole difference between a log and a slot machine.
 *
 * Pure. No React, no Firestore.
 */

/** Levels 0-4, low to high, the same shape GitHub uses. */
export const HEAT_LEVELS = [0, 1, 2, 3, 4] as const;
export type HeatLevel = (typeof HEAT_LEVELS)[number];

/**
 * Minutes needed for each level.
 *
 * Fixed thresholds rather than quartiles of the student's own history. Relative
 * shading makes a light week look identical to a heavy one, which flatters the
 * number at the cost of it meaning anything — and the point of an hours grid
 * is that an hour is an hour whenever you look at it.
 */
export const LEVEL_MINUTES = [1, 15, 30, 60] as const;

export function levelFor(minutes: number): HeatLevel {
  if (minutes >= LEVEL_MINUTES[3]) return 4;
  if (minutes >= LEVEL_MINUTES[2]) return 3;
  if (minutes >= LEVEL_MINUTES[1]) return 2;
  if (minutes >= LEVEL_MINUTES[0]) return 1;
  return 0;
}

export interface HeatDay {
  /** `YYYY-MM-DD`. */
  day: string;
  minutes: number;
  level: HeatLevel;
  /** Days in the future are rendered as empty holes, not as zero days. */
  future: boolean;
}

/** One column of the grid, Sunday at the top. */
export type HeatWeek = HeatDay[];

export interface Heatmap {
  weeks: HeatWeek[];
  /** Month name and the column it starts at, for the labels along the top. */
  months: { label: string; column: number }[];
  totalMinutes: number;
  /** Days with any study at all, in the window. */
  activeDays: number;
  bestDayMinutes: number;
}

const MS_PER_DAY = 86_400_000;

function toKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(
    date.getDate(),
  ).padStart(2, "0")}`;
}

function fromKey(key: string): Date {
  const [year, month, day] = key.split("-").map(Number);
  // Local midday, not midnight: this date is only ever used to step days and
  // read a month name, and midday cannot be knocked into the previous day by
  // an hour of drift.
  return new Date(year, month - 1, day, 12);
}

export function shiftDays(key: string, days: number): string {
  const date = fromKey(key);
  // Walking the day number rather than adding milliseconds, so a DST change
  // cannot produce a duplicated or missing day.
  date.setDate(date.getDate() + days);
  return toKey(date);
}

export function daysBetweenKeys(from: string, to: string): number {
  return Math.round((fromKey(to).getTime() - fromKey(from).getTime()) / MS_PER_DAY);
}

/**
 * Builds the grid, ending on the week that contains `today`.
 *
 * Columns are weeks and rows are weekdays, Sunday first — the arrangement the
 * shape is recognisable in. The last column runs to the end of the current
 * week, with the days after today marked `future` so they render as holes
 * rather than as days the student failed to study.
 */
export function buildHeatmap(
  minutesByDay: Map<string, number>,
  today: string,
  weeks = 26,
): Heatmap {
  const todayDate = fromKey(today);
  const endOfWeek = shiftDays(today, 6 - todayDate.getDay());
  const start = shiftDays(endOfWeek, -(weeks * 7 - 1));

  const grid: HeatWeek[] = [];
  const months: { label: string; column: number }[] = [];
  let totalMinutes = 0;
  let activeDays = 0;
  let bestDayMinutes = 0;
  let lastMonth = -1;

  for (let w = 0; w < weeks; w += 1) {
    const week: HeatWeek = [];
    for (let d = 0; d < 7; d += 1) {
      const day = shiftDays(start, w * 7 + d);
      const future = daysBetweenKeys(today, day) > 0;
      const minutes = future ? 0 : (minutesByDay.get(day) ?? 0);

      if (!future) {
        totalMinutes += minutes;
        if (minutes > 0) activeDays += 1;
        if (minutes > bestDayMinutes) bestDayMinutes = minutes;
      }

      week.push({ day, minutes, level: future ? 0 : levelFor(minutes), future });

      // The month label sits over the column where that month first appears.
      const date = fromKey(day);
      if (d === 0 && date.getMonth() !== lastMonth) {
        lastMonth = date.getMonth();
        months.push({
          label: date.toLocaleDateString(undefined, { month: "short" }),
          column: w,
        });
      }
    }
    grid.push(week);
  }

  return { weeks: grid, months, totalMinutes, activeDays, bestDayMinutes };
}

export interface Streaks {
  current: number;
  longest: number;
}

/**
 * Current and best run of consecutive days with any study.
 *
 * TODAY DOES NOT BREAK A STREAK UNTIL IT IS OVER. Someone who opens the app at
 * nine in the morning has not failed anything yet, and showing them a zero
 * because the day is young is both wrong and mean. So a run ending yesterday
 * still counts as current.
 *
 * "Any study" rather than a minimum, deliberately: a ten-minute day on the bus
 * is a day the habit held, and a threshold would quietly tell a student that
 * their real effort did not count.
 */
export function buildStreaks(minutesByDay: Map<string, number>, today: string): Streaks {
  const active = new Set(
    [...minutesByDay.entries()].filter(([, m]) => m > 0).map(([day]) => day),
  );
  if (active.size === 0) return { current: 0, longest: 0 };

  // --- current -------------------------------------------------------------
  let current = 0;
  let cursor = active.has(today) ? today : shiftDays(today, -1);
  while (active.has(cursor)) {
    current += 1;
    cursor = shiftDays(cursor, -1);
  }

  // --- longest -------------------------------------------------------------
  // Sorted keys are chronological because YYYY-MM-DD sorts as a string.
  const sorted = [...active].sort();
  let longest = 1;
  let run = 1;
  for (let i = 1; i < sorted.length; i += 1) {
    run = daysBetweenKeys(sorted[i - 1], sorted[i]) === 1 ? run + 1 : 1;
    if (run > longest) longest = run;
  }

  return { current, longest: Math.max(longest, current) };
}

/** "3h 25m" / "45m" / "0m", matching the study log's phrasing. */
export function formatHours(minutes: number): string {
  const total = Math.max(0, Math.round(minutes));
  const hours = Math.floor(total / 60);
  const rest = total % 60;
  if (hours === 0) return `${rest}m`;
  if (rest === 0) return `${hours}h`;
  return `${hours}h ${rest}m`;
}
