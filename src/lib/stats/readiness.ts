import {
  DEFAULT_EASE_FACTOR,
  addDays,
  scheduleNextReview,
} from "@/lib/srs/sm2";
import { AT_RISK_EASE } from "@/lib/stats/retention";

/**
 * "Will I be ready?" — the question a queue cannot answer.
 *
 * Every competing dashboard answers "what is due?": Anki lists decks with
 * New/Learning/Due counts, Quizlet shows a grid of sets, Duolingo shows a
 * streak. All of them are queues or scoreboards, and none can say whether you
 * are on course, because none of them knows about a deadline.
 *
 * Tuón does — board and licensure reviewers sit on a fixed date, and everyone
 * else gets a rolling horizon. Combined with the SM-2 state already stored per
 * card, that is enough to project each one forward and ask whether it will
 * still be in memory on the day.
 *
 * Deliberately computed from REVIEW LOGS AND SETS, not from loaded flashcards.
 * The dashboard already has both, so readiness costs no extra reads on the most
 * visited screen in the app; pulling every flashcard to answer this would add a
 * collection-group read to every dashboard load. Subject comes from the set for
 * the same reason, which is also where students actually tag it.
 *
 * HONESTY: this is a projection from the student's OWN schedule, assuming they
 * keep up and keep answering "Good". It is not a prediction of their score and
 * must never be presented as one — the same rule the landing page's forgetting
 * curve is held to. The UI says so; keep it that way.
 */

/** How far ahead to look when there is no exam date. */
export const DEFAULT_HORIZON_DAYS = 30;

/** Runaway guard for the projection walk. No real card needs this many. */
const MAX_PROJECTED_REVIEWS = 60;

const DAY_MS = 24 * 60 * 60 * 1000;

export type ReadinessBucket = "onTrack" | "atRisk" | "notStarted";

/** The parts of a ReviewLog this module needs. */
export interface ProjectableLog {
  studySetId: string;
  easeFactor: number;
  intervalDays: number;
  repetitions?: number;
  nextReviewAt?: { toDate: () => Date } | null;
  lastReviewedAt?: { toDate: () => Date } | null;
}

/** The parts of a StudySet this module needs. */
export interface ProjectableSet {
  id: string;
  courseTag?: string | null;
  flashcardCount?: number;
}

export interface SubjectReadiness {
  subject: string;
  total: number;
  onTrack: number;
  atRisk: number;
  notStarted: number;
  /** 0-1 share of this subject's cards on track. The sort key. */
  share: number;
}

export interface ReadinessReport {
  horizon: Date;
  /** True when the horizon is a real exam date rather than the rolling window. */
  hasExam: boolean;
  total: number;
  onTrack: number;
  atRisk: number;
  notStarted: number;
  /** Everything not on track — the number worth acting on. */
  needsWork: number;
  /** 0-1. Null when there are no cards at all, rather than a misleading zero. */
  share: number | null;
  /** Weakest subject first, because that is the one about to sink you. */
  bySubject: SubjectReadiness[];
}

/**
 * Where one reviewed card will stand at the horizon.
 *
 * Walks the schedule forward using the REAL scheduler rather than a copy of the
 * interval maths, so the projection cannot drift away from what the app
 * actually does on the next review.
 */
export function projectLog(
  log: ProjectableLog,
  horizon: Date,
  now: Date,
): "onTrack" | "atRisk" {
  const ease = log.easeFactor ?? DEFAULT_EASE_FACTOR;
  // A card SM-2 has marked as genuinely difficult is shaky whatever the
  // schedule says, so it counts as work to do rather than as ready.
  if (ease < AT_RISK_EASE) return "atRisk";

  let at = log.nextReviewAt?.toDate?.() ?? now;
  let state = {
    easeFactor: ease,
    intervalDays: log.intervalDays ?? 0,
    repetitions: log.repetitions ?? 0,
  };

  // The last review landing on or before the horizon, and the interval it
  // grants. If the next review is already past the horizon these stay at the
  // card's current values, which is the right answer: whether it holds then
  // depends on how long ago it was last seen.
  let lastBefore = log.lastReviewedAt?.toDate?.() ?? now;
  let intervalThen = state.intervalDays;

  for (let i = 0; i < MAX_PROJECTED_REVIEWS && at <= horizon; i++) {
    // Assumes they keep up and keep answering "Good" — stated in the UI.
    const next = scheduleNextReview(state, "good", at, horizon);
    lastBefore = at;
    intervalThen = next.intervalDays;
    state = {
      easeFactor: next.easeFactor,
      intervalDays: next.intervalDays,
      repetitions: next.repetitions,
    };
    at = next.nextReviewAt;
  }

  // Fresh at the horizon if the horizon still falls inside the interval the
  // most recent review granted. That is exactly what an SM-2 interval means:
  // how long the card is expected to hold.
  const daysSince = (horizon.getTime() - lastBefore.getTime()) / DAY_MS;
  return daysSince <= intervalThen ? "onTrack" : "atRisk";
}

/** Resolves the horizon: a real exam date, else a rolling window. */
export function resolveHorizon(
  examDate: Date | null | undefined,
  now: Date,
): { horizon: Date; hasExam: boolean } {
  if (examDate && examDate.getTime() > now.getTime()) {
    return { horizon: examDate, hasExam: true };
  }
  return { horizon: addDays(now, DEFAULT_HORIZON_DAYS), hasExam: false };
}

export function buildReadiness(
  sets: ProjectableSet[],
  logs: ProjectableLog[],
  examDate: Date | null | undefined,
  now: Date = new Date(),
): ReadinessReport {
  const { horizon, hasExam } = resolveHorizon(examDate, now);

  const blank = () => ({ total: 0, onTrack: 0, atRisk: 0, notStarted: 0 });
  const totals = blank();
  const bySet = new Map<string, ReturnType<typeof blank>>();
  for (const set of sets) bySet.set(set.id, blank());

  // Reviewed cards: project each one.
  for (const log of logs) {
    const row = bySet.get(log.studySetId);
    // A log whose set is gone cannot be attributed or acted on, and counting
    // it would make the totals disagree with what the student can see.
    if (!row) continue;
    const bucket = projectLog(log, horizon, now);
    row.total++;
    row[bucket]++;
    totals.total++;
    totals[bucket]++;
  }

  // Everything in a set that has no log yet has simply not been started.
  for (const set of sets) {
    const row = bySet.get(set.id);
    if (!row) continue;
    const notStarted = Math.max(0, (set.flashcardCount ?? 0) - row.total);
    row.total += notStarted;
    row.notStarted += notStarted;
    totals.total += notStarted;
    totals.notStarted += notStarted;
  }

  // Roll sets up into subjects.
  const subjects = new Map<string, ReturnType<typeof blank>>();
  for (const set of sets) {
    // Untagged sets still count in the totals; they just cannot be attributed.
    // An "Uncategorised" row would sort to the top of a weakest-first list and
    // read as a real subject the student should go and study.
    const subject = set.courseTag?.trim();
    const row = bySet.get(set.id);
    if (!subject || !row) continue;
    const acc = subjects.get(subject) ?? blank();
    acc.total += row.total;
    acc.onTrack += row.onTrack;
    acc.atRisk += row.atRisk;
    acc.notStarted += row.notStarted;
    subjects.set(subject, acc);
  }

  const bySubject: SubjectReadiness[] = [...subjects.entries()]
    .filter(([, row]) => row.total > 0)
    .map(([subject, row]) => ({
      subject,
      ...row,
      share: row.total ? row.onTrack / row.total : 0,
    }))
    // Weakest first, then largest — a 40%-ready subject with 200 cards is a
    // bigger problem than a 40%-ready subject with three.
    .sort((a, b) => a.share - b.share || b.total - a.total);

  return {
    horizon,
    hasExam,
    ...totals,
    needsWork: totals.atRisk + totals.notStarted,
    share: totals.total ? totals.onTrack / totals.total : null,
    bySubject,
  };
}
