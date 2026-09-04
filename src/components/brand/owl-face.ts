/**
 * Tala's face, as geometry the creature draws from.
 *
 * She is the companion rather than the logo — the mark is the open book in
 * `book-mark.ts`. This file was briefly the source of both, which was a
 * mistake worth recording: her face is lovely at 96px and turns to mush at
 * 16, because what makes it hers is the disc and the eyes, and both are
 * line work.
 *
 * All coordinates are in the creature's own 120x120 space.
 */

/**
 * Head, cap and both ear tufts in one outline.
 *
 * Drawn as a single shape on purpose: tufts drawn separately left a seam where
 * they met the head, and two thin slivers rising off a dome read as antennae
 * rather than as ears.
 */
export const HEAD_PATH =
  "M60 12 C 70 12 79 15 86 21 L96 5 L95 27 C 99 35 101 45 100 55 " +
  "C 100 76 88 105 60 105 C 32 105 20 76 20 55 C 19 45 21 35 25 27 " +
  "L24 5 L34 21 C 41 15 50 12 60 12 Z";

/**
 * The facial disc: two lobes meeting in the heart point every owl has.
 *
 * This is the single most recognisable thing about her, and the reason her
 * eyes read as enormous.
 */
export const FACE_PATH =
  "M60 40 C 56 30 48 24 38 26 C 26 29 20 42 21 56 C 22 74 34 88 50 90 " +
  "C 57 91 63 91 70 90 C 86 88 98 74 99 56 C 100 42 94 29 82 26 " +
  "C 72 24 64 30 60 40 Z";

/** Where the two halves of the disc meet. Opens downward from its top edge. */
export const BEAK_PATH =
  "M60 50 C 63.5 50 65.5 53 65 56.5 C 64.5 60 62 63.5 60 64.5 " +
  "C 58 63.5 55.5 60 55 56.5 C 54.5 53 56.5 50 60 50 Z";

export const EYES = [41, 79] as const;
export const EYE_Y = 45;
export const EYE_R = 14;
