/**
 * Study time, grouped for reading.
 *
 * The number a study log reports has exactly one job: to be believed. A
 * student who studied two hours offline and opens a blank week will decide the
 * log is broken and never look again — which is why sessions are editable and
 * can be added by hand, and why nothing here silently invents time.
 *
 * Pure. No React, no Firestore.
 */

import type { StudySession } from "@/lib/types";

/** A session longer than this is almost certainly a timer left running. */
export const MAX_SESSION_MINUTES = 12 * 60;

export function clampMinutes(value: unknown): number {
  if (typeof value !== "number" || !Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(MAX_SESSION_MINUTES, Math.round(value)));
}

/** "1h 25m", "45m", "0m". Never "85m" — nobody reads that as an hour and a bit. */
export function formatMinutes(minutes: number): string {
  const total = Math.max(0, Math.round(minutes));
  const hours = Math.floor(total / 60);
  const rest = total % 60;
  if (hours === 0) return `${rest}m`;
  if (rest === 0) return `${hours}h`;
  return `${hours}h ${rest}m`;
}

/** Totals per `YYYY-MM-DD`, for the week strip. */
export function minutesByDay(sessions: StudySession[]): Map<string, number> {
  const totals = new Map<string, number>();
  for (const session of sessions) {
    totals.set(session.day, (totals.get(session.day) ?? 0) + clampMinutes(session.minutes));
  }
  return totals;
}

export function totalMinutes(sessions: StudySession[]): number {
  return sessions.reduce((sum, session) => sum + clampMinutes(session.minutes), 0);
}

/** Totals per subject, largest first. Untagged time is kept, not dropped. */
export function minutesBySubject(
  sessions: StudySession[],
): { subject: string; minutes: number }[] {
  const totals = new Map<string, number>();
  for (const session of sessions) {
    const key = session.courseTag?.trim() || UNTAGGED;
    totals.set(key, (totals.get(key) ?? 0) + clampMinutes(session.minutes));
  }
  return [...totals.entries()]
    .map(([subject, minutes]) => ({ subject, minutes }))
    .sort((a, b) => b.minutes - a.minutes);
}

/**
 * A subject key for time that carries no tag.
 *
 * Shown rather than hidden: unattributed time is still time studied, and a
 * breakdown that quietly drops it stops adding up to the total beside it,
 * which is the fastest way to make a student stop believing either number.
 *
 * A sentinel, not a label. It is compared against, never printed — the words
 * come from the message catalogue.
 */
export const UNTAGGED = "\u0000untagged";

/**
 * Sessions on or after a day, for a breakdown over a window rather than a week.
 *
 * Day keys are `YYYY-MM-DD`, which sort correctly as plain strings, so this is
 * a string comparison and not a date one.
 */
export function sessionsSince(
  sessions: StudySession[],
  fromDay: string,
): StudySession[] {
  return sessions.filter((session) => (session.day ?? "") >= fromDay);
}

/**
 * The seven `YYYY-MM-DD` keys of the week containing `today`, Sunday first.
 *
 * Built by walking the day numbers rather than by adding milliseconds, so a
 * DST change cannot produce a duplicated or missing day. The Philippines has
 * no DST, but the app does not require a student to be there.
 */
export function weekDayKeys(today: string, offsetWeeks = 0): string[] {
  const [year, month, day] = today.split("-").map(Number);
  if (!year || !month || !day) return [];

  const base = new Date(year, month - 1, day + offsetWeeks * 7);
  const sunday = new Date(base.getFullYear(), base.getMonth(), base.getDate() - base.getDay());

  return Array.from({ length: 7 }, (_, i) => {
    const date = new Date(sunday.getFullYear(), sunday.getMonth(), sunday.getDate() + i);
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(
      date.getDate(),
    ).padStart(2, "0")}`;
  });
}

/**
 * Sessions whose day falls inside the given keys, newest first.
 *
 * Filtering on the stored `day` string rather than on `startedAt` is
 * deliberate: `day` is the calendar day in the student's own zone, already
 * resolved when the session was written, so a session at 11pm stays on the day
 * it felt like rather than jumping when read back through UTC.
 */
export function sessionsInWeek(sessions: StudySession[], days: string[]): StudySession[] {
  const wanted = new Set(days);
  return sessions
    .filter((session) => wanted.has(session.day))
    .slice()
    .sort((a, b) => (a.day === b.day ? startSeconds(b) - startSeconds(a) : a.day < b.day ? 1 : -1));
}

function startSeconds(session: StudySession): number {
  const value = session.startedAt as unknown as { seconds?: number } | undefined;
  return typeof value?.seconds === "number" ? value.seconds : 0;
}

// Where a session came from is shown as a word, so the words live in the
// message catalogue keyed by `StudySession["source"]`.
