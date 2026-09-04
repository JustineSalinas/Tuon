"use client";

/**
 * Assembles the study state Tala is given, from data the app already has.
 *
 * Every number here is computed by the same pure module the screen showing it
 * uses — `buildReadiness` for readiness, `buildPlan` for the plan,
 * `buildStreaks` for the run of days. That is the point: if Tala derived her
 * own version of "weakest subject" she would eventually disagree with the
 * dashboard, and a companion that contradicts the app it lives in is worse
 * than one that says nothing.
 *
 * It costs no extra reads. Every subscription below is one the shell already
 * holds open, so the hook is arithmetic over data in memory.
 */

import { useMemo } from "react";

import { useAuth } from "@/components/providers/auth-provider";
import {
  useNotes,
  usePlanItems,
  useReviewLogs,
  useStudySessions,
  useStudySets,
} from "@/lib/hooks/use-firestore";
import { useNow } from "@/lib/hooks/use-now";
import { usePreferences } from "@/lib/hooks/use-preferences";
import { dayKey } from "@/lib/hooks/use-review-cards";
import { nextDeadline } from "@/lib/organiser/plan-items";
import { minutesByDay, sessionsSince, totalMinutes } from "@/lib/organiser/sessions";
import { DEFAULT_EASE_FACTOR, daysUntil, parseExamDate } from "@/lib/srs/sm2";
import { buildStreaks, shiftDays } from "@/lib/stats/heatmap";
import { buildPlan } from "@/lib/stats/plan";
import { buildReadiness } from "@/lib/stats/readiness";
import { AT_RISK_EASE } from "@/lib/stats/retention";
import type { CompanionSnapshot } from "@/lib/companion/snapshot";

export function useStudySnapshot(): CompanionSnapshot {
  const { user, profile } = useAuth();
  const { data: sets } = useStudySets(user?.uid);
  const { data: notes } = useNotes(user?.uid);
  const { logs } = useReviewLogs(user?.uid);
  const { items: planItems } = usePlanItems(user?.uid);
  const { sessions } = useStudySessions(user?.uid);
  const { dailyCardGoal, timeZone } = usePreferences();
  // Five minutes rather than the dashboard's one: nothing here is a countdown,
  // and re-deriving the whole library every minute to serve a chat box is
  // work nobody asked for.
  const now = useNow(300_000);

  const setStats = useMemo(() => {
    const byStudySet = new Map<
      string,
      { due: number; reviewed: number; shaky: number }
    >();

    for (const log of logs) {
      const entry = byStudySet.get(log.studySetId) ?? { due: 0, reviewed: 0, shaky: 0 };
      entry.reviewed += 1;
      if ((log.nextReviewAt?.toDate?.().getTime() ?? 0) <= now) entry.due += 1;
      if ((log.easeFactor ?? DEFAULT_EASE_FACTOR) < AT_RISK_EASE) entry.shaky += 1;
      byStudySet.set(log.studySetId, entry);
    }

    return sets.map((set) => {
      const entry = byStudySet.get(set.id) ?? { due: 0, reviewed: 0, shaky: 0 };
      return {
        id: set.id,
        title: set.title,
        courseTag: set.courseTag,
        due: entry.due,
        fresh: Math.max(0, (set.flashcardCount ?? 0) - entry.reviewed),
        shaky: entry.shaky,
      };
    });
  }, [sets, logs, now]);

  const deadline = useMemo(() => {
    const item = nextDeadline(planItems, dayKey(new Date(now), timeZone));
    if (!item?.dueDate) return null;
    const [year, month, day] = item.dueDate.split("-").map(Number);
    return { date: new Date(year, month - 1, day, 12), label: item.title };
  }, [planItems, now, timeZone]);

  const readiness = useMemo(
    () =>
      buildReadiness(
        sets,
        logs,
        parseExamDate(profile?.examDate),
        new Date(now),
        deadline,
      ),
    [sets, logs, profile?.examDate, now, deadline],
  );

  const plan = useMemo(() => {
    const noteIdsWithSets = new Set(
      sets.map((set) => set.noteId).filter((id): id is string => Boolean(id)),
    );
    return buildPlan(
      setStats,
      notes.map((note) => ({
        id: note.id,
        title: note.title,
        hasSet: noteIdsWithSets.has(note.id),
      })),
      readiness.bySubject.map((s) => s.subject),
      dailyCardGoal,
    );
  }, [setStats, sets, notes, readiness, dailyCardGoal]);

  return useMemo(() => {
    const today = dayKey(new Date(now), timeZone);
    const streaks = buildStreaks(minutesByDay(sessions), today);
    const week = sessionsSince(sessions, shiftDays(today, -6));

    const due = setStats.reduce((sum, s) => sum + s.due, 0);
    const fresh = setStats.reduce((sum, s) => sum + s.fresh, 0);
    const shaky = setStats.reduce((sum, s) => sum + s.shaky, 0);

    // Days to the horizon only when the horizon is a real date somebody chose.
    // A rolling window is an arbitrary month, and telling a model "30 days"
    // about it invites an answer that treats it as a deadline.
    const horizonDays =
      readiness.source === "rolling" ? null : daysUntil(readiness.horizon);

    return {
      due,
      fresh,
      shaky,
      totalCards: sets.reduce((sum, set) => sum + (set.flashcardCount ?? 0), 0),
      readiness: readiness.share === null ? null : Math.round(readiness.share * 100),
      horizon: readiness.source,
      horizonDays,
      horizonLabel: readiness.horizonLabel,
      subjects: readiness.bySubject.map((s) => ({
        subject: s.subject,
        ready: Math.round(s.share * 100),
        atRisk: s.atRisk,
        notStarted: s.notStarted,
      })),
      plan: plan.steps.map((step) => ({
        kind: step.kind,
        title: step.title,
        subject: step.subject,
        cards: step.cards,
      })),
      dailyGoal: dailyCardGoal,
      streak: streaks.current,
      longestStreak: streaks.longest,
      minutesThisWeek: totalMinutes(week),
    };
  }, [setStats, sets, readiness, plan, dailyCardGoal, sessions, now, timeZone]);
}
