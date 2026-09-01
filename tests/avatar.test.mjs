/**
 * Profile picture handling.
 *
 * The picture rides on the profile document, which the app reads on every
 * page load — so the ceiling is not a nicety, it is the thing that stops one
 * student's holiday photo slowing down every screen they open. These pin down
 * the guards; the canvas half needs a browser and is verified there.
 */
import assert from "node:assert/strict";

import {
  ACCEPTED_IMAGE_TYPES,
  MAX_AVATAR_CHARS,
  MAX_UPLOAD_BYTES,
  checkFile,
  coverCrop,
  describeProblem,
  isUsableAvatar,
} from "../src/lib/profile/avatar.ts";

let passed = 0;
function check(name, fn) {
  fn();
  passed++;
  console.log(`  ok  ${name}`);
}

const dataUrl = (chars) => "data:image/jpeg;base64," + "A".repeat(chars);

console.log("\nWhat may be uploaded");

check("ordinary photo formats are accepted", () => {
  for (const type of ["image/jpeg", "image/png", "image/webp"]) {
    assert.equal(checkFile({ type, size: 500_000 }), null);
  }
});

check("SVG is refused", () => {
  // It is a document, not a bitmap, and can carry script. Accepting one would
  // mean shipping attacker-controlled markup to every member of a study group.
  assert.equal(checkFile({ type: "image/svg+xml", size: 1000 }), "type");
  assert.equal(ACCEPTED_IMAGE_TYPES.includes("image/svg+xml"), false);
});

check("a non-image is refused", () => {
  assert.equal(checkFile({ type: "application/pdf", size: 1000 }), "type");
  assert.equal(checkFile({ type: "text/html", size: 1000 }), "type");
});

check("an enormous file is refused before it is decoded", () => {
  // Decoding a 200MB image to find out it is too big is how a phone runs out
  // of memory.
  assert.equal(checkFile({ type: "image/jpeg", size: MAX_UPLOAD_BYTES + 1 }), "too-big");
  assert.equal(checkFile({ type: "image/jpeg", size: MAX_UPLOAD_BYTES }), null);
});

check("every problem has something a person can act on", () => {
  for (const problem of ["type", "too-big", "decode", "encode"]) {
    const message = describeProblem(problem);
    assert.ok(message.length > 10, problem);
    assert.doesNotMatch(message, /error|failed|invalid/i, problem);
  }
});

console.log("\nThe square crop");

check("a landscape photo is cropped from the centre", () => {
  // Squashing a face into a square is worse than trimming its edges.
  const crop = coverCrop(1000, 600);
  assert.equal(crop.size, 600);
  assert.equal(crop.sy, 0);
  assert.equal(crop.sx, 200);
});

check("a portrait photo is cropped from the centre", () => {
  const crop = coverCrop(600, 1000);
  assert.equal(crop.size, 600);
  assert.equal(crop.sx, 0);
  assert.equal(crop.sy, 200);
});

check("a square photo is not cropped at all", () => {
  assert.deepEqual(coverCrop(800, 800), { sx: 0, sy: 0, size: 800 });
});

check("an odd-sized photo does not produce a fractional crop", () => {
  // A fractional source rect makes canvas resample and blur the result.
  const crop = coverCrop(101, 50);
  assert.ok(Number.isInteger(crop.sx));
  assert.ok(Number.isInteger(crop.sy));
  assert.ok(Number.isInteger(crop.size));
});

console.log("\nWhat may be rendered");

check("a small JPEG data URL is usable", () => {
  assert.equal(isUsableAvatar(dataUrl(100)), true);
});

check("a remote URL is refused", () => {
  // Rendering one would let a profile picture beacon every member of a study
  // group who opens the page.
  assert.equal(isUsableAvatar("https://example.com/me.jpg"), false);
  assert.equal(isUsableAvatar("//example.com/me.jpg"), false);
});

check("an SVG data URL is refused", () => {
  assert.equal(isUsableAvatar("data:image/svg+xml;base64,PHN2Zz48L3N2Zz4="), false);
});

check("a javascript URL is refused", () => {
  assert.equal(isUsableAvatar("javascript:alert(1)"), false);
  assert.equal(isUsableAvatar("data:text/html;base64,PHNjcmlwdD4="), false);
});

check("something over the ceiling is refused", () => {
  // The ceiling is what keeps the profile document small, and the profile is
  // read on every single page load.
  assert.equal(isUsableAvatar(dataUrl(MAX_AVATAR_CHARS + 100)), false);
});

check("nothing at all is refused rather than crashing", () => {
  assert.equal(isUsableAvatar(null), false);
  assert.equal(isUsableAvatar(undefined), false);
  assert.equal(isUsableAvatar(""), false);
  assert.equal(isUsableAvatar(42), false);
  assert.equal(isUsableAvatar({}), false);
});

check("the ceiling leaves room for a real picture", () => {
  // A 192px JPEG of a face is a few kilobytes; if this ever drops near that,
  // every upload would fail and the ladder would have nothing to fall back to.
  assert.ok(MAX_AVATAR_CHARS >= 20_000);
});

console.log(`\n${passed} checks passed.\n`);
