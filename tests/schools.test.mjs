/**
 * Finding your school.
 *
 * The index has 9,465 institutions in it and being present is not the same as
 * being findable — every case below is a real query that failed against the
 * first version of this search. If one of them breaks again, a student in
 * Iloilo types four letters, sees nothing, and concludes their school is not
 * covered.
 */
import assert from "node:assert/strict";

import { acronymOf, suggestSchools } from "../src/lib/schools.ts";

let passed = 0;
function check(name, fn) {
  fn();
  passed++;
  console.log(`  ok  ${name}`);
}

/** A slice of the real index, including the collisions that caused trouble. */
const POOL = {
  hei: [
    "Central Philippine Adventist College",
    "Central Philippine University",
    "Central Philippines State University-Main Campus",
    "Colegio San Agustin-Bacolod",
    "Colegio San Agustin-Biñan",
    "Iloilo Doctors' College",
    "University of San Agustin",
    "University of Santo Tomas",
    "West Visayas State University-Main",
    "West Visayas State University-Janiuay Campus",
  ],
  secondary: [
    "Iloilo City National High School",
    "Iloilo National High School",
    "San Agustin High School",
    "San Agustin Institute of Technology",
    "San Agustin National High School",
    "San Agustin National High School – Annex",
    "San Agustin National Trade High School",
    "Usab High School",
  ],
};

console.log("\nInitials");

check("a campus suffix is not part of the acronym", () => {
  // "West Visayas State University-Main" must answer to WVSU, not WVSUM —
  // nobody types the campus into an abbreviation.
  assert.equal(acronymOf("West Visayas State University-Main"), "wvsu");
  assert.equal(acronymOf("West Visayas State University-Janiuay Campus"), "wvsu");
});

check("joining words are dropped", () => {
  // USA, not UOSA.
  assert.equal(acronymOf("University of San Agustin"), "usa");
  assert.equal(acronymOf("Central Philippine University"), "cpu");
});

check("punctuation and ñ do not break it", () => {
  assert.equal(acronymOf("Colegio San Agustin-Bacolod"), "csa");
  assert.equal(acronymOf("Iloilo Doctors' College"), "idc");
  assert.equal(acronymOf('Benigno "Ninoy" S. Aquino High School'), "bnsahs");
});

console.log("\nThe queries that used to fail");

check("CPU finds Central Philippine University", () => {
  assert.equal(suggestSchools("cpu", POOL)[0], "Central Philippine University");
});

check("WVSU finds West Visayas State University", () => {
  const first = suggestSchools("wvsu", POOL)[0];
  assert.ok(first?.startsWith("West Visayas State University"), `got ${first}`);
});

check("USA finds the university, not Usab High School", () => {
  // The old search returned Usab High School and a list of Agusan schools.
  const results = suggestSchools("usa", POOL);
  assert.equal(results[0], "University of San Agustin");
});

check("a university is not buried under schools sharing its name", () => {
  // Two rounds of this. First, six San Agustin secondary schools filled every
  // slot. Then higher education got three reserved slots and two Colegios and
  // an institute of technology took all three, because the list is
  // alphabetical and alphabetical is not relevance.
  const results = suggestSchools("san agustin", POOL);
  assert.ok(
    results.includes("University of San Agustin"),
    `the university was missing from ${JSON.stringify(results)}`,
  );
});

check("the main campus comes before its branches", () => {
  const results = suggestSchools("west visayas", POOL);
  assert.equal(results[0], "West Visayas State University-Main");
});

console.log("\nNeither tier crowds the other out");

check("a secondary school survives a query full of colleges", () => {
  // Letting higher education take all six fixed "san agustin" and broke this.
  const results = suggestSchools("iloilo", POOL);
  assert.ok(
    results.some((name) => name.includes("National High School")),
    `no high school in ${JSON.stringify(results)}`,
  );
  assert.ok(
    results.some((name) => name === "Iloilo Doctors' College"),
    `no college in ${JSON.stringify(results)}`,
  );
});

check("one tier alone still fills the list", () => {
  // Nothing is held back for a tier that has no matches at all.
  const results = suggestSchools("high school", POOL);
  assert.equal(results.length, 6);
});

console.log("\nThe rules that were already there");

check("under two characters suggests nothing", () => {
  assert.deepEqual(suggestSchools("u", POOL), []);
  assert.deepEqual(suggestSchools(" ", POOL), []);
});

check("an exact name is not offered back", () => {
  const results = suggestSchools("university of san agustin", POOL);
  assert.ok(!results.includes("University of San Agustin"));
});

check("matching is case-insensitive and ignores surrounding space", () => {
  assert.deepEqual(suggestSchools("  CPU  ", POOL), suggestSchools("cpu", POOL));
});

check("nothing is suggested twice", () => {
  // An acronym hit is also a substring hit; it must not appear in both passes.
  const results = suggestSchools("cpu", POOL);
  assert.equal(new Set(results).size, results.length);
});

check("the limit is respected", () => {
  assert.ok(suggestSchools("san", POOL, 3).length <= 3);
});

console.log(`\n${passed} checks passed.\n`);
