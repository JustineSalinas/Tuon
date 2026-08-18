import assert from "node:assert/strict";
import {
  PLANS,
  PLAN_ORDER,
  UPGRADE_TARGET,
  annualFreeMonths,
  annualMonthlyEquivalent,
  monthlyGenerationLimit,
  normalisePlan,
} from "../src/lib/ai/config.ts";
import { readQuota, currentPeriodStart } from "../src/lib/quota.ts";

/** PHP cost of one study set at Sonnet 5 list pricing. */
const COST_TYPICAL = 1.5;

let passed = 0;
const check = (name, fn) => {
  fn();
  passed += 1;
  console.log(`  ok  ${name}`);
};

console.log("\nPlan table");

console.log(
  "\n  tier   price     yearly              sets   cost@cap   margin@cap",
);
for (const id of PLAN_ORDER) {
  const p = PLANS[id];
  const cost = p.monthlyGenerations * COST_TYPICAL;
  const margin = p.phpMonthly ? ((p.phpMonthly - cost) / p.phpMonthly) * 100 : null;
  const yearly = p.phpAnnual
    ? `PHP ${p.phpAnnual} (PHP ${annualMonthlyEquivalent(id)}/mo)`
    : "—";
  console.log(
    `  ${id.padEnd(6)} PHP ${String(p.phpMonthly).padStart(3)}  ${yearly.padEnd(20)}` +
      `${String(p.monthlyGenerations).padStart(4)}   PHP ${String(cost.toFixed(0)).padStart(3)}     ` +
      `${margin === null ? "  —" : margin.toFixed(0) + "%"}`,
  );
}
console.log();

check("free plan has no yearly price", () => {
  assert.equal(PLANS.free.phpAnnual, null);
  assert.equal(PLANS.free.phpMonthly, 0);
});

check("every paid tier is profitable even at its cap", () => {
  for (const id of PLAN_ORDER) {
    const p = PLANS[id];
    if (p.phpMonthly === 0) continue;
    const cost = p.monthlyGenerations * COST_TYPICAL;
    assert.ok(
      cost < p.phpMonthly,
      `${id}: cost PHP ${cost} at cap exceeds price PHP ${p.phpMonthly}`,
    );
  }
});

check("paid tiers keep at least 35% margin at the cap", () => {
  for (const id of PLAN_ORDER) {
    const p = PLANS[id];
    if (p.phpMonthly === 0) continue;
    const margin = (p.phpMonthly - p.monthlyGenerations * COST_TYPICAL) / p.phpMonthly;
    assert.ok(margin >= 0.35, `${id}: only ${(margin * 100).toFixed(0)}% at the cap`);
  }
});

check("price and capacity both increase up the ladder", () => {
  for (let i = 1; i < PLAN_ORDER.length; i += 1) {
    const prev = PLANS[PLAN_ORDER[i - 1]];
    const next = PLANS[PLAN_ORDER[i]];
    assert.ok(next.phpMonthly > prev.phpMonthly, `${next.id} not priced above ${prev.id}`);
    assert.ok(
      next.monthlyGenerations > prev.monthlyGenerations,
      `${next.id} does not include more than ${prev.id}`,
    );
  }
});

check("yearly is exactly two months free on both paid tiers", () => {
  assert.equal(annualFreeMonths("plus"), 2);
  assert.equal(annualFreeMonths("pro"), 2);
  assert.equal(annualMonthlyEquivalent("plus"), 124);
  assert.equal(annualMonthlyEquivalent("pro"), 249);
});

check("yearly is always cheaper per month than monthly", () => {
  for (const id of PLAN_ORDER) {
    if (!PLANS[id].phpAnnual) continue;
    assert.ok(annualMonthlyEquivalent(id) < PLANS[id].phpMonthly);
  }
});

check("exactly one tier is highlighted, and it is the upsell target", () => {
  const highlighted = PLAN_ORDER.filter((id) => PLANS[id].highlighted);
  assert.equal(highlighted.length, 1);
  assert.equal(highlighted[0], UPGRADE_TARGET);
});

console.log("\nPlan resolution");

check("legacy 'paid' resolves to Plus rather than silently downgrading", () => {
  assert.equal(normalisePlan("paid"), "plus");
  assert.equal(monthlyGenerationLimit("paid"), PLANS.plus.monthlyGenerations);
});

check("unknown or missing plan values fail closed to Free", () => {
  for (const value of ["enterprise", "", null, undefined, 7, {}]) {
    assert.equal(normalisePlan(value), "free", `${JSON.stringify(value)} should be free`);
  }
});

console.log("\nQuota enforcement per tier");

const NOW = new Date("2026-08-18T04:00:00.000Z");
const START = currentPeriodStart(NOW);

check("each tier exhausts exactly at its own cap", () => {
  for (const id of PLAN_ORDER) {
    const limit = PLANS[id].monthlyGenerations;
    assert.equal(readQuota(id, limit - 1, START, NOW).exhausted, false);
    assert.equal(readQuota(id, limit, START, NOW).exhausted, true);
    assert.equal(readQuota(id, limit, START, NOW).remaining, 0);
  }
});

check("the low-usage warning fires at 80% on every tier", () => {
  for (const id of PLAN_ORDER) {
    const limit = PLANS[id].monthlyGenerations;
    assert.equal(readQuota(id, Math.floor(limit * 0.5), START, NOW).runningLow, false);
    assert.equal(readQuota(id, Math.ceil(limit * 0.8), START, NOW).runningLow, true);
  }
});

check("a tampered plan value cannot buy extra capacity", () => {
  // The gate reads through normalisePlan, so a forged value fails closed.
  const forged = readQuota("unlimited", 5, START, NOW);
  assert.equal(forged.limit, PLANS.free.monthlyGenerations);
  assert.equal(forged.exhausted, true);
});

console.log(`\n${passed} checks passed.\n`);
