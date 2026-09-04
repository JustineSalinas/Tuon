/**
 * The key a rate limit is counted against.
 *
 * This is the whole limit. If two requests from the same person produce two
 * different keys, the limit is decoration — and with IPv6 that is the default
 * outcome, because one subscriber holds 2^64 addresses and can spend a fresh
 * allowance on every request. So most of these are about the many spellings
 * of one address collapsing to one key, and about the parser never quietly
 * accepting something it did not understand.
 */
import assert from "node:assert/strict";

import { clientIp, ipv6Prefix } from "../src/lib/net/client-ip.ts";

let passed = 0;
function check(name, fn) {
  fn();
  passed++;
  console.log(`  ok  ${name}`);
}

const from = (headers) => new Request("https://tuon.app/api/chat", { headers });

console.log("\nIPv6 prefixes");

check("a full address keeps its first four groups", () => {
  assert.equal(
    ipv6Prefix("2001:0db8:85a3:0000:0000:8a2e:0370:7334"),
    "2001:db8:85a3:0",
  );
});

check("every spelling of one /64 lands on one key", () => {
  const expected = "2001:db8:0:0";
  for (const spelling of [
    "2001:db8::1",
    "2001:0db8:0000:0000:0000:0000:0000:0002",
    "2001:0DB8::FFFF",
    "2001:db8:0:0:1:2:3:4",
  ]) {
    assert.equal(ipv6Prefix(spelling), expected, spelling);
  }
});

check("two different /64s stay apart", () => {
  assert.notEqual(ipv6Prefix("2001:db8:1::1"), ipv6Prefix("2001:db8:2::1"));
});

check("a compressed tail expands from the right", () => {
  assert.equal(ipv6Prefix("::1"), "0:0:0:0");
  assert.equal(ipv6Prefix("fe80::abcd"), "fe80:0:0:0");
});

check("a zone index is not part of the address", () => {
  assert.equal(ipv6Prefix("fe80::1%eth0"), "fe80:0:0:0");
});

check("IPv4 is not IPv6", () => {
  assert.equal(ipv6Prefix("203.0.113.5"), null);
  assert.equal(ipv6Prefix("unknown"), null);
});

check("an IPv4-mapped address is one address, not a /64", () => {
  assert.equal(ipv6Prefix("::ffff:203.0.113.5"), null);
});

check("a malformed address is refused rather than guessed at", () => {
  assert.equal(ipv6Prefix("2001:db8::1::2"), null); // two elisions
  assert.equal(ipv6Prefix("2001:db8:85a3:0:0:8a2e:370"), null); // seven groups
  assert.equal(ipv6Prefix("2001:zzzz::1"), null); // not hex
  assert.equal(ipv6Prefix("2001:db8:85a3:00000:0:0:0:1"), null); // five digits
});

check("an elision that stands for nothing is malformed", () => {
  // `::` must cover at least one group. Eight groups plus an elision is not
  // an address, and guessing at it would invent a bucket.
  assert.equal(ipv6Prefix("1:2:3:4:5:6:7:8::"), null);
  // Seven groups plus an elision is fine — it stands for exactly one zero.
  assert.equal(ipv6Prefix("1:2:3:4:5:6:7::"), "1:2:3:4");
});

console.log("\nThe key a request is limited under");

check("IPv6 is limited by its /64, so one subscriber is one bucket", () => {
  const a = clientIp(from({ "x-forwarded-for": "2001:db8:abcd:1::1" }));
  const b = clientIp(from({ "x-forwarded-for": "2001:db8:abcd:1::dead:beef" }));
  assert.equal(a, b);
  assert.equal(a, "2001:db8:abcd:1::/64");
});

check("IPv4 is limited by its own address", () => {
  assert.equal(clientIp(from({ "x-forwarded-for": "203.0.113.5" })), "203.0.113.5");
});

check("the first forwarded entry is the peer, not the last", () => {
  const key = clientIp(
    from({ "x-forwarded-for": "203.0.113.5, 10.0.0.1, 10.0.0.2" }),
  );
  assert.equal(key, "203.0.113.5");
});

check("a spoofed trailing address cannot claim a fresh bucket", () => {
  const honest = clientIp(from({ "x-forwarded-for": "203.0.113.5" }));
  const spoofed = clientIp(
    from({ "x-forwarded-for": "203.0.113.5, 198.51.100.9" }),
  );
  assert.equal(honest, spoofed);
});

check("x-real-ip is the fallback", () => {
  assert.equal(clientIp(from({ "x-real-ip": "203.0.113.7" })), "203.0.113.7");
  assert.equal(clientIp(from({ "x-real-ip": "2001:db8:9::5" })), "2001:db8:9:0::/64");
});

check("no usable address shares one key rather than being waved through", () => {
  assert.equal(clientIp(from({})), "unknown");
  assert.equal(clientIp(from({ "x-forwarded-for": "  " })), "unknown");
});

console.log(`\n${passed} checks passed.\n`);
