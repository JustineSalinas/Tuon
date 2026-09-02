/**
 * Semesters and their subjects.
 *
 * The risk here is not a crash, it is silent data loss: a student who moves to
 * a new term must not find last term's subjects gone, and a note tagged with
 * an old subject must still resolve. Most of these are about what survives.
 */
import assert from "node:assert/strict";

import { en } from "../src/lib/i18n/en.ts";

import {
  MAX_SEMESTERS,
  MAX_SEMESTER_NAME,
  MAX_SUBJECTS_PER_SEMESTER,
  activeSemester,
  allSubjects,
  dedupeSubjects,
  defaultSemesterName,
  isUsableSemesterName,
  newSemesterId,
  readSemesters,
  seedFromCourses,
  semestersWithSubject,
} from "../src/lib/profile/semesters.ts";

let passed = 0;
function check(name, fn) {
  fn();
  passed++;
  console.log(`  ok  ${name}`);
}

const sem = (id, name, subjects = []) => ({ id, name, subjects });

console.log("\nNaming and ids");

check("semesters are numbered, not dated", () => {
  // "1st Semester 2026-27" spans two calendar years, so a date would be a
  // guess the student never made. The ordinal itself is passed in, because
  // ordinals are one of the things every language does differently.
  const ordinal = en.semesters.ordinal;
  assert.equal(defaultSemesterName(0, ordinal), "1st Semester");
  assert.equal(defaultSemesterName(1, ordinal), "2nd Semester");
  assert.equal(defaultSemesterName(2, ordinal), "3rd Semester");
  assert.equal(defaultSemesterName(3, ordinal), "4th Semester");
});

check("ids are unique across rapid creation", () => {
  // Two semesters added in the same millisecond must not collide, or one
  // silently overwrites the other.
  const ids = new Set();
  let seed = 0;
  for (let i = 0; i < 200; i += 1) {
    seed += 1;
    ids.add(newSemesterId(() => (seed * 7919) % 1e6 / 1e6));
  }
  assert.ok(ids.size > 150, `only ${ids.size} distinct`);
});

check("a semester needs a name", () => {
  assert.equal(isUsableSemesterName(""), false);
  assert.equal(isUsableSemesterName("   "), false);
  assert.equal(isUsableSemesterName("1st Semester"), true);
  assert.equal(isUsableSemesterName("x".repeat(MAX_SEMESTER_NAME + 1)), false);
});

console.log("\nSubjects inside a semester");

check("blank and duplicate subjects are dropped", () => {
  // A subject listed twice shows as two rows and splits every total that
  // groups by subject.
  const subjects = dedupeSubjects(["Calculus", " ", "calculus", "Physics", ""]);
  assert.deepEqual(subjects, ["Calculus", "Physics"]);
});

check("duplicates are caught regardless of case or padding", () => {
  assert.deepEqual(dedupeSubjects(["  Biology ", "BIOLOGY"]), ["Biology"]);
});

check("non-strings are ignored rather than rendered", () => {
  assert.deepEqual(dedupeSubjects([null, 42, {}, "Chemistry"]), ["Chemistry"]);
});

check("a semester is capped at a term's worth of subjects", () => {
  const many = Array.from({ length: 40 }, (_, i) => `Subject ${i}`);
  assert.equal(dedupeSubjects(many).length, MAX_SUBJECTS_PER_SEMESTER);
});

console.log("\nReading what is on the profile");

check("well-formed semesters come back intact", () => {
  const stored = [sem("a", "1st Semester", ["Calculus"]), sem("b", "2nd Semester", ["Physics"])];
  assert.deepEqual(readSemesters(stored), stored);
});

check("a malformed entry is dropped, not fatal", () => {
  // The profile is client-writable, so this is validation rather than parsing.
  const stored = [sem("a", "Good", ["X"]), null, { id: "", name: "No id" }, { id: "c" }];
  const result = readSemesters(stored);
  assert.equal(result.length, 1);
  assert.equal(result[0].id, "a");
});

check("duplicate ids are dropped", () => {
  // Two semesters sharing an id makes "which one is active" unanswerable.
  const result = readSemesters([sem("a", "First"), sem("a", "Second")]);
  assert.equal(result.length, 1);
  assert.equal(result[0].name, "First");
});

check("nothing at all reads as no semesters", () => {
  assert.deepEqual(readSemesters(undefined), []);
  assert.deepEqual(readSemesters(null), []);
  assert.deepEqual(readSemesters("1st"), []);
});

check("the number of semesters is capped", () => {
  const many = Array.from({ length: 50 }, (_, i) => sem(`s${i}`, `Sem ${i}`));
  assert.equal(readSemesters(many).length, MAX_SEMESTERS);
});

console.log("\nWhich semester is current");

check("the stored id picks the semester", () => {
  const list = [sem("a", "First"), sem("b", "Second")];
  assert.equal(activeSemester(list, "b").id, "b");
});

check("a stale id falls back rather than emptying every picker", () => {
  // Pointing at a deleted semester must leave the student working, not in a
  // state where every subject list is empty and nothing explains why.
  const list = [sem("a", "First"), sem("b", "Second")];
  assert.equal(activeSemester(list, "deleted").id, "a");
  assert.equal(activeSemester(list, undefined).id, "a");
});

check("no semesters means no active one", () => {
  assert.equal(activeSemester([], "a"), null);
});

console.log("\nNot losing anything");

check("an existing flat subject list becomes semester one", () => {
  // The migration path for every account that predates semesters.
  const seeded = seedFromCourses(
    ["General Biology 1", "Pre-Calculus"],
    en.semesters.ordinal,
    "s1",
  );
  assert.equal(seeded.name, "1st Semester");
  assert.deepEqual(seeded.subjects, ["General Biology 1", "Pre-Calculus"]);
});

check("last term's subjects stay reachable", () => {
  // A note tagged with an old subject must still find its tag in a picker, or
  // editing that note would silently clear the tag.
  const list = [
    sem("a", "1st", ["Calculus", "Physics"]),
    sem("b", "2nd", ["Statistics"]),
  ];
  assert.deepEqual(allSubjects(list), ["Calculus", "Physics", "Statistics"]);
});

check("a subject taken twice is listed once across semesters", () => {
  const list = [sem("a", "1st", ["Calculus"]), sem("b", "2nd", ["calculus"])];
  assert.deepEqual(allSubjects(list), ["Calculus"]);
});

check("a subject can belong to more than one semester", () => {
  const list = [
    sem("a", "1st", ["Calculus", "Physics"]),
    sem("b", "2nd", ["Calculus"]),
  ];
  assert.deepEqual(
    semestersWithSubject(list, "calculus").map((s) => s.id),
    ["a", "b"],
  );
  assert.deepEqual(
    semestersWithSubject(list, "Physics").map((s) => s.id),
    ["a"],
  );
});

check("a subject in no semester matches nothing", () => {
  assert.deepEqual(semestersWithSubject([sem("a", "1st", ["Calculus"])], "Latin"), []);
});

console.log(`\n${passed} checks passed.\n`);
