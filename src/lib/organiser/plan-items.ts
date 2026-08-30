/**
 * The organiser: todos, deadlines, and a weekly timetable.
 *
 * Tuón knew when a card was coming back and nothing else about a student's
 * week. That is half of "study app" missing: the reason someone opens their
 * notes on a Tuesday night is usually a problem set due Thursday, not a card
 * the scheduler surfaced. Without the deadline, the app can order cards
 * perfectly and still have the student studying the wrong subject.
 *
 * All pure. No React, no Firestore, so the ordering rules — which are the part
 * that decides what a student sees first — can be tested directly.
 */

import type { PlanItem } from "@/lib/types";

/** Mirrors the ceilings in firestore.rules. Keep the two in step. */
export const MAX_TITLE_CHARS = 140;
export const MAX_LOCATION_CHARS = 80;
export const MINUTES_IN_DAY = 24 * 60;

/** Sunday-first, matching Date.getDay() and the calendar grid above it. */
export const WEEKDAY_NAMES = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
] as const;

export const WEEKDAY_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;

/**
 * A `YYYY-MM-DD` day key, which sorts correctly as a plain string.
 *
 * Deliberately not a Date: a deadline is a calendar day in the student's own
 * zone, and pushing it through UTC moves it a day for everyone in Manila. The
 * same reasoning as UserProfile.examDate.
 */
export function isDayKey(value: unknown): value is string {
  return typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value);
}

/** Whole days from `from` to `to`, negative when `to` is in the past. */
export function daysBetween(from: string, to: string): number {
  const a = Date.parse(`${from}T00:00:00Z`);
  const b = Date.parse(`${to}T00:00:00Z`);
  if (Number.isNaN(a) || Number.isNaN(b)) return 0;
  return Math.round((b - a) / 86_400_000);
}

/**
 * How a deadline is described to a student.
 *
 * "In 3 days" is read faster than a date, and "Overdue by 2 days" is the one
 * that actually needs to shout. Past about a week the exact date is more
 * useful than a countdown, because "in 23 days" means nothing to anyone.
 */
export function describeDueDate(dueDate: string, today: string): string {
  const days = daysBetween(today, dueDate);
  if (days === 0) return "Today";
  if (days === 1) return "Tomorrow";
  if (days === -1) return "Yesterday";
  if (days < 0) return `${Math.abs(days)} days ago`;
  if (days <= 7) return `In ${days} days`;
  return formatDayKey(dueDate);
}

export function formatDayKey(dayKey: string): string {
  const [year, month, day] = dayKey.split("-").map(Number);
  if (!year || !month || !day) return dayKey;
  return new Intl.DateTimeFormat("en-PH", {
    month: "short",
    day: "numeric",
  }).format(new Date(year, month - 1, day));
}

/** "9:00 AM". Minutes from midnight, so no date is involved. */
export function formatMinute(minute: number): string {
  const clamped = Math.max(0, Math.min(MINUTES_IN_DAY - 1, Math.round(minute)));
  const hour24 = Math.floor(clamped / 60);
  const minutes = clamped % 60;
  const suffix = hour24 < 12 ? "AM" : "PM";
  const hour12 = hour24 % 12 === 0 ? 12 : hour24 % 12;
  return `${hour12}:${String(minutes).padStart(2, "0")} ${suffix}`;
}

/** Parses "09:30" from a time input. Returns null on anything else. */
export function parseTimeValue(value: string): number | null {
  const match = /^(\d{1,2}):(\d{2})$/.exec(value.trim());
  if (!match) return null;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (hours > 23 || minutes > 59) return null;
  return hours * 60 + minutes;
}

/** The inverse, for populating a time input from a stored minute. */
export function toTimeValue(minute: number): string {
  const clamped = Math.max(0, Math.min(MINUTES_IN_DAY - 1, Math.round(minute)));
  return `${String(Math.floor(clamped / 60)).padStart(2, "0")}:${String(
    clamped % 60,
  ).padStart(2, "0")}`;
}

/* -------------------------------------------------------------------------
   Selecting and ordering
   ------------------------------------------------------------------------- */

/**
 * Deadlines, soonest first, with anything already past kept at the front.
 *
 * Overdue work sorts before upcoming work deliberately. A missed deadline is
 * the thing a student most needs to see, and burying it below next week's
 * reading is how an organiser becomes something people stop opening.
 */
export function upcomingDeadlines(items: PlanItem[], today: string): PlanItem[] {
  return items
    .filter((item) => item.kind === "deadline" && isDayKey(item.dueDate))
    .sort((a, b) => (a.dueDate! < b.dueDate! ? -1 : a.dueDate! > b.dueDate! ? 1 : 0))
    .filter((item) => daysBetween(today, item.dueDate!) >= -DEADLINE_GRACE_DAYS);
}

/**
 * How long a passed deadline keeps showing.
 *
 * It has to linger — a deadline that vanishes at midnight is useless to
 * someone opening the app the next morning — but not forever, or the list
 * becomes an archive of everything the student ever failed to do.
 */
export const DEADLINE_GRACE_DAYS = 7;

/**
 * Todos, ordered the way someone actually works through them.
 *
 * Unfinished before finished; among the unfinished, dated before undated and
 * soonest first. Finished items stay visible rather than disappearing, because
 * a list that empties itself gives no sense that anything was accomplished —
 * but they sink, so they never cost attention.
 */
export function orderTodos(items: PlanItem[]): PlanItem[] {
  return items
    .filter((item) => item.kind === "todo")
    .slice()
    .sort((a, b) => {
      const doneA = a.done === true;
      const doneB = b.done === true;
      if (doneA !== doneB) return doneA ? 1 : -1;

      const dueA = isDayKey(a.dueDate) ? a.dueDate : null;
      const dueB = isDayKey(b.dueDate) ? b.dueDate : null;
      if (dueA !== null && dueB !== null && dueA !== dueB) return dueA < dueB ? -1 : 1;
      if (dueA !== null && dueB === null) return -1;
      if (dueA === null && dueB !== null) return 1;

      return seconds(a) - seconds(b);
    });
}

/** Creation order, so an untouched list keeps the order things were typed. */
function seconds(item: PlanItem): number {
  const value = item.createdAt as unknown as { seconds?: number } | undefined;
  return typeof value?.seconds === "number" ? value.seconds : 0;
}

/** Classes for one weekday, earliest first. */
export function classesOn(items: PlanItem[], weekday: number): PlanItem[] {
  return items
    .filter((item) => item.kind === "class" && item.weekday === weekday)
    .slice()
    .sort((a, b) => (a.startMinute ?? 0) - (b.startMinute ?? 0));
}

/**
 * Classes that collide.
 *
 * Worth flagging rather than rejecting: a genuine clash is something the
 * student needs to resolve with their school, and refusing to save it would
 * just mean the timetable does not match reality. Returns the ids involved.
 */
export function overlappingClassIds(items: PlanItem[]): Set<string> {
  const clashing = new Set<string>();

  for (let weekday = 0; weekday < 7; weekday += 1) {
    const day = classesOn(items, weekday);
    for (let i = 0; i < day.length; i += 1) {
      for (let j = i + 1; j < day.length; j += 1) {
        const a = day[i];
        const b = day[j];
        const aEnd = a.endMinute ?? a.startMinute ?? 0;
        const bStart = b.startMinute ?? 0;
        // Sorted by start, so b starts no earlier than a. Touching is fine:
        // a class ending at 10:00 does not clash with one starting at 10:00.
        if (bStart < aEnd) {
          clashing.add(a.id);
          clashing.add(b.id);
        }
      }
    }
  }

  return clashing;
}

/**
 * The next deadline worth planning against, or null.
 *
 * This is what lets the dashboard answer "will I be ready?" with a real date
 * instead of an arbitrary rolling window. Already-passed deadlines are no use
 * as a horizon — you cannot prepare for them — so only future ones count.
 */
export function nextDeadline(items: PlanItem[], today: string): PlanItem | null {
  const future = items
    .filter((item) => item.kind === "deadline" && isDayKey(item.dueDate))
    .filter((item) => daysBetween(today, item.dueDate!) >= 0)
    .sort((a, b) => (a.dueDate! < b.dueDate! ? -1 : 1));
  return future[0] ?? null;
}

/** Whether a title is worth saving. Blank titles produce unreadable rows. */
export function isUsableTitle(title: string): boolean {
  const trimmed = title.trim();
  return trimmed.length > 0 && trimmed.length <= MAX_TITLE_CHARS;
}
