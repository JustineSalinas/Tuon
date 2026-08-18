/**
 * Time zone handling for review scheduling.
 *
 * This is not cosmetic. Every "due today" decision is a comparison against a
 * local calendar day, so a wrong zone silently shifts a student's whole
 * schedule — and they have no way to tell, because the clock on screen still
 * looks right. That exact failure already cost a day of debugging on this
 * project when a machine sat in UTC+02 while displaying Manila time.
 *
 * The default is Manila because that is who this is for. It is a *setting*
 * rather than a hardcode because OFW families, exchange students, and anyone
 * reviewing on a trip are real, and because a silent wrong answer is the worst
 * possible outcome here.
 */

export const DEFAULT_TIME_ZONE = "Asia/Manila";

/**
 * Offered zones. Deliberately short: a 400-entry IANA list is a worse
 * experience than five relevant options plus whatever the browser reports.
 * Manila first, then where Filipino students and OFW families actually are.
 */
export const TIME_ZONES: { value: string; label: string }[] = [
  { value: "Asia/Manila", label: "Philippines (Manila)" },
  { value: "Asia/Singapore", label: "Singapore · Malaysia" },
  { value: "Asia/Hong_Kong", label: "Hong Kong" },
  { value: "Asia/Tokyo", label: "Japan" },
  { value: "Asia/Seoul", label: "South Korea" },
  { value: "Asia/Dubai", label: "UAE · Gulf" },
  { value: "Australia/Sydney", label: "Australia (Sydney)" },
  { value: "Europe/London", label: "United Kingdom" },
  { value: "America/Los_Angeles", label: "US Pacific" },
  { value: "America/New_York", label: "US Eastern" },
  { value: "UTC", label: "UTC" },
];

/** What the browser thinks it is, or null if it will not say. */
export function detectTimeZone(): string | null {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || null;
  } catch {
    return null;
  }
}

/**
 * Coerces a stored value into a zone this runtime can actually format with.
 *
 * A bad value would otherwise throw inside `Intl.DateTimeFormat` on every
 * render of the calendar — one corrupt profile field taking down a screen.
 */
export function normaliseTimeZone(value: unknown): string {
  if (typeof value !== "string" || !value) return DEFAULT_TIME_ZONE;
  try {
    new Intl.DateTimeFormat("en-CA", { timeZone: value }).format(new Date());
    return value;
  } catch {
    return DEFAULT_TIME_ZONE;
  }
}

/** Current offset as a display string, e.g. "UTC+8". */
export function offsetLabel(timeZone: string): string {
  try {
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone,
      timeZoneName: "shortOffset",
    }).formatToParts(new Date());
    return parts.find((p) => p.type === "timeZoneName")?.value ?? "";
  } catch {
    return "";
  }
}

/** Local YYYY-MM-DD key for a date in the given zone. */
export function dayKeyIn(date: Date, timeZone: string): string {
  return new Intl.DateTimeFormat("en-CA", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    timeZone,
  }).format(date);
}
