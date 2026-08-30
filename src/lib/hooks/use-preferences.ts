"use client";

import { useAuth } from "@/components/providers/auth-provider";
import { DEFAULT_TIME_ZONE, normaliseTimeZone } from "@/lib/time-zone";
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
    timeZone: normaliseTimeZone(profile?.timeZone ?? DEFAULT_TIME_ZONE),
    dailyCardGoal: clampGoal(profile?.dailyCardGoal),
    typedRecall: readTypedRecall(profile?.typedRecall),
    pomodoro: readPomodoroSettings(profile ?? {}),
  };
}
