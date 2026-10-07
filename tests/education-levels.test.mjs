/**
 * Country-specific wording for Grade 11/12, layered over the universal
 * ISCED default. The property that matters: the stored VALUE never moves
 * with the country, only the label and hint a student reads — strandsAvailable
 * and the scheduler key off the value, so if a country override ever
 * changed it, a US student's profile would silently stop meaning what the
 * rest of the app assumes it means.
 */
import assert from "node:assert/strict";

import {
  EDUCATION_LEVELS,
  educationLevelLabel,
  educationLevelsFor,
} from "../src/lib/curriculum.ts";

let passed = 0;
function check(name, fn) {
  fn();
  passed++;
  console.log(`  ok  ${name}`);
}

console.log("\nCountry-specific wording for grade 11/12");

check("an unlisted country keeps the universal label", () => {
  assert.deepEqual(educationLevelsFor("JP"), EDUCATION_LEVELS);
  assert.deepEqual(educationLevelsFor(null), EDUCATION_LEVELS);
});

check("the US gets its own wording for grade 11 and 12 only", () => {
  const levels = educationLevelsFor("US");
  const g11 = levels.find((l) => l.value === "grade_11");
  const g12 = levels.find((l) => l.value === "grade_12");
  assert.equal(g11.label, "11th grade");
  assert.equal(g12.label, "12th grade");
  // College and board review are not US-specific coinages; left untouched.
  assert.deepEqual(
    levels.find((l) => l.value === "college"),
    EDUCATION_LEVELS.find((l) => l.value === "college"),
  );
});

check("the stored value never changes, only the label and hint", () => {
  for (const country of ["US", "GB", "IN", "AU", "JP"]) {
    const levels = educationLevelsFor(country);
    assert.deepEqual(
      levels.map((l) => l.value),
      EDUCATION_LEVELS.map((l) => l.value),
    );
  }
});

check("every override country actually produces different wording", () => {
  for (const country of ["US", "GB", "IN", "AU"]) {
    const levels = educationLevelsFor(country);
    const g11 = levels.find((l) => l.value === "grade_11");
    assert.notEqual(g11.label, "Grade 11", `${country} did not override the label`);
  }
});

console.log("\neducationLevelLabel with a country");

check("passing no country at all keeps the old generic behaviour", () => {
  assert.equal(educationLevelLabel("grade_11"), "Grade 11");
});

check("passing a country re-words the label", () => {
  assert.equal(educationLevelLabel("grade_11", "US"), "11th grade");
  assert.equal(educationLevelLabel("grade_12", "GB"), "Year 13");
});

check("a null level still falls back to a safe default", () => {
  assert.equal(educationLevelLabel(null, "US"), "Student");
});

console.log(`\n${passed} checks passed.\n`);
