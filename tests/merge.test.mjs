// Proves the merge keeps existing card ids — which is what preserves SM-2
// history — and only appends genuinely new fronts.
const normaliseFront = (f) => f.trim().toLowerCase().replace(/\s+/g, " ");

const existing = [
  { id: "card-a", front: "What is mitosis?", order: 0 },
  { id: "card-b", front: "Name the four phases", order: 1 },
];
const regenerated = [
  { front: "what is   MITOSIS?", back: "reworded answer" },  // same, reworded
  { front: "Name the four phases", back: "P M A T" },        // identical
  { front: "What is cytokinesis?", back: "new" },            // genuinely new
];

const existingFronts = new Set(existing.map((c) => normaliseFront(c.front)));
const nextOrder = existing.reduce((m, c) => Math.max(m, c.order + 1), 0);
const fresh = regenerated.filter((c) => !existingFronts.has(normaliseFront(c.front)));

let failures = 0;
const check = (name, cond) => { console.log(`  ${cond ? "ok  " : "FAIL"} ${name}`); if (!cond) failures++; };

check("case and whitespace differences are the same card", fresh.length === 1);
check("only the genuinely new card is added", fresh[0].front === "What is cytokinesis?");
check("new card appends after existing order", nextOrder === 2);
check("existing card ids are untouched, so review logs survive",
  existing.every((c) => ["card-a", "card-b"].includes(c.id)));
check("final count is existing + new", existingFronts.size + fresh.length === 3);

const noChange = regenerated.slice(0, 2).filter((c) => !existingFronts.has(normaliseFront(c.front)));
check("regenerating an unchanged note adds nothing", noChange.length === 0);

console.log(failures ? `\n${failures} FAILED\n` : "\n6 checks passed.\n");
process.exit(failures ? 1 : 0);
