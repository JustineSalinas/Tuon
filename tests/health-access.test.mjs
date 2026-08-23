/**
 * Who may see the detailed health report.
 *
 * This exists because the endpoint already shipped in the wrong state once: it
 * answered in full to anyone on the internet, and an audit pulled "app-check:
 * Not enforced" from production with no credentials. The rule that prevents a
 * repeat is fail-closed — an unset token must never mean "open".
 */
import assert from "node:assert/strict";

import { detailAccess } from "../src/lib/health-access.ts";

let passed = 0;
function check(name, fn) {
  fn();
  passed++;
  console.log(`  ok  ${name}`);
}

const PROD = true;
const NOT_PROD = false;

console.log("\nHealth detail access");

check("production with no token configured refuses detail", () => {
  // The regression that matters. An unset HEALTH_TOKEN must not fall open to
  // the behaviour the audit found.
  const access = detailAccess("anything", undefined, PROD);
  assert.equal(access.allowed, false);
  assert.equal(access.reason, "no_token_configured");
});

check("production with an empty configured token refuses detail", () => {
  // An env var set to "" is the same mistake wearing a different hat.
  assert.equal(detailAccess("", "", PROD).allowed, false);
  assert.equal(detailAccess("x", "", PROD).allowed, false);
});

check("production with no supplied token refuses detail", () => {
  for (const supplied of [null, undefined, ""]) {
    const access = detailAccess(supplied, "s3cret-token", PROD);
    assert.equal(access.allowed, false, `supplied=${String(supplied)}`);
    assert.equal(access.reason, "bad_token");
  }
});

check("production with the wrong token refuses detail", () => {
  assert.equal(detailAccess("wrong-token", "s3cret-token", PROD).allowed, false);
});

check("a token of the wrong length is refused, not thrown on", () => {
  // timingSafeEqual throws on a length mismatch; an exception here would be a
  // 500 on a health endpoint, which is a comedy of its own.
  assert.doesNotThrow(() => detailAccess("short", "much-longer-token", PROD));
  assert.equal(detailAccess("short", "much-longer-token", PROD).allowed, false);
  assert.equal(detailAccess("much-longer-token-x", "tiny", PROD).allowed, false);
});

check("production with the right token allows detail", () => {
  const access = detailAccess("s3cret-token", "s3cret-token", PROD);
  assert.equal(access.allowed, true);
  assert.equal(access.reason, "token");
});

check("outside production the detail is always available", () => {
  // Requiring a token to debug your own dev server gets the endpoint deleted.
  for (const supplied of [null, "", "whatever"]) {
    const access = detailAccess(supplied, undefined, NOT_PROD);
    assert.equal(access.allowed, true, `supplied=${String(supplied)}`);
    assert.equal(access.reason, "development");
  }
});

check("a near-miss token is still refused", () => {
  // One character off, same length — the case a length check alone would pass.
  assert.equal(detailAccess("s3cret-tokeN", "s3cret-token", PROD).allowed, false);
});

console.log(`\n${passed} checks passed.\n`);
