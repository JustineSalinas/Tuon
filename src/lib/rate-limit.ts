import "server-only";

import { FieldValue, Timestamp } from "firebase-admin/firestore";

import { adminDb } from "@/lib/firebase/admin";
import { log } from "@/lib/observability/log";

/**
 * Fixed-window rate limiting, keyed by whatever you pass in.
 *
 * The per-account quota already bounds what one student costs. What it cannot
 * bound is *account creation*: signup is open, so a script can mint accounts
 * and burn each one's free generations. That is the hole this closes, and it
 * has to be keyed on something the attacker cannot mint at will — the IP.
 *
 * State lives in Firestore rather than memory because the routes run on
 * serverless instances that neither share memory nor outlive a request. It
 * costs one transaction per limited call, which is far less than one Anthropic
 * call.
 *
 * Fixed windows, not a sliding log: an attacker can send 2x the limit across a
 * window boundary. Accepted deliberately — the sliding version needs one
 * document per request, and this is a cost control, not a lock.
 */

export interface RateLimitRule {
  /** Namespace, e.g. "bootstrap". Keeps unrelated limits from colliding. */
  scope: string;
  /** Requests allowed per window. */
  limit: number;
  windowSeconds: number;
}

export interface RateLimitResult {
  allowed: boolean;
  /** Requests left in this window. */
  remaining: number;
  /** Seconds until the window resets. */
  retryAfter: number;
}

/**
 * Reads a threshold from the environment, falling back to the default.
 *
 * The thresholds are configurable rather than literal because they are the one
 * piece of this file worth not publishing: knowing that bootstrap allows ten
 * per hour per address tells someone exactly how many addresses they need to
 * farm N free accounts. Probing for the number is possible but noisy — every
 * block is logged — so keeping it out of the source removes a free
 * reconnaissance step. Being able to tighten a limit under attack without a
 * redeploy is the second reason.
 *
 * A malformed or absent value falls back rather than throwing: a typo in an
 * env var must not take the whole app down, and the default is already a
 * defensible number.
 */
function envLimit(name: string, fallback: number): number {
  const parsed = Number(process.env[name]);
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
  return Math.floor(parsed);
}

export const RATE_LIMITS = {
  /**
   * Profile creation. A real person does this once; ten in an hour from one
   * address is someone farming free tiers.
   */
  bootstrap: {
    scope: "bootstrap",
    limit: envLimit("RATE_LIMIT_BOOTSTRAP", 10),
    windowSeconds: 3600,
  },
  /**
   * Generation. The per-plan cap and cooldown already gate a single account;
   * this catches many accounts behind one address. Set well above what a
   * shared school or café connection would produce.
   */
  generate: {
    scope: "generate",
    limit: envLimit("RATE_LIMIT_GENERATE", 60),
    windowSeconds: 3600,
  },
  /** Deleting an account should never be attempted in bulk. */
  accountDelete: {
    scope: "account-delete",
    limit: envLimit("RATE_LIMIT_ACCOUNT_DELETE", 5),
    windowSeconds: 3600,
  },
  /** Reporting a shared set. Unauthenticated, so it needs its own ceiling. */
  report: {
    scope: "report",
    limit: envLimit("RATE_LIMIT_REPORT", 20),
    windowSeconds: 3600,
  },
  /** Starting a checkout. Rare per person, and it hits a paid API. */
  checkout: {
    scope: "checkout",
    limit: envLimit("RATE_LIMIT_CHECKOUT", 10),
    windowSeconds: 3600,
  },
} satisfies Record<string, RateLimitRule>;

/**
 * Best-effort client address.
 *
 * `x-forwarded-for` is client-controlled in general, but on Vercel the proxy
 * rewrites it, so the FIRST entry is the real peer. Reading the last entry, or
 * trusting the header off-platform, would let a caller spoof their way around
 * the limit — so a request with no usable address is limited under a shared
 * key rather than waved through.
 */
export function clientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  const first = forwarded?.split(",")[0]?.trim();
  if (first) return first;
  return request.headers.get("x-real-ip")?.trim() || "unknown";
}

export async function checkRateLimit(
  rule: RateLimitRule,
  key: string,
): Promise<RateLimitResult> {
  const now = Date.now();
  const windowMs = rule.windowSeconds * 1000;
  const windowStart = Math.floor(now / windowMs) * windowMs;
  const retryAfter = Math.ceil((windowStart + windowMs - now) / 1000);

  // The window index is in the document id, so a new window is a new document
  // and no reset logic is needed. `sanitise` keeps an IPv6 address or a
  // hostile header value from escaping the path segment.
  const id = `${rule.scope}_${sanitise(key)}_${windowStart}`;
  const ref = adminDb().collection("rateLimits").doc(id);

  try {
    const count = await adminDb().runTransaction(async (tx) => {
      const snapshot = await tx.get(ref);
      const current = snapshot.exists ? ((snapshot.get("count") as number) ?? 0) : 0;
      const next = current + 1;

      if (next > rule.limit) return next;

      tx.set(
        ref,
        {
          count: FieldValue.increment(1),
          scope: rule.scope,
          // Lets a scheduled sweep drop old windows; nothing reads it.
          expiresAt: Timestamp.fromMillis(windowStart + windowMs),
        },
        { merge: true },
      );
      return next;
    });

    if (count > rule.limit) {
      log.warn({
        scope: "rate-limit",
        event: "blocked",
        rule: rule.scope,
        // The key is an IP; log it, since blocking decisions need to be
        // auditable. It is not tied to a named student here.
        key,
        count,
      });
      return { allowed: false, remaining: 0, retryAfter };
    }

    return { allowed: true, remaining: rule.limit - count, retryAfter };
  } catch (error) {
    // Fail OPEN. A Firestore blip must not lock every student out of the
    // product; the per-account quota is still enforced underneath, so the
    // worst case is that the anti-farming layer is briefly off.
    log.error({ scope: "rate-limit", event: "check_failed", rule: rule.scope }, error);
    return { allowed: true, remaining: rule.limit, retryAfter };
  }
}

/** Firestore ids may not contain "/" and are capped in length. */
function sanitise(key: string): string {
  return key.replace(/[^A-Za-z0-9._:-]/g, "-").slice(0, 100) || "unknown";
}

/** 429 body shared by every limited route. */
export function rateLimitedResponse(result: RateLimitResult, what: string) {
  return Response.json(
    {
      error: `Too many ${what} from this connection. Please try again in a few minutes.`,
      code: "RATE_LIMITED",
    },
    { status: 429, headers: { "retry-after": String(result.retryAfter) } },
  );
}
