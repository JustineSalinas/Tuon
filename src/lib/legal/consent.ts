/**
 * Consent record kept on the profile.
 *
 * Tuón's core audience is Grade 11-12, so a large share of accounts belong to
 * minors — in every country it now operates in, not only the Philippines. A
 * minor's personal information is sensitive everywhere, and the practical
 * expectation is that a parent or guardian is involved. We cannot verify a
 * guardian's identity — nobody at this scale can — so what we do is:
 *
 *   1. ask plainly whether the student is 18 or over;
 *   2. if not, require them to confirm a parent or guardian has seen this and
 *      agrees;
 *   3. record what was agreed to, and which version, with a server timestamp.
 *
 * That is an attestation, not proof. It is the standard practice for consumer
 * study apps, but it is the one part of this file worth showing to a lawyer
 * before you launch to schools, in any country.
 */

/**
 * Bump this whenever the terms or privacy notice change materially. A profile
 * whose `termsAcceptedVersion` is older can then be re-prompted — nothing
 * calls `consentIsCurrent` yet (see below), so today that re-prompt still
 * has to be built before a version bump actually reaches existing accounts.
 */
export const CONSENT_VERSION = "2026-10-07";

/** Human-readable date shown on the policy pages, kept in step with the above. */
export const POLICY_UPDATED = "7 October 2026";

export interface ConsentRecord {
  /** The version of the terms and privacy notice that was agreed to. */
  termsAcceptedVersion: string;
  /** Server time at which consent was given. */
  termsAcceptedAt: unknown;
  /** Self-declared. Drives the guardian question, nothing else. */
  isAdult: boolean;
  /**
   * True when a minor confirmed a parent or guardian has reviewed and agreed.
   * Always false for an adult — the question was never asked.
   */
  guardianConsent: boolean;
}

/**
 * Whether a stored profile still satisfies the current policy version.
 *
 * Nothing calls this yet: there is no re-consent prompt, because the policies
 * have not changed since launch. When they do, this is the check that decides
 * who gets asked again.
 */
export function consentIsCurrent(version: unknown): boolean {
  return version === CONSENT_VERSION;
}
