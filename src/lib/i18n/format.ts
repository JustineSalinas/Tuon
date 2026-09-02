/**
 * The few places a pure module's answer has to become a sentence.
 *
 * Modules like `plan-items` and `mastery` deliberately return a key and a
 * number rather than prose, because they cannot know what language the
 * student reads. That leaves a small seam: somebody has to put the two back
 * together. Doing it inline at every call site means the same ternary written
 * four times and drifting three ways, so it is written once, here.
 *
 * Not a hook, and not React. These are plain functions taking the messages
 * they need, which keeps them usable from a render, a toast, or a test.
 */

import type { GroupResult } from "@/lib/groups/client";
import type { Messages } from "@/lib/i18n/en";
import { formatDayKey, type DueLabel } from "@/lib/organiser/plan-items";

/**
 * Why a group action failed, in the reader's language.
 *
 * Falls back to the server's own English for a code this catalogue has not
 * learned yet — a new failure should read as a sentence rather than as
 * `UNKNOWN_ACTION`, even before anyone translates it.
 */
export function renderGroupError(result: GroupResult, t: Messages): string {
  const code = result.errorCode;
  if (code && code in t.groups.error) {
    return t.groups.error[code as keyof typeof t.groups.error];
  }
  return result.error ?? t.groups.error.unknown;
}

/** "Today", "In 3 days", "30 Sep". */
export function renderDueDate(label: DueLabel, t: Messages): string {
  switch (label.kind) {
    case "today":
      return t.common.today;
    case "tomorrow":
      return t.common.tomorrow;
    case "yesterday":
      return t.common.yesterday;
    case "daysAgo":
      return t.common.daysAgo(label.days);
    case "inDays":
      return t.common.inDays(label.days);
    case "date":
      return formatDayKey(label.dayKey, t.common.dateLocale);
  }
}
