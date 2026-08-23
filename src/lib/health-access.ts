import { timingSafeEqual } from "node:crypto";

/**
 * Who is allowed to see the detailed health report.
 *
 * The detail is genuinely useful — it turns "the app is broken" into "the
 * service account key is missing" in one request. It is also reconnaissance:
 * an audit found the unauthenticated version telling anyone who asked that
 * App Check was not enforced, which is precisely the fact an attacker needs
 * before deciding whether scripted abuse is worth attempting.
 *
 * So liveness stays public and the detail needs a token. Split out of the
 * route into its own dependency-free module so the rule can actually be
 * tested: the route imports firebase-admin, which pulls in `server-only`,
 * which cannot resolve outside Next.
 */

/** Reasons detail may be withheld, for the route to report honestly. */
export type DetailAccess =
  | { allowed: true; reason: "development" | "token" }
  | { allowed: false; reason: "no_token_configured" | "bad_token" };

/**
 * @param token     the caller's `x-health-token` header, if any
 * @param expected  the configured HEALTH_TOKEN
 * @param isProd    true on the production deployment
 */
export function detailAccess(
  token: string | null | undefined,
  expected: string | null | undefined,
  isProd: boolean,
): DetailAccess {
  // Locally and on previews the detail is the whole point of the endpoint, and
  // there is nothing there worth protecting. Requiring a token to debug your
  // own dev server would just get the endpoint deleted.
  if (!isProd) return { allowed: true, reason: "development" };

  // Fail CLOSED. An unset token must not mean "open to everyone" — that is the
  // exact state the endpoint shipped in, and the state a rushed deploy lands
  // in again.
  if (!expected) return { allowed: false, reason: "no_token_configured" };
  if (!token) return { allowed: false, reason: "bad_token" };

  const a = Buffer.from(token, "utf8");
  const b = Buffer.from(expected, "utf8");
  // timingSafeEqual throws on a length mismatch, so screen for it first. The
  // length itself leaks, which is not worth defending: the token is a secret
  // of our choosing, not a user password.
  if (a.length !== b.length) return { allowed: false, reason: "bad_token" };
  if (!timingSafeEqual(a, b)) return { allowed: false, reason: "bad_token" };

  return { allowed: true, reason: "token" };
}
