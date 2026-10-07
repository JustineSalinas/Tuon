"use client";

import { useAuth } from "@/components/providers/auth-provider";
import { DEFAULT_TIME_ZONE, detectTimeZone, normaliseTimeZone } from "@/lib/time-zone";
import { clampGoal, readTypedRecall } from "@/lib/preferences";
import {
  readPomodoroSettings,
  type PomodoroSettings,
} from "@/lib/organiser/pomodoro";

export {
  DEFAULT_DAILY_CARD_GOAL,
  MAX_DAILY_CARD_GOAL,
  MIN_DAILY_CARD_GOAL,
  clampGoal,
  DEFAULT_TYPED_RECALL,
} from "@/lib/preferences";

export interface Preferences {
  timeZone: string;
  dailyCardGoal: number;
  typedRecall: boolean;
  pomodoro: PomodoroSettings;
}

/**
 * The student's scheduling preferences, already coerced into usable values.
 *
 * Reads through the profile rather than local storage so the schedule is the
 * same on their phone and the computer lab machine — a review queue that
 * disagrees with itself across devices is worse than no setting at all.
 */
export function usePreferences(): Preferences {
  const { profile } = useAuth();

  return {
    // Manila only as a last resort, when the browser genuinely will not say.
    // Before the international pivot every account was reasonably assumed to
    // be there; now an unset timeZone is just as likely to belong to a
    // student somewhere else, and silently scheduling their "due today" on
    // Manila's clock is exactly the wrong-answer-that-looks-right failure
    // this module's own docstring warns about.
    timeZone: normaliseTimeZone(
      profile?.timeZone ?? detectTimeZone() ?? DEFAULT_TIME_ZONE,
    ),
    dailyCardGoal: clampGoal(profile?.dailyCardGoal),
    typedRecall: readTypedRecall(profile?.typedRecall),
    pomodoro: readPomodoroSettings(profile ?? {}),
  };
}
