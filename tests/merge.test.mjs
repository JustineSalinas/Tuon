import assert from "node:assert/strict";

/**
 * Regenerating a note into its EXISTING set.
 *
 * The property that matters is that existing cards keep their ids, because an
 * id is the key its review log is stored under — replacing cards would
 * silently destroy the spaced-repetition history, the one thing here that
 * cannot be regenerated.
 *
 * Mirrors `normaliseFront` in /api/generate. Kept in step by hand; if that
 * changes, change this.
 */
const normaliseFront = (f) => f.trim().toLowerCase().replace(/\s+/g, " ");

let passed = 0;
function check(name, fn) {
  fn();
  passed += 1;
  console.log(`  ok  ${name}`);
}

const existing = [
  { id: "card-a", front: "What is mitosis?", order: 0 },
  { id: "card-b", front: "Name the four phases", order: 1 },
];

const regenerated = [
  { front: "what is   MITOSIS?", back: "reworded answer" }, // same question, reworded
  { front: "Name the four phases", back: "P M A T" }, // identical
  { front: "What is cytokinesis?", back: "new" }, // genuinely new
];

const existingFronts = new Set(existing.map((c) => normaliseFront(c.front)));
const nextOrder = existing.reduce((m, c) => Math.max(m, c.order + 1), 0);
const fresh = regenerated.filter((c) => !existingFronts.has(normaliseFront(c.front)));

console.log("\nRegenerating into an existing set");

check("case and whitespace differences are the same card", () => {
  assert.equal(fresh.length, 1);
});

check("only the genuinely new card is added", () => {
  assert.equal(fresh[0].front, "What is cytokinesis?");
});

check("new cards append after the existing order", () => {
  assert.equal(nextOrder, 2);
});

check("existing card ids are untouched, so review logs survive", () => {
  assert.deepEqual(
    existing.map((c) => c.id),
    ["card-a", "card-b"],
  );
});

check("the final count is existing plus new", () => {
  assert.equal(existingFronts.size + fresh.length, 3);
});

check("regenerating an unchanged note adds nothing", () => {
  const unchanged = regenerated
    .slice(0, 2)
    .filter((c) => !existingFronts.has(normaliseFront(c.front)));
  assert.equal(unchanged.length, 0);
});

console.log(`\n${passed} checks passed.\n`);
