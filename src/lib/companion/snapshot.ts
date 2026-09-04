/**
 * What Tala is allowed to know about a student, and how it is written down.
 *
 * THE WHOLE POINT OF THIS FILE IS WHAT IT LEAVES OUT. A study companion is
 * only useful if it can see how the student is actually doing — a chatbot that
 * answers "what should I study tonight?" with a generic paragraph about spaced
 * repetition is worse than no chatbot, because it takes the one question the
 * app is uniquely able to answer and gives it a search-engine answer.
 *
 * But "see how they are doing" does not mean "read their notes". Everything
 * here is a COUNT or a NAME already on the student's own screen: how many
 * cards are due, which subject is weakest, what the plan says to do next, how
 * long until the exam. No note text, no flashcard fronts or backs, no email,
 * no school, no group. The model can say "Chemistry is your weakest subject
 * and 12 cards are due" without any of that material leaving the browser.
 *
 * Where the numbers come from is also deliberate. They are computed in the
 * BROWSER from data the dashboard has already loaded, and posted alongside the
 * question. The alternative — re-reading Firestore server-side with the Admin
 * SDK — would be more trustworthy and costs a second full read of the library
 * on every message, which is the most expensive query in the app. The trust
 * that buys is worth very little here: the only person a forged snapshot can
 * mislead is the student who forged it, and the reply is advice rather than an
 * action. So the client computes it, the server clamps it, and nothing in the
 * database is written from anything the model says.
 *
 * Pure. No React, no Firestore, no model. That is what makes the redaction
 * testable rather than a claim in a comment.
 */

/** Hard ceilings, so a forged snapshot cannot inflate the prompt. */
export const MAX_SUBJECTS = 8;
export const MAX_PLAN_STEPS = 4;
export const MAX_SUBJECT_CHARS = 60;

export interface CompanionSubject {
  subject: string;
  /** 0-100, rounded. A share is easier for a model to compare than a fraction. */
  ready: number;
  atRisk: number;
  notStarted: number;
}

export interface CompanionPlanStep {
  kind: "review" | "test" | "generate";
  title: string;
  subject: string | null;
  cards: number;
}

/**
 * The study state, as the model receives it.
 *
 * Deliberately flat and small: this is rebuilt and re-sent on every turn, so
 * it is the part of the prompt that is NOT cacheable, and every field is one
 * the answer would be wrong without.
 */
export interface CompanionSnapshot {
  /** Cards waiting right now, and cards never seen. */
  due: number;
  fresh: number;
  /** Cards the scheduler thinks are at risk from repeated failures. */
  shaky: number;
  /** Total cards in the library. Zero means a brand-new account. */
  totalCards: number;
  /** 0-100 share of cards expected to hold at the horizon; null with no cards. */
  readiness: number | null;
  /** "exam", "deadline" or "rolling" — what the readiness is measured against. */
  horizon: "exam" | "deadline" | "rolling";
  /** Days until that horizon, when it is a real date. */
  horizonDays: number | null;
  /** What the deadline is called, when a deadline supplied the horizon. */
  horizonLabel: string | null;
  /** Weakest first. Capped; see MAX_SUBJECTS. */
  subjects: CompanionSubject[];
  /** What today's plan already decided, so Tala agrees with the dashboard. */
  plan: CompanionPlanStep[];
  /** Cards the student's own goal allows today. */
  dailyGoal: number;
  /** Consecutive days with any study, and the best run. */
  streak: number;
  longestStreak: number;
  /** Minutes studied in the last seven days. */
  minutesThisWeek: number;
}

/** A subject name is student-supplied text, so it is clamped like any input. */
function cleanSubject(value: string): string {
  return value.trim().slice(0, MAX_SUBJECT_CHARS);
}

function clampCount(value: unknown): number {
  if (typeof value !== "number" || !Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(100_000, Math.round(value)));
}

function clampPercent(value: unknown): number {
  if (typeof value !== "number" || !Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(100, Math.round(value)));
}

/**
 * Narrows whatever arrived on the wire into a snapshot worth prompting with.
 *
 * The browser computes this, so the browser can send anything. Nothing here
 * trusts a number, a length, or a type. Unusable input becomes a snapshot of
 * an empty library rather than an error, because a companion that refuses to
 * talk because a count was malformed is a worse failure than one that says
 * "you have nothing due".
 */
export function readSnapshot(input: unknown): CompanionSnapshot {
  const raw = (input ?? {}) as Record<string, unknown>;

  const horizon =
    raw.horizon === "exam" || raw.horizon === "deadline" ? raw.horizon : "rolling";

  const subjects: CompanionSubject[] = Array.isArray(raw.subjects)
    ? raw.subjects
        .filter((s): s is Record<string, unknown> => !!s && typeof s === "object")
        .map((s) => ({
          subject: typeof s.subject === "string" ? cleanSubject(s.subject) : "",
          ready: clampPercent(s.ready),
          atRisk: clampCount(s.atRisk),
          notStarted: clampCount(s.notStarted),
        }))
        .filter((s) => s.subject.length > 0)
        .slice(0, MAX_SUBJECTS)
    : [];

  const plan: CompanionPlanStep[] = Array.isArray(raw.plan)
    ? raw.plan
        .filter((p): p is Record<string, unknown> => !!p && typeof p === "object")
        .map((p) => ({
          kind:
            p.kind === "test" || p.kind === "generate"
              ? (p.kind as "test" | "generate")
              : ("review" as const),
          title: typeof p.title === "string" ? cleanSubject(p.title) : "",
          subject: typeof p.subject === "string" ? cleanSubject(p.subject) : null,
          cards: clampCount(p.cards),
        }))
        .filter((p) => p.title.length > 0)
        .slice(0, MAX_PLAN_STEPS)
    : [];

  const readiness =
    typeof raw.readiness === "number" && Number.isFinite(raw.readiness)
      ? clampPercent(raw.readiness)
      : null;

  const horizonDays =
    typeof raw.horizonDays === "number" && Number.isFinite(raw.horizonDays)
      ? Math.max(0, Math.min(3650, Math.round(raw.horizonDays)))
      : null;

  return {
    due: clampCount(raw.due),
    fresh: clampCount(raw.fresh),
    shaky: clampCount(raw.shaky),
    totalCards: clampCount(raw.totalCards),
    readiness,
    horizon,
    horizonDays,
    horizonLabel:
      typeof raw.horizonLabel === "string" && raw.horizonLabel.trim()
        ? cleanSubject(raw.horizonLabel)
        : null,
    subjects,
    plan,
    dailyGoal: clampCount(raw.dailyGoal),
    streak: clampCount(raw.streak),
    longestStreak: clampCount(raw.longestStreak),
    minutesThisWeek: clampCount(raw.minutesThisWeek),
  };
}

/**
 * The snapshot as the model reads it.
 *
 * Written as labelled lines rather than JSON on purpose. A model reading
 * `Weakest subject: Chemistry (41% ready, 6 at risk)` answers in those words;
 * given JSON it tends to answer in JSON's words, and a study companion that
 * says "your atRisk count is 6" has stopped sounding like a person.
 *
 * An empty library returns a single line saying so, rather than eight zeros —
 * zeros invite the model to talk about them.
 */
export function describeSnapshot(snapshot: CompanionSnapshot): string {
  if (snapshot.totalCards === 0) {
    return "This student has no flashcards yet. They have not made a study set.";
  }

  const lines: string[] = [
    `Cards due right now: ${snapshot.due}`,
    `Cards never seen: ${snapshot.fresh}`,
    `Cards they keep failing (shaky): ${snapshot.shaky}`,
    `Cards in total: ${snapshot.totalCards}`,
    `Their daily card goal: ${snapshot.dailyGoal}`,
  ];

  if (snapshot.readiness !== null) {
    const against =
      snapshot.horizon === "exam"
        ? snapshot.horizonDays !== null
          ? `their exam in ${snapshot.horizonDays} days`
          : "their exam"
        : snapshot.horizon === "deadline"
          ? `${snapshot.horizonLabel ?? "their next deadline"}${
              snapshot.horizonDays !== null ? ` in ${snapshot.horizonDays} days` : ""
            }`
          : "the next 30 days";
    lines.push(`Expected to still remember ${snapshot.readiness}% by ${against}`);
  }

  if (snapshot.subjects.length > 0) {
    lines.push("Subjects, weakest first:");
    for (const s of snapshot.subjects) {
      lines.push(
        `  - ${s.subject}: ${s.ready}% ready, ${s.atRisk} shaky, ${s.notStarted} never seen`,
      );
    }
  }

  if (snapshot.plan.length > 0) {
    lines.push("What today's plan already says to do, in order:");
    for (const step of snapshot.plan) {
      const what =
        step.kind === "generate"
          ? "turn this note into cards"
          : step.kind === "test"
            ? "sit a test"
            : `review ${step.cards} cards`;
      lines.push(`  - ${step.title}: ${what}`);
    }
  }

  lines.push(
    `Studied ${snapshot.minutesThisWeek} minutes in the last 7 days`,
    `Current run of study days: ${snapshot.streak} (their best is ${snapshot.longestStreak})`,
  );

  return lines.join("\n");
}
