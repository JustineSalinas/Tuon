/**
 * Semesters, and the subjects inside each one.
 *
 * A student does not carry one flat list of subjects for their whole degree.
 * They carry six for a term, finish it, and pick up six different ones — and
 * the old six should not vanish, because last term's notes and cards are
 * exactly what they revise from before finals.
 *
 * DESIGNED AS A LAYER ABOVE `courses`, NOT A REPLACEMENT FOR IT. The profile's
 * `courses` array keeps meaning what it always meant — "the subjects I am
 * studying now" — and switching semester rewrites it from that semester's
 * list. Everything downstream (readiness, today's plan, the organiser, the
 * timer's subject picker, subject cleanup) keeps working untouched, and an
 * account that has never seen a semester behaves exactly as before.
 *
 * Notes and study sets still tag a subject by NAME rather than by an id into
 * one of these. That is deliberate: a name survives a semester being renamed
 * or deleted, "Calculus" taken in two terms is honestly the same subject, and
 * it avoids rewriting every set a student owns to introduce the feature.
 *
 * Pure. No React, no Firestore.
 */

export interface Semester {
  id: string;
  name: string;
  subjects: string[];
}

/** A term's worth. Past this it is not a semester, it is a degree. */
export const MAX_SUBJECTS_PER_SEMESTER = 15;

/** Senior High is two years, a degree four or five, board review adds more. */
export const MAX_SEMESTERS = 16;

export const MAX_SEMESTER_NAME = 60;

/**
 * Ordinals rather than dates.
 *
 * Philippine schools run first/second semester with a summer term, and the
 * year a term belongs to is ambiguous by design — "1st Semester 2026–27"
 * spans two calendar years. Numbering avoids inventing a date the student
 * never gave.
 */
export function defaultSemesterName(index: number): string {
  const ordinals = ["1st", "2nd", "3rd"];
  const ordinal = ordinals[index] ?? `${index + 1}th`;
  return `${ordinal} Semester`;
}

/** Ids are generated rather than derived from the name, which can change. */
export function newSemesterId(random: () => number = Math.random): string {
  return `s${Date.now().toString(36)}${Math.floor(random() * 1e6).toString(36)}`;
}

export function isUsableSemesterName(name: string): boolean {
  const trimmed = name.trim();
  return trimmed.length > 0 && trimmed.length <= MAX_SEMESTER_NAME;
}

/**
 * Narrows whatever is on the profile into semesters safe to render.
 *
 * The profile is client-writable, so this is validation rather than parsing:
 * a malformed entry is dropped instead of taking the settings screen down.
 */
export function readSemesters(value: unknown): Semester[] {
  if (!Array.isArray(value)) return [];

  const out: Semester[] = [];
  const seenIds = new Set<string>();

  for (const raw of value) {
    if (!raw || typeof raw !== "object") continue;
    const { id, name, subjects } = raw as Record<string, unknown>;
    if (typeof id !== "string" || !id || seenIds.has(id)) continue;
    if (typeof name !== "string" || !name.trim()) continue;

    seenIds.add(id);
    out.push({
      id,
      name: name.trim().slice(0, MAX_SEMESTER_NAME),
      subjects: dedupeSubjects(Array.isArray(subjects) ? subjects : []),
    });

    if (out.length >= MAX_SEMESTERS) break;
  }

  return out;
}

/**
 * Trims, drops blanks, and removes case-insensitive duplicates.
 *
 * "Calculus" and "calculus" in one semester are one subject that would show up
 * as two rows and split every total that groups by subject.
 */
export function dedupeSubjects(input: unknown[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];

  for (const raw of input) {
    if (typeof raw !== "string") continue;
    const name = raw.trim().slice(0, 80);
    if (!name) continue;
    const key = name.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(name);
    if (out.length >= MAX_SUBJECTS_PER_SEMESTER) break;
  }

  return out;
}

/**
 * Which semester is current.
 *
 * Falls back to the first rather than to nothing: a stored id pointing at a
 * deleted semester should leave the student in a working state, not in one
 * where every subject picker is empty and nothing explains why.
 */
export function activeSemester(
  semesters: Semester[],
  activeId: unknown,
): Semester | null {
  if (semesters.length === 0) return null;
  const match = semesters.find((s) => s.id === activeId);
  return match ?? semesters[0];
}

/**
 * Creates the first semester from an account's existing flat subject list.
 *
 * The migration path for every account that predates semesters: their current
 * subjects become semester one, nothing moves, and nothing is lost.
 */
export function seedFromCourses(
  courses: string[],
  id: string = newSemesterId(),
): Semester {
  return { id, name: defaultSemesterName(0), subjects: dedupeSubjects(courses) };
}

/**
 * Every subject the student has ever listed, across all semesters.
 *
 * Used where old material has to stay reachable — a note tagged with last
 * term's subject must still find its tag in a picker, or editing it would
 * silently clear the tag.
 */
export function allSubjects(semesters: Semester[]): string[] {
  return dedupeSubjectsUnbounded(semesters.flatMap((s) => s.subjects));
}

/** Same rules as dedupeSubjects, without the per-semester ceiling. */
function dedupeSubjectsUnbounded(input: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const name of input) {
    const key = name.trim().toLowerCase();
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push(name.trim());
  }
  return out;
}

/** Which semesters a subject appears in — a subject can span several. */
export function semestersWithSubject(
  semesters: Semester[],
  subject: string,
): Semester[] {
  const key = subject.trim().toLowerCase();
  return semesters.filter((s) =>
    s.subjects.some((name) => name.trim().toLowerCase() === key),
  );
}
