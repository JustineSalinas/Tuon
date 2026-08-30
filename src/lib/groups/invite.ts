/**
 * Invite codes, and the limits around a group.
 *
 * The code IS the access control. Anyone holding it can join, which is exactly
 * how a class group chat works and is the right model for people who already
 * know each other — but it means the code has to be unguessable, and it means
 * it has to expire, because a code pasted into a class group chat in June
 * should not still admit strangers in December.
 *
 * Pure, so the alphabet and the entropy can be reasoned about and tested
 * without a Firestore emulator.
 */

/**
 * No 0/O, 1/I/L. A code gets read aloud across a classroom and typed from a
 * photo of a whiteboard; the pairs people confuse are not worth the four extra
 * characters of alphabet.
 */
const ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";

export const CODE_LENGTH = 8;

/**
 * 31^8 is about 8.5e11. Guessing one at even a thousand tries a second would
 * take centuries, and joining is rate-limited on top of that.
 */
export function codeEntropyBits(): number {
  return Math.log2(ALPHABET.length) * CODE_LENGTH;
}

/**
 * Uses the platform CSPRNG.
 *
 * `Math.random` is seeded predictably enough that codes minted in the same
 * second can be related, and this is the only thing standing between a
 * stranger and a group of minors.
 */
export function generateInviteCode(
  random: (size: number) => Uint8Array = defaultRandom,
): string {
  const bytes = random(CODE_LENGTH);
  let code = "";
  for (let i = 0; i < CODE_LENGTH; i += 1) {
    code += ALPHABET[bytes[i] % ALPHABET.length];
  }
  return code;
}

function defaultRandom(size: number): Uint8Array {
  const bytes = new Uint8Array(size);
  crypto.getRandomValues(bytes);
  return bytes;
}

/**
 * Accepts what a person would actually type.
 *
 * Lowercase, spaces from a copy-paste, and the two letter/digit pairs the
 * alphabet deliberately avoids — someone reading "0" off a whiteboard meant
 * "O", and failing them for it is a support request for no reason.
 */
export function normaliseInviteCode(input: string): string {
  return input
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
    .replace(/0/g, "O")
    .replace(/[1L]/g, "I")
    .slice(0, CODE_LENGTH);
}

export function isWellFormedCode(code: string): boolean {
  if (code.length !== CODE_LENGTH) return false;
  // After normalising, O and I are accepted as the letters a reader meant even
  // though the generator never emits them.
  return /^[A-Z0-9]+$/.test(code);
}

/** How long an invite admits people. */
export const INVITE_TTL_DAYS = 14;

/**
 * Caps, all of them about keeping this a group of people who know each other.
 *
 * A "study group" of 200 is a public room with extra steps, and public rooms
 * are the thing this deliberately is not: the audience is Grade 11 and 12, and
 * a live space with adult strangers would make Tuón responsible for moderation
 * it has no plan for.
 */
export const MAX_MEMBERS = 30;
export const MAX_GROUPS_PER_USER = 10;
export const MAX_GROUP_NAME = 80;

export function isUsableGroupName(name: string): boolean {
  const trimmed = name.trim();
  return trimmed.length > 0 && trimmed.length <= MAX_GROUP_NAME;
}

export function inviteExpiry(now: Date = new Date()): Date {
  return new Date(now.getTime() + INVITE_TTL_DAYS * 24 * 60 * 60 * 1000);
}

export function isExpired(expiresAt: Date, now: Date = new Date()): boolean {
  return expiresAt.getTime() <= now.getTime();
}
