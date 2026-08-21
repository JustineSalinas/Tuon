/**
 * Daily review reminder, entirely on the device.
 *
 * Spaced repetition only works if people come back, so a reminder is the
 * highest-leverage retention feature here. The obvious build — a server that
 * emails or pushes on a schedule — needs infrastructure that does not exist
 * yet, and would put every student's study time in a database for no gain.
 *
 * This does it locally instead: the browser's Notification API, fired by a
 * check that runs while the app is open, with the last-fired date in
 * localStorage so it shows once a day. That is a real constraint, stated
 * plainly in the UI: it can only fire on a day the student opens the app.
 * For an installed PWA opened most days that is most of the value, and it
 * ships now rather than after a mail provider is chosen.
 *
 * NO STREAKS. Streaks punish the student who misses a day during exams —
 * exactly when they are studying hardest and least able to absorb a scolding.
 * The reminder counts reviews done, never days unbroken, and never says
 * anything about a run being lost.
 */

const ENABLED_KEY = "tuon.reminder.enabled";
const TIME_KEY = "tuon.reminder.time";
const LAST_SHOWN_KEY = "tuon.reminder.lastShown";

/** Default nudge time — after class, before the evening disappears. */
export const DEFAULT_REMINDER_TIME = "19:00";

export type ReminderPermission = "unsupported" | "default" | "granted" | "denied";

export function reminderPermission(): ReminderPermission {
  if (typeof window === "undefined" || !("Notification" in window)) {
    return "unsupported";
  }
  return Notification.permission as ReminderPermission;
}

/** Reading localStorage throws in some privacy modes; never let that break a page. */
function read(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function write(key: string, value: string) {
  try {
    localStorage.setItem(key, value);
  } catch {
    // Nothing to do — the reminder simply will not persist.
  }
}

export function reminderEnabled(): boolean {
  return read(ENABLED_KEY) === "true";
}

export function reminderTime(): string {
  return read(TIME_KEY) ?? DEFAULT_REMINDER_TIME;
}

export function setReminderEnabled(enabled: boolean) {
  write(ENABLED_KEY, String(enabled));
}

export function setReminderTime(time: string) {
  write(TIME_KEY, time);
}

/** Local YYYY-MM-DD, so "once today" means the student's today. */
function todayKey(now: Date): string {
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/**
 * Whether the reminder is due right now.
 *
 * Exported and pure so it can be tested without a browser, a clock, or a
 * granted permission.
 */
export function reminderIsDue({
  now,
  time,
  lastShown,
  enabled,
  dueCount,
}: {
  now: Date;
  time: string;
  lastShown: string | null;
  enabled: boolean;
  dueCount: number;
}): boolean {
  if (!enabled) return false;
  // Nothing to review is not a reason to interrupt someone.
  if (dueCount <= 0) return false;
  if (lastShown === todayKey(now)) return false;

  const [h, m] = time.split(":").map(Number);
  if (!Number.isFinite(h) || !Number.isFinite(m)) return false;

  const minutesNow = now.getHours() * 60 + now.getMinutes();
  return minutesNow >= h * 60 + m;
}

/**
 * The reminder text.
 *
 * Counts cards, never days. "You have 12 cards due" is information; "Don't
 * break your 6-day streak!" is a threat, and the student most likely to see it
 * is the one who was busy revising for something else.
 */
export function reminderMessage(dueCount: number): string {
  if (dueCount === 1) return "1 card is ready for review.";
  return `${dueCount} cards are ready for review.`;
}

export function markReminderShown(now: Date) {
  write(LAST_SHOWN_KEY, todayKey(now));
}

export function lastReminderShown(): string | null {
  return read(LAST_SHOWN_KEY);
}
