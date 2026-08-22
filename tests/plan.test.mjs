/**
 * Today's plan.
 *
 * The ordering is the whole feature, so most of these are about order and about
 * the daily goal being respected. A plan that quietly asks for more than the
 * student's goal is the backlog wall the goal exists to prevent.
 */
import assert from "node:assert/strict";

import { buildPlan } from "../src/lib/stats/plan.ts";

let passed = 0;
function check(name, fn) {
  fn();
  passed++;
  console.log(`  ok  ${name}`);
}

const set = (id, courseTag, due, fresh = 0, title = id) => ({
  id,
  title,
  courseTag,
  due,
  fresh,
});
const note = (id, hasSet, title = id) => ({ id, title, hasSet });

console.log("\nToday's plan");

check("the weakest subject comes first, not the biggest pile", () => {
  // "Most due" is the obvious sort and the wrong one: it sends you to the
  // subject you have most of, not the one you are least ready for.
  const sets = [set("big", "Strong", 40), set("small", "Weak", 3)];
  const plan = buildPlan(sets, [], ["Weak", "Strong"], 100);
  assert.equal(plan.steps[0].id, "small");
  assert.equal(plan.steps[0].reason, "Weakest subject");
});

check("within one subject, the bigger pile comes first", () => {
  const sets = [set("a", "Weak", 2), set("b", "Weak", 9)];
  const plan = buildPlan(sets, [], ["Weak"], 100);
  assert.equal(plan.steps[0].id, "b");
});

check("untagged sets sort last rather than claiming to be weakest", () => {
  const sets = [set("untagged", null, 20), set("tagged", "Weak", 2)];
  const plan = buildPlan(sets, [], ["Weak"], 100);
  assert.equal(plan.steps[0].id, "tagged");
  assert.equal(plan.steps[1].id, "untagged");
});

check("a subject missing from the ranking still sorts after ranked ones", () => {
  const sets = [set("unknown", "Unranked", 20), set("known", "Weak", 2)];
  const plan = buildPlan(sets, [], ["Weak"], 100);
  assert.equal(plan.steps[0].id, "known");
});

console.log("\nThe daily goal");

check("the plan never asks for more cards than the goal", () => {
  const sets = [set("a", "Weak", 50), set("b", "Strong", 50)];
  const plan = buildPlan(sets, [], ["Weak", "Strong"], 20);
  assert.equal(plan.totalCards, 20);
  assert.ok(plan.steps.every((s) => s.cards > 0));
});

check("what the goal could not fit is reported as held back, not dropped", () => {
  const sets = [set("a", "Weak", 50)];
  const plan = buildPlan(sets, [], ["Weak"], 20);
  assert.equal(plan.totalCards, 20);
  assert.equal(plan.heldBack, 30);
});

check("a goal smaller than the first set still produces one usable step", () => {
  const sets = [set("a", "Weak", 50), set("b", "Strong", 50)];
  const plan = buildPlan(sets, [], ["Weak", "Strong"], 5);
  assert.equal(plan.steps.filter((s) => s.kind === "review").length, 1);
  assert.equal(plan.totalCards, 5);
});

check("a zero goal produces no review steps rather than a broken one", () => {
  const plan = buildPlan([set("a", "Weak", 50)], [], ["Weak"], 0);
  assert.deepEqual(
    plan.steps.filter((s) => s.kind === "review"),
    [],
  );
  assert.equal(plan.totalCards, 0);
  assert.equal(plan.heldBack, 50);
});

check("negative counts cannot drag the total below zero", () => {
  // Denormalised counts can go strange; the plan must not.
  const plan = buildPlan([set("a", "Weak", -5, -5)], [], ["Weak"], 10);
  assert.equal(plan.totalCards, 0);
  assert.equal(plan.heldBack, 0);
});

check("the step count is capped so it reads as a plan, not a list", () => {
  const sets = Array.from({ length: 12 }, (_, i) => set(`s${i}`, "Weak", 5));
  const plan = buildPlan(sets, [], ["Weak"], 500);
  assert.ok(plan.steps.length <= 4, `got ${plan.steps.length} steps`);
});

check("one subject cannot eat the whole day while another waits", () => {
  // Weakest-first alone starves everything else: the weakest subject usually
  // has the most pending work too, so it swallows the goal and the second
  // subject slides to tomorrow, where the same thing happens again.
  const sets = [set("weak", "Weak", 28), set("other", "Other", 14)];
  const plan = buildPlan(sets, [], ["Weak", "Other"], 20);
  const reviews = plan.steps.filter((s) => s.kind === "review");
  assert.equal(reviews.length, 2, "both subjects should appear");
  assert.ok(reviews[0].cards <= 10, `first step took ${reviews[0].cards}`);
  assert.equal(plan.totalCards, 20);
});

check("the weakest subject still leads and still gets the larger share", () => {
  const sets = [set("weak", "Weak", 28), set("other", "Other", 3)];
  const plan = buildPlan(sets, [], ["Weak", "Other"], 20);
  assert.equal(plan.steps[0].subject, "Weak");
  assert.ok(plan.steps[0].cards >= plan.steps[1].cards);
});

check("a single subject with work is not capped", () => {
  // The cap exists to stop starvation. With nothing to starve it would just
  // shorten the session for no reason.
  const plan = buildPlan([set("only", "Weak", 40)], [], ["Weak"], 20);
  assert.equal(plan.totalCards, 20);
  assert.equal(plan.steps[0].cards, 20);
});

check("a small goal is not chopped into pointless fragments", () => {
  // Three cards then two is two trips for no benefit.
  const sets = [set("weak", "Weak", 50), set("other", "Other", 50)];
  const plan = buildPlan(sets, [], ["Weak", "Other"], 5);
  assert.equal(plan.steps.filter((s) => s.kind === "review").length, 1);
  assert.equal(plan.totalCards, 5);
});


console.log("\nThe note gap");

check("a note that never became a study set is offered as a step", () => {
  const plan = buildPlan([], [note("n1", false, "Monday lecture")], [], 20);
  assert.equal(plan.steps.length, 1);
  assert.equal(plan.steps[0].kind, "generate");
  assert.equal(plan.steps[0].title, "Monday lecture");
  assert.equal(plan.steps[0].cards, 0);
});

check("notes that already have a set are not offered", () => {
  const plan = buildPlan([], [note("n1", true)], [], 20);
  assert.deepEqual(plan.steps, []);
});

check("the note step rides along with review work rather than replacing it", () => {
  const plan = buildPlan([set("a", "Weak", 5)], [note("n1", false)], ["Weak"], 20);
  assert.equal(plan.steps.length, 2);
  assert.equal(plan.steps[0].kind, "review");
  assert.equal(plan.steps[1].kind, "generate");
});

check("a full plan drops the note step rather than exceeding the cap", () => {
  const sets = Array.from({ length: 6 }, (_, i) => set(`s${i}`, "Weak", 5));
  const plan = buildPlan(sets, [note("n1", false)], ["Weak"], 500);
  assert.equal(plan.steps.length, 4);
  assert.ok(plan.steps.every((s) => s.kind === "review"));
});

console.log("\nNothing to do");

check("no work and no orphan notes produces an empty plan", () => {
  const plan = buildPlan([set("a", "Weak", 0, 0)], [note("n", true)], ["Weak"], 20);
  assert.deepEqual(plan.steps, []);
  assert.equal(plan.totalCards, 0);
  assert.equal(plan.heldBack, 0);
});

check("sets with nothing pending never appear", () => {
  const plan = buildPlan(
    [set("empty", "Weak", 0, 0), set("real", "Strong", 4)],
    [],
    ["Weak", "Strong"],
    20,
  );
  assert.equal(plan.steps.length, 1);
  assert.equal(plan.steps[0].id, "real");
});

check("never-seen cards count toward a step even with nothing due", () => {
  const plan = buildPlan([set("a", "Weak", 0, 7)], [], ["Weak"], 20);
  assert.equal(plan.steps[0].cards, 7);
  assert.equal(plan.steps[0].reason, "Weakest subject");
});

check("a non-weakest set with only new cards says so", () => {
  const plan = buildPlan(
    [set("w", "Weak", 3), set("o", "Other", 0, 5)],
    [],
    ["Weak", "Other"],
    20,
  );
  assert.equal(plan.steps[1].reason, "Never seen");
});

console.log(`\n${passed} checks passed.\n`);
