/**
 * Removing a subject without losing a term's work.
 *
 * Subject editing was half-built: you could add one, and you could untick one,
 * and unticking silently orphaned every note, study set, deadline and logged
 * hour tagged with it. Nothing was deleted, but nothing could be found either
 * — the tag simply stopped matching anything on the profile, so the material
 * disappeared from every per-subject total in the app while still sitting in
 * the database. That is worse than deletion, because it looks like a bug and
 * cannot be undone by the student.
 *
 * So this is a data-loss surface, not a settings toggle. The rule it enforces:
 * CONTENT IS NEVER DELETED. Removing a subject either moves its material to
 * another subject or leaves it untagged, and the student is told which before
 * they agree to it.
 *
 * Pure. No React, no Firestore.
 */

/** The minimum each collection has to expose to be counted. */
export interface TaggedDoc {
  id: string;
  courseTag?: string | null;
}

export interface SubjectContents {
  notes: TaggedDoc[];
  sets: TaggedDoc[];
  planItems: TaggedDoc[];
  sessions: TaggedDoc[];
}

export interface SubjectSummary {
  subject: string;
  notes: number;
  sets: number;
  /** Flashcards inside those sets, which carry the tag through their set. */
  cards: number;
  planItems: number;
  sessions: number;
  /** Whether anything at all is attached. */
  isEmpty: boolean;
}

/** Case- and whitespace-insensitive, because tags are typed by people. */
export function tagMatches(tag: string | null | undefined, subject: string): boolean {
  if (typeof tag !== "string") return false;
  return tag.trim().toLowerCase() === subject.trim().toLowerCase();
}

function countMatching(docs: TaggedDoc[], subject: string): TaggedDoc[] {
  return docs.filter((doc) => tagMatches(doc.courseTag, subject));
}

/**
 * What is attached to a subject, for the sentence shown before deleting.
 *
 * Cards are counted through their set rather than directly: a flashcard has no
 * subject of its own, it inherits its set's. Review history is deliberately
 * NOT counted — it is keyed by card and follows the cards wherever they go, so
 * mentioning it would imply it were at risk when it is not.
 */
export function summariseSubject(
  contents: SubjectContents,
  subject: string,
): SubjectSummary {
  const sets = countMatching(contents.sets, subject) as (TaggedDoc & {
    flashcardCount?: number;
  })[];

  const summary: SubjectSummary = {
    subject,
    notes: countMatching(contents.notes, subject).length,
    sets: sets.length,
    cards: sets.reduce((sum, set) => sum + (set.flashcardCount ?? 0), 0),
    planItems: countMatching(contents.planItems, subject).length,
    sessions: countMatching(contents.sessions, subject).length,
    isEmpty: false,
  };

  summary.isEmpty =
    summary.notes === 0 &&
    summary.sets === 0 &&
    summary.planItems === 0 &&
    summary.sessions === 0;

  return summary;
}

/** Every document that has to be rewritten, grouped by collection. */
export interface RetagPlan {
  notes: string[];
  sets: string[];
  planItems: string[];
  sessions: string[];
  total: number;
}

export function planRetag(contents: SubjectContents, subject: string): RetagPlan {
  const notes = countMatching(contents.notes, subject).map((d) => d.id);
  const sets = countMatching(contents.sets, subject).map((d) => d.id);
  const planItems = countMatching(contents.planItems, subject).map((d) => d.id);
  const sessions = countMatching(contents.sessions, subject).map((d) => d.id);

  return {
    notes,
    sets,
    planItems,
    sessions,
    total: notes.length + sets.length + planItems.length + sessions.length,
  };
}

/**
 * Firestore refuses a batch over 500 writes.
 *
 * A student with a busy term can exceed that across four collections, and the
 * failure would land halfway through — some material retagged, some orphaned,
 * which is the exact state this whole module exists to prevent. Chunking well
 * under the limit keeps every batch valid.
 */
export const MAX_BATCH_WRITES = 400;

export function chunk<T>(items: T[], size = MAX_BATCH_WRITES): T[][] {
  if (size < 1) return items.length ? [items] : [];
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
}

/**
 * The sentence shown before the student agrees.
 *
 * Written as a plain list of what exists rather than a warning, because the
 * honest message here is reassuring: none of it is going anywhere. A dialog
 * that shouts about deletion when nothing is deleted teaches people to ignore
 * the next dialog.
 */
export function describeContents(summary: SubjectSummary): string {
  const parts: string[] = [];
  if (summary.notes) parts.push(`${summary.notes} ${summary.notes === 1 ? "note" : "notes"}`);
  if (summary.sets) {
    const sets = `${summary.sets} study ${summary.sets === 1 ? "set" : "sets"}`;
    parts.push(summary.cards ? `${sets} (${summary.cards} cards)` : sets);
  }
  if (summary.planItems) {
    parts.push(`${summary.planItems} ${summary.planItems === 1 ? "item" : "items"} in your week`);
  }
  if (summary.sessions) {
    parts.push(
      `${summary.sessions} logged ${summary.sessions === 1 ? "session" : "sessions"}`,
    );
  }

  if (parts.length === 0) return "Nothing is tagged with this subject.";
  if (parts.length === 1) return parts[0];
  return `${parts.slice(0, -1).join(", ")} and ${parts[parts.length - 1]}`;
}
