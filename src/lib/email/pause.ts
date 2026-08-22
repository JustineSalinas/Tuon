/**
 * Stops hammering the email provider with a request that cannot succeed.
 *
 * A bad API key or an unverified sending domain fails identically on every
 * call, and the window where that is true is not short: DNS propagation takes
 * hours, and setting the keys before the domain finishes verifying is the
 * obvious order to do it in. Without this, every signup in that window pays a
 * doomed round trip and writes an error line.
 *
 * Deliberately dependency-free — no logger, no `server-only` — so the decision
 * can be tested outside Next. The state is per-instance because there is
 * nowhere cheap to put shared state on a serverless function; instances are
 * reused, so it still removes most of the calls. It is a cost control, not a
 * guarantee.
 */

export const CONFIG_FAILURE_PAUSE_MS = 15 * 60 * 1000;

let pausedUntil = 0;

/**
 * Whether a rejection is configuration rather than weather.
 *
 * 401 is a bad or revoked key; 403 is a sending domain that is not verified.
 * Retrying either per-request only multiplies the same failure. Rate limits
 * and 5xx are excluded on purpose: those really do clear on their own, and
 * pausing on them would turn a blip into fifteen minutes of degraded delivery.
 */
export function isMisconfiguration(status: number): boolean {
  return status === 401 || status === 403;
}

export function isPaused(now: number = Date.now()): boolean {
  return now < pausedUntil;
}

/** Records a rejection. Returns true when it started a pause. */
export function noteFailure(status: number, now: number = Date.now()): boolean {
  if (!isMisconfiguration(status)) return false;
  pausedUntil = now + CONFIG_FAILURE_PAUSE_MS;
  return true;
}

/** A delivered message means whatever was wrong has been fixed. */
export function noteSuccess(): void {
  pausedUntil = 0;
}

/** Exported for tests; nothing in the app should need to call it. */
export function resetSendPause(): void {
  pausedUntil = 0;
}
