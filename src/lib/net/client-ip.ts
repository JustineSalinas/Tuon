/**
 * The key a rate limit is counted against.
 *
 * Pure and free of `server-only` so it can be tested directly — this is
 * parsing logic whose failure mode is silent, and a limit that quietly stops
 * limiting looks exactly like a limit that works.
 */

const IPV6_GROUPS = 8;
/** A /64 is the smallest block an ISP hands out, so it is one subscriber. */
const IPV6_PREFIX_GROUPS = 4;

/**
 * The /64 an IPv6 address sits in, or `null` if this is not IPv6.
 *
 * One IPv6 subscriber holds 2^64 addresses. Keying the limit on the full
 * address would mean a single connection could take a fresh allowance for
 * every request it makes — a rate limit that limits nothing. The prefix is
 * normalised (zeros expanded, leading zeros dropped, lowercased) so that
 * `2001:db8::1` and `2001:0DB8:0000:0000::2` land on the same key.
 */
export function ipv6Prefix(address: string): string | null {
  if (!address.includes(":")) return null;

  // A zone index (fe80::1%eth0) is not part of the address.
  const bare = address.split("%")[0];

  // An IPv4-mapped address (::ffff:203.0.113.5) is an IPv4 client wearing an
  // IPv6 hat: it gets one address, so bucket it whole.
  if (bare.includes(".")) return null;

  const halves = bare.split("::");
  if (halves.length > 2) return null;

  let groups: string[];
  if (halves.length === 1) {
    groups = bare.split(":");
    if (groups.length !== IPV6_GROUPS) return null;
  } else {
    const left = halves[0] ? halves[0].split(":") : [];
    const right = halves[1] ? halves[1].split(":") : [];
    const missing = IPV6_GROUPS - left.length - right.length;
    // `::` has to stand for at least one group, or this is not an address and
    // guessing at it would invent a bucket.
    if (missing < 1) return null;
    groups = [...left, ...Array<string>(missing).fill("0"), ...right];
  }

  const prefix = groups.slice(0, IPV6_PREFIX_GROUPS);
  if (prefix.some((group) => !/^[0-9a-fA-F]{1,4}$/.test(group))) return null;

  return prefix
    .map((group) => group.toLowerCase().replace(/^0+(?=.)/, ""))
    .join(":");
}

/**
 * Best-effort client address.
 *
 * `x-forwarded-for` is client-controlled in general, but on Vercel the proxy
 * rewrites it, so the FIRST entry is the real peer. Reading the last entry, or
 * trusting the header off-platform, would let a caller spoof their way around
 * the limit — so a request with no usable address is limited under a shared
 * key rather than waved through.
 *
 * IPv6 callers are keyed by their /64 rather than their address, for the
 * reason in `ipv6Prefix`. An address that will not parse falls back to itself,
 * which is no worse than counting it whole.
 */
export function clientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  const first = forwarded?.split(",")[0]?.trim();
  const address = first || request.headers.get("x-real-ip")?.trim();
  if (!address) return "unknown";

  const prefix = ipv6Prefix(address);
  return prefix ? `${prefix}::/64` : address;
}
