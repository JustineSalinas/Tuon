/**
 * Invite codes and group limits.
 *
 * The code is the only thing standing between a stranger and a group of
 * minors, so these checks are about two things: that a code is hard to guess,
 * and that a code a human mistypes off a whiteboard still works. Those pull in
 * opposite directions, and getting the second one wrong quietly pushes people
 * toward sharing groups some other way.
 */
import assert from "node:assert/strict";

import {
  CODE_LENGTH,
  INVITE_TTL_DAYS,
  MAX_GROUPS_PER_USER,
  MAX_MEMBERS,
  codeEntropyBits,
  generateInviteCode,
  inviteExpiry,
  isExpired,
  isUsableGroupName,
  isWellFormedCode,
  normaliseInviteCode,
} from "../src/lib/groups/invite.ts";

let passed = 0;
function check(name, fn) {
  fn();
  passed++;
  console.log(`  ok  ${name}`);
}

console.log("\nInvite codes");

check("a code is the length it claims", () => {
  assert.equal(generateInviteCode().length, CODE_LENGTH);
  assert.equal(isWellFormedCode(generateInviteCode()), true);
});

check("codes avoid the characters people confuse", () => {
  // A code gets read aloud across a classroom and typed from a photo of a
  // whiteboard. 0/O and 1/I/L are not worth four extra characters of alphabet.
  let sample = "";
  for (let i = 0; i < 200; i += 1) sample += generateInviteCode();
  assert.equal(/[01ILO]/.test(sample), false);
});

check("codes are hard enough to guess", () => {
  // Roughly 39 bits. At a thousand tries a second this is centuries, and
  // joining is rate-limited on top.
  assert.ok(codeEntropyBits() > 35, `only ${codeEntropyBits()} bits`);
});

check("codes do not repeat", () => {
  // Not proof of randomness, but a generator seeded per-second would collide
  // immediately and this would catch it.
  const seen = new Set();
  for (let i = 0; i < 500; i += 1) seen.add(generateInviteCode());
  assert.equal(seen.size, 500);
});

check("the generator uses every character available", () => {
  // A modulo bug that clipped the alphabet would shrink the keyspace without
  // changing the code's length or its appearance.
  const seen = new Set();
  for (let i = 0; i < 400; i += 1) {
    for (const ch of generateInviteCode()) seen.add(ch);
  }
  assert.ok(seen.size >= 30, `only ${seen.size} distinct characters`);
});

console.log("\nTyping a code back in");

check("case and spacing do not matter", () => {
  assert.equal(normaliseInviteCode(" a b c d 2345 "), "ABCD2345");
  assert.equal(normaliseInviteCode("abcd2345"), "ABCD2345");
});

check("the confusable characters are accepted as what was meant", () => {
  // Someone reading "0" off a whiteboard meant "O". Failing them for it is a
  // support request for no reason.
  assert.equal(normaliseInviteCode("0BCD2345"), "OBCD2345");
  assert.equal(normaliseInviteCode("1BCD2345"), "IBCD2345");
  assert.equal(normaliseInviteCode("LBCD2345"), "IBCD2345");
});

check("punctuation from a copy-paste is stripped", () => {
  assert.equal(normaliseInviteCode("ABCD-2345"), "ABCD2345");
  assert.equal(normaliseInviteCode("code: ABCD2345"), "CODEABCD");
});

check("a code of the wrong length is rejected", () => {
  assert.equal(isWellFormedCode("ABC"), false);
  assert.equal(isWellFormedCode(""), false);
  assert.equal(isWellFormedCode("ABCD23456789"), false);
});

check("something pasted far too long is cut, not accepted whole", () => {
  assert.equal(normaliseInviteCode("ABCD2345EXTRAJUNK").length, CODE_LENGTH);
});

console.log("\nExpiry");

check("an invite expires", () => {
  // A code pasted into a class group chat in June must not still admit
  // strangers in December.
  const now = new Date("2026-08-30T00:00:00Z");
  const expiry = inviteExpiry(now);
  assert.equal(isExpired(expiry, now), false);
  assert.equal(
    isExpired(expiry, new Date(now.getTime() + (INVITE_TTL_DAYS + 1) * 86400000)),
    true,
  );
});

check("expiry is inclusive at the boundary", () => {
  const at = new Date("2026-09-13T00:00:00Z");
  assert.equal(isExpired(at, at), true);
});

console.log("\nWhat keeps a group a group");

check("a group has a name", () => {
  assert.equal(isUsableGroupName(""), false);
  assert.equal(isUsableGroupName("   "), false);
  assert.equal(isUsableGroupName("Bio review batch"), true);
  assert.equal(isUsableGroupName("x".repeat(81)), false);
});

check("groups are capped at a size people can know each other at", () => {
  // A study group of 200 is a public room with extra steps, and public rooms
  // are exactly what this is not: the audience is Grade 11 and 12, and a live
  // space with adult strangers would need moderation this has no plan for.
  assert.ok(MAX_MEMBERS <= 50, `${MAX_MEMBERS} is a room, not a group`);
  assert.ok(MAX_GROUPS_PER_USER <= 20);
});

console.log(`\n${passed} checks passed.\n`);
