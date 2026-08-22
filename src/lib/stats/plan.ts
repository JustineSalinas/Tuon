/**
 * Today's plan — one ordered list instead of a menu of decks.
 *
 * Left to choose, students pick the deck they already know. Every rival
 * dashboard hands them that choice: Anki's deck table, Quizlet's grid. This
 * makes the choice for them, weakest subject first, and stops at their daily
 * goal so a backlog never presents itself as a wall.
 *
 * Ordering is the entire feature. It is deliberately NOT "most due" or "most
 * recent" — it is "the thing you are least ready for", which is what a tutor
 * would say and what neither of those sorts can express.
 */

export type PlanStepKind = "review" | "generate";

export interface PlanStep {
  kind: PlanStepKind;
  /** Study set id for a review step, note id for a generate step. */
  id: string;
  title: string;
  subject: string | null;
  /** Cards this step covers. Zero for a generate step. */
  cards: number;
  href: string;
  /** Why this step is here, in three or four words. */
  reason: string;
}

export interface StudyPlan {
  steps: PlanStep[];
  /** Cards the plan actually asks for. */
  totalCards: number;
  /** Pending cards the goal did not have room for. Never presented as failure. */
  heldBack: number;
  goal: number;
}

export interface PlanSetInput {
  id: string;
  title: string;
  courseTag: string | null;
  due: number;
  fresh: number;
}

export interface PlanNoteInput {
  id: string;
  title: string;
  /** Whether a study set was ever generated from this note. */
  hasSet: boolean;
}

/** Steps beyond this stop reading as a plan and start reading as a list. */
const MAX_STEPS = 4;

/**
 * Smallest a step is allowed to be when the anti-starvation cap splits the
 * day. Below this the split stops helping: a five-card goal chopped into three
 * and two is two trips for no benefit.
 */
const MIN_STEP_CARDS = 5;

export function buildPlan(
  sets: PlanSetInput[],
  notes: PlanNoteInput[],
  /** Subject names, weakest first — straight from the readiness report. */
  subjectOrder: string[],
  goal: number,
  maxSteps: number = MAX_STEPS,
): StudyPlan {
  const rank = new Map(subjectOrder.map((subject, i) => [subject, i]));
  const pendingOf = (s: PlanSetInput) => Math.max(0, s.due) + Math.max(0, s.fresh);

  const withWork = sets.filter((s) => pendingOf(s) > 0);
  const totalPending = withWork.reduce((sum, s) => sum + pendingOf(s), 0);

  const ordered = [...withWork].sort((a, b) => {
    // Untagged sets sort last: they cannot be ranked by readiness, and putting
    // them first would claim a weakness the data does not support.
    const ra = rank.get(a.courseTag?.trim() ?? "") ?? Number.MAX_SAFE_INTEGER;
    const rb = rank.get(b.courseTag?.trim() ?? "") ?? Number.MAX_SAFE_INTEGER;
    if (ra !== rb) return ra - rb;
    return pendingOf(b) - pendingOf(a);
  });

  const weakest = subjectOrder[0] ?? null;
  const steps: PlanStep[] = [];
  let budget = Math.max(0, goal);

  /**
   * No single step may eat more than half the day when another subject is also
   * waiting.
   *
   * Without this, weakest-first starves everything else: the weakest subject
   * usually has the most pending work too, so it swallows the whole goal, and
   * the second subject slides to tomorrow — where the same thing happens
   * again. The weakest still goes first and still gets the larger share; it
   * just cannot take the whole day.
   */
  const subjectsWaiting = new Set(
    withWork.map((s) => s.courseTag?.trim()).filter(Boolean),
  ).size;
  const perStepCap =
    subjectsWaiting > 1
      ? Math.max(MIN_STEP_CARDS, Math.ceil(Math.max(0, goal) / 2))
      : Infinity;

  for (const set of ordered) {
    if (steps.length >= maxSteps || budget <= 0) break;
    const take = Math.min(pendingOf(set), budget, perStepCap);
    if (take <= 0) continue;
    const subject = set.courseTag?.trim() || null;
    steps.push({
      kind: "review",
      id: set.id,
      title: set.title,
      subject,
      cards: take,
      href: `/app/sets/${set.id}/review`,
      reason:
        subject && subject === weakest
          ? "Weakest subject"
          : set.due > 0
            ? "Due today"
            : "Never seen",
    });
    budget -= take;
  }

  // The note-to-card gap. Tuón is the only one of these apps where notes are
  // first-class parents of cards, so "you wrote this and never turned it into
  // anything" is a prompt no rival can produce.
  if (steps.length < maxSteps) {
    const orphan = notes.find((n) => !n.hasSet);
    if (orphan) {
      steps.push({
        kind: "generate",
        id: orphan.id,
        title: orphan.title,
        subject: null,
        cards: 0,
        href: `/app/notes/${orphan.id}`,
        reason: "No cards yet",
      });
    }
  }

  const totalCards = steps.reduce((sum, s) => sum + s.cards, 0);

  return {
    steps,
    totalCards,
    heldBack: Math.max(0, totalPending - totalCards),
    goal: Math.max(0, goal),
  };
}
