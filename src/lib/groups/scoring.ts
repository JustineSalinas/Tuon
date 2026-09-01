/**
 * Standings inside a study group.
 *
 * This reverses an earlier decision in this codebase, which said a group
 * should have no leaderboard at all. That reasoning still holds for the thing
 * it was aimed at — ranking people by HOURS, which rewards whoever leaves a
 * timer running and turns a review batch into a contest about endurance. A
 * leaderboard was asked for anyway, so the question became what to rank on.
 *
 * XP is earned from RECALL, not from time. Every point traces back to a card
 * successfully remembered on a schedule, so the only way to climb is to
 * actually learn something. You cannot farm it by sitting with the app open,
 * and cramming the same card twenty times in one evening earns almost nothing
 * because SM-2 will not let the same card count again until it comes back due.
 *
 * HONEST LIMITATION: these numbers are computed on the member's own device
 * from their own review logs, and published to the group as a summary. A
 * determined member could write whatever they liked. Verifying server-side
 * would mean reading every member's private review history, which is a far
 * worse trade in a feature whose whole premise is a small invite-only group of
 * people who already know each other. The rules cap the numbers so nothing
 * absurd can appear; beyond that this rests on the same social trust as the
 * group itself.
 *
 * Pure. No React, no Firestore.
 */

import { AT_RISK_EASE } from "@/lib/stats/retention";
import { DEFAULT_EASE_FACTOR } from "@/lib/srs/sm2";

/** The parts of a review log scoring needs. */
export interface ScorableLog {
  easeFactor?: number;
  intervalDays?: number;
  repetitions?: number;
}

export interface GroupScore {
  /** Cards recalled successfully, summed. The bulk of the number. */
  recalls: number;
  /** Cards scheduled a month or more out and not shaky. */
  mastered: number;
  /** Cards touched at all. Context, not points. */
  studied: number;
  xp: number;
}

/**
 * What a mastered card is worth relative to a single recall.
 *
 * High enough that seeing a card through to the point where it holds for a
 * month beats grinding easy cards, which is the behaviour worth rewarding —
 * and the one a raw review count would punish.
 */
export const MASTERED_XP = 10;

/** Ceiling per member, mirrored in firestore.rules. */
export const MAX_XP = 1_000_000;

export function buildScore(logs: ScorableLog[]): GroupScore {
  let recalls = 0;
  let mastered = 0;

  for (const log of logs) {
    // Repetitions is SM-2's count of consecutive successful recalls, so it is
    // already a record of remembering rather than of showing up.
    recalls += Math.max(0, Math.floor(log.repetitions ?? 0));

    const ease = log.easeFactor ?? DEFAULT_EASE_FACTOR;
    if (ease >= AT_RISK_EASE && (log.intervalDays ?? 0) >= 30) mastered += 1;
  }

  return {
    recalls,
    mastered,
    studied: logs.length,
    xp: Math.min(MAX_XP, recalls + mastered * MASTERED_XP),
  };
}

export interface RankedMember extends GroupScore {
  id: string;
  displayName: string;
  photoURL?: string | null;
  /** 1-based. Members level on XP share a rank, as they should. */
  rank: number;
}

export interface ScoreRow {
  id: string;
  displayName: string;
  photoURL?: string | null;
  xp?: number;
  recalls?: number;
  mastered?: number;
  studied?: number;
}

/**
 * Orders the group, highest first.
 *
 * Ties share a rank rather than being broken arbitrarily. Two people on the
 * same XP are level, and inventing a winner between them by name or by join
 * date is a lie the table would tell every time it rendered.
 */
export function rankMembers(rows: ScoreRow[]): RankedMember[] {
  const scored = rows
    .map((row) => ({
      id: row.id,
      displayName: row.displayName,
      photoURL: row.photoURL ?? null,
      xp: Math.max(0, Math.floor(row.xp ?? 0)),
      recalls: Math.max(0, Math.floor(row.recalls ?? 0)),
      mastered: Math.max(0, Math.floor(row.mastered ?? 0)),
      studied: Math.max(0, Math.floor(row.studied ?? 0)),
    }))
    .sort((a, b) => b.xp - a.xp || a.displayName.localeCompare(b.displayName));

  let rank = 0;
  let lastXp: number | null = null;
  return scored.map((row, index) => {
    if (lastXp === null || row.xp !== lastXp) {
      rank = index + 1;
      lastXp = row.xp;
    }
    return { ...row, rank };
  });
}

/**
 * Whether it is worth publishing an update.
 *
 * Every member's page open would otherwise write to the group, which is a
 * write per member per visit for a number that mostly has not moved.
 */
export function isWorthPublishing(next: GroupScore, previous?: ScoreRow | null): boolean {
  if (!previous) return next.xp > 0;
  return next.xp !== (previous.xp ?? 0) || next.mastered !== (previous.mastered ?? 0);
}
