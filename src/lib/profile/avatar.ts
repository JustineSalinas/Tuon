/**
 * Profile pictures, without Firebase Storage.
 *
 * Storage is not set up on this project — no bucket rules, no firebase.json
 * entry, and enabling it is a console step. It would also add a whole new
 * access-control surface, and "anyone can upload anything to your bucket" is
 * one of the most common ways a Firebase app gets abused.
 *
 * A profile picture does not need any of that. Downscaled to a small square
 * and encoded as a data URL, a face is a few kilobytes — smaller than the note
 * text already sitting in Firestore — so it rides along on the profile
 * document the app already reads on every load. No bucket, no second set of
 * rules, no orphaned files when an account is deleted, and the export in
 * "Download your data" picks it up for free.
 *
 * The ceiling is what makes that safe: the profile is read on every app load,
 * so an unbounded blob there would slow down every screen. Everything below
 * exists to guarantee the encoded result is small.
 */

/** Rendered square, in device-independent pixels. Displayed at 32-64px. */
export const AVATAR_SIZE = 192;

/**
 * Hard ceiling on the encoded string, enforced again in firestore.rules.
 *
 * ~48KB of base64 is a comfortable 192px JPEG. Firestore's document limit is
 * 1MB and the profile carries other fields, but the real constraint is much
 * tighter than that: this document is read on every page load.
 */
export const MAX_AVATAR_CHARS = 48_000;

/** What a file picker should offer. Vectors are excluded deliberately. */
export const ACCEPTED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];

/**
 * Refused before anything is decoded.
 *
 * SVG is excluded on purpose: it is a document, not a bitmap, and can carry
 * script. Nothing here ever renders it, but accepting one would mean shipping
 * attacker-controlled markup to every member of a study group.
 */
export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;

export type AvatarProblem = "type" | "too-big" | "decode" | "encode";

export function checkFile(file: { type: string; size: number }): AvatarProblem | null {
  if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) return "type";
  if (file.size > MAX_UPLOAD_BYTES) return "too-big";
  return null;
}

export function describeProblem(problem: AvatarProblem): string {
  switch (problem) {
    case "type":
      return "That has to be a JPEG, PNG or WebP.";
    case "too-big":
      return "That image is too large. Try one under 10MB.";
    case "decode":
      return "That file could not be read as an image.";
    case "encode":
      return "That image could not be resized. Try a different one.";
  }
}

/**
 * The square crop, as source-pixel coordinates.
 *
 * Centre-cropped rather than squashed: a face stretched into a square is worse
 * than a face with its edges trimmed, and every avatar in the app is round so
 * the corners were never going to be visible anyway.
 *
 * Pure, so the arithmetic can be tested without a canvas.
 */
export function coverCrop(
  width: number,
  height: number,
): { sx: number; sy: number; size: number } {
  const size = Math.min(width, height);
  return {
    sx: Math.round((width - size) / 2),
    sy: Math.round((height - size) / 2),
    size,
  };
}

/**
 * Picks a JPEG quality that lands under the ceiling.
 *
 * Tries the highest first and steps down. A photograph of a person compresses
 * well at this size, so in practice the first attempt almost always wins; the
 * ladder exists for the noisy screenshot someone will inevitably pick.
 */
export const QUALITY_LADDER = [0.82, 0.7, 0.58, 0.45, 0.34] as const;

export interface EncodeResult {
  dataUrl: string;
  bytes: number;
}

/**
 * Decodes, crops, downscales and encodes — the browser half.
 *
 * Kept in this module rather than the component so the component holds no
 * image handling at all, and so the ceiling is enforced in exactly one place.
 */
export async function fileToAvatar(file: File): Promise<EncodeResult> {
  const bitmap = await createImageBitmap(file).catch(() => null);
  if (!bitmap) throw new Error("decode");

  try {
    const { sx, sy, size } = coverCrop(bitmap.width, bitmap.height);
    const canvas = document.createElement("canvas");
    canvas.width = AVATAR_SIZE;
    canvas.height = AVATAR_SIZE;

    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("encode");
    // A face scaled down without smoothing looks like a screenshot of a face.
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(bitmap, sx, sy, size, size, 0, 0, AVATAR_SIZE, AVATAR_SIZE);

    for (const quality of QUALITY_LADDER) {
      const dataUrl = canvas.toDataURL("image/jpeg", quality);
      if (dataUrl.length <= MAX_AVATAR_CHARS) {
        return { dataUrl, bytes: dataUrl.length };
      }
    }
    throw new Error("encode");
  } finally {
    // Bitmaps hold real memory until closed, and a student trying five photos
    // in a row should not accumulate five of them.
    bitmap.close();
  }
}

/** Whether a stored value is something we are willing to render. */
export function isUsableAvatar(value: unknown): value is string {
  return (
    typeof value === "string" &&
    value.length > 0 &&
    value.length <= MAX_AVATAR_CHARS &&
    // Only self-contained bitmaps. A remote URL here would let a profile beacon
    // every member of a study group who loads the page.
    /^data:image\/(jpeg|png|webp);base64,/.test(value)
  );
}
