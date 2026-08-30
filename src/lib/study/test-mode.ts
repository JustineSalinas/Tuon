/**
 * Test mode: a real exam rehearsal, not a second quiz.
 *
 * The existing quiz is five fixed multiple-choice questions in the same order
 * forever. It is fine for checking a fresh set and useless as practice for a
 * board exam, which is timed, mixed, and does not politely ask you the things
 * you already know.
 *
 * Three differences, and each one is the point:
 *
 * 1. IT PICKS THE WEAKEST MATERIAL. Given the choice, students revise what
 *    they already know — it feels productive and costs nothing. The scheduler
 *    already knows which cards are shaky, overdue, or never seen, so the test
 *    is drawn from those first.
 * 2. IT MIXES FORMATS. Recognising an answer among four is a different skill
 *    from producing it, and an exam demands the second. Cards whose answers
 *    are short enough get typed; the rest use their multiple-choice question.
 * 3. IT IS TIMED. Working out an answer with unlimited time is not the thing
 *    being rehearsed.
 *
 * Pure. No React, no Firestore, no clock of its own.
 */

import { isTypeable } from "@/lib/study/answer-match";

/** The scheduling state of a card, as far as this module cares. */
export interface TestableLog {
  easeFactor?: number;
  intervalDays?: number;
  nextReviewAt?: { toDate: () => Date } | null;
}

export interface TestableCard {
  id: string;
  front: string;
  back: string;
}

export interface TestableQuestion {
  id: string;
  question: string;
  choices: string[];
  correctIndex: number;
  /** Which card this question tests. Null on sets generated before the link. */
  flashcardId?: string | null;
}

export type TestItemKind = "typed" | "mcq" | "recall";

export interface TestItem {
  kind: TestItemKind;
  flashcardId: string;
  front: string;
  back: string;
  /** mcq only. */
  choices?: string[];
  correctIndex?: number;
  question?: string;
}

/** Seconds allowed per item. Enough to answer, not enough to reconstruct. */
export const SECONDS_PER_ITEM = 45;

/** Default length. Long enough to be a test, short enough to sit in one go. */
export const DEFAULT_TEST_LENGTH = 10;

/** Below this ease, SM-2 has recorded repeated failures. */
const AT_RISK_EASE = 2.0;

/**
 * How badly a card needs testing. Higher is more urgent.
 *
 * The order matters more than the numbers. A card you keep failing is the
 * single most valuable thing to put in front of someone; one that is overdue
 * is next, because it is actively being forgotten; a card never seen is
 * unknown rather than weak; and a card comfortably scheduled is the one a
 * student would have picked themselves, so it goes last.
 */
export function weaknessOf(log: TestableLog | null | undefined, now: Date): number {
  if (!log) return 2; // never reviewed

  const ease = log.easeFactor ?? 2.5;
  if (ease < AT_RISK_EASE) return 4;

  const due = log.nextReviewAt?.toDate?.();
  if (due && due.getTime() <= now.getTime()) return 3;

  // Among healthy cards, the shorter the interval the less settled it is.
  const days = log.intervalDays ?? 0;
  return days >= 30 ? 0 : 1;
}

/**
 * A small deterministic shuffle.
 *
 * Not `Math.random`: two attempts should differ, but a given seed must always
 * produce the same test so this can be tested at all, and so a student who
 * reloads mid-test does not get a different one.
 */
function seededOrder(count: number, seed: number): number[] {
  const indices = Array.from({ length: count }, (_, i) => i);
  let state = (seed | 0) || 1;
  for (let i = count - 1; i > 0; i -= 1) {
    // xorshift: cheap, no dependency, and good enough to break ties.
    state ^= state << 13;
    state ^= state >>> 17;
    state ^= state << 5;
    const j = Math.abs(state) % (i + 1);
    [indices[i], indices[j]] = [indices[j], indices[i]];
  }
  return indices;
}

export interface BuildTestInput {
  cards: TestableCard[];
  questions: TestableQuestion[];
  logs: Map<string, TestableLog>;
  length?: number;
  now?: Date;
  seed?: number;
}

/**
 * Assembles a test.
 *
 * Cards are ranked by weakness, ties broken by the seed so two attempts on an
 * equally-weak set are not identical. Format is chosen per card from what that
 * card supports, alternating where a card supports both so the test does not
 * come out as ten typed answers in a row.
 */
export function buildTest({
  cards,
  questions,
  logs,
  length = DEFAULT_TEST_LENGTH,
  now = new Date(),
  seed = 1,
}: BuildTestInput): TestItem[] {
  if (cards.length === 0) return [];

  const questionFor = new Map<string, TestableQuestion>();
  for (const question of questions) {
    if (question.flashcardId && !questionFor.has(question.flashcardId)) {
      questionFor.set(question.flashcardId, question);
    }
  }

  const shuffled = seededOrder(cards.length, seed);
  const ranked = cards
    .map((card, index) => ({
      card,
      weakness: weaknessOf(logs.get(card.id), now),
      tiebreak: shuffled[index],
    }))
    .sort((a, b) => b.weakness - a.weakness || a.tiebreak - b.tiebreak)
    .slice(0, Math.max(0, length));

  let typedTurn = seed % 2 === 0;

  return ranked.map(({ card }) => {
    const question = questionFor.get(card.id);
    const canType = isTypeable(card.back);

    // Alternate only where there is a real choice; otherwise take whatever the
    // card supports. A card with neither still gets asked — as a plain reveal
    // the student grades — because leaving it out would quietly exclude the
    // long-answer material from every test.
    let kind: TestItemKind;
    if (canType && question) {
      kind = typedTurn ? "typed" : "mcq";
      typedTurn = !typedTurn;
    } else if (canType) {
      kind = "typed";
    } else if (question) {
      kind = "mcq";
    } else {
      kind = "recall";
    }

    return {
      kind,
      flashcardId: card.id,
      front: card.front,
      back: card.back,
      ...(kind === "mcq" && question
        ? {
            question: question.question,
            choices: question.choices,
            correctIndex: question.correctIndex,
          }
        : {}),
    };
  });
}

export function testDurationMs(itemCount: number): number {
  return itemCount * SECONDS_PER_ITEM * 1000;
}

/**
 * Time left, from the start instant.
 *
 * Same rule as the Pomodoro timer: never accumulate from ticks. A test whose
 * clock pauses when the tab loses focus is not a test.
 */
export function remainingMs(startedAt: number, itemCount: number, now: number): number {
  return Math.max(0, testDurationMs(itemCount) - (now - startedAt));
}

export function formatClock(ms: number): string {
  const totalSeconds = Math.ceil(Math.max(0, ms) / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

/**
 * The verdict.
 *
 * Unanswered items count as wrong. Running out of time on a question you had
 * not reached is, for an exam, exactly the same outcome as getting it wrong,
 * and scoring only what was attempted would flatter a student who ran out of
 * time — which is the specific weakness a timed test exists to expose.
 */
export function scoreTest(results: { correct: boolean }[], total: number): {
  correct: number;
  total: number;
  percent: number;
} {
  const correct = results.filter((r) => r.correct).length;
  return {
    correct,
    total,
    percent: total === 0 ? 0 : Math.round((correct / total) * 100),
  };
}
