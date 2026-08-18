/**
 * Consent record kept on the profile.
 *
 * Tuón's core audience is Grade 11-12, so a large share of accounts belong to
 * minors. The Data Privacy Act treats a minor's personal information as
 * sensitive, and the practical expectation is that a parent or guardian is
 * involved. We cannot verify a guardian's identity — nobody at this scale can
 * — so what we do is:
 *
 *   1. ask plainly whether the student is 18 or over;
 *   2. if not, require them to confirm a parent or guardian has seen this and
 *      agrees;
 *   3. record what was agreed to, and which version, with a server timestamp.
 *
 * That is an attestation, not proof. It is the standard practice for consumer
 * study apps, but it is the one part of this file worth showing to a lawyer
 * before you take payments or launch to schools.
 */

/**
 * Bump this whenever the terms or privacy notice change materially. A profile
 * whose `termsAcceptedVersion` is older can then be re-prompted.
 */
export const CONSENT_VERSION = "2026-08-18";

/** Human-readable date shown on the policy pages, kept in step with the above. */
export const POLICY_UPDATED = "18 August 2026";

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
