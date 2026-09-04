/**
 * The Tuón mark: an open book.
 *
 * Traced from the supplied artwork rather than redrawn by eye, because eye was
 * tried first and produced a chevron. The mark is three separate shapes with
 * real negative space between them — two leaves, and one connected piece
 * carrying the outer cover edges, the fanned page block and the spine — and
 * that white space is most of what makes it read as a book rather than as a
 * shield.
 *
 * How it was traced: the render was thresholded on hue, mirrored about its own
 * centre (the source is a raster and sits 0.8% off symmetric — invisible, but
 * free to remove, and an exactly symmetric mark stays exact when scaled), then
 * contoured at 4x and simplified to 131 points. That is close enough that the
 * outline sits on the source's edges under overlay, and small enough to live
 * in a component.
 *
 * There are no holes — three outer contours, nothing nested — so this needs no
 * fill rule and renders identically anywhere, including in Satori, which draws
 * the generated app icon and link preview.
 *
 * Coordinates are in the mark's own 32-unit box, symmetric about x = 16.
 */

/** The colour sampled from the artwork. */
export const MARK_HEX = "#C65431";

/** The outer cover edges, the fanned page block and the spine — one connected shape. */
const SPREAD =
  "M1.00 6.89L1.00 20.43L4.98 20.98L6.85 21.46L9.27 22.33L12.31 24.01L13.65 25.15L14.03 25.84L11.27 23.92L9.60 23.15L7.53 22.50L5.15 22.15L3.30 22.11L1.04 22.31L1.00 22.81L3.18 22.91L6.21 23.30L10.34 24.36L12.02 25.04L13.66 25.94L14.10 26.28L14.32 27.00L14.69 27.40L15.61 27.75L16.38 27.75L17.21 27.46L17.67 27.00L17.90 26.28L18.33 25.94L19.98 25.04L22.43 24.10L26.59 23.17L30.99 22.81L30.95 22.31L28.69 22.11L26.85 22.15L24.46 22.50L22.40 23.15L20.72 23.92L17.96 25.84L18.35 25.15L19.69 24.01L22.72 22.33L25.14 21.46L27.01 20.98L30.99 20.43L30.95 6.85L29.30 7.76L28.81 8.35L28.55 9.06L28.55 19.06L26.88 19.31L25.17 19.76L23.72 20.31L21.75 21.31L20.23 22.37L19.06 23.44L17.87 24.93L16.98 26.37L16.31 26.53L15.01 26.37L14.12 24.93L12.93 23.44L11.76 22.37L10.24 21.31L8.27 20.31L6.82 19.76L5.11 19.31L3.44 19.06L3.41 8.90L3.09 8.19L2.50 7.60Z";

/** The left leaf. */
const LEFT_LEAF =
  "M4.39 4.24L4.39 17.68L6.56 18.23L8.18 18.81L9.53 19.43L10.63 20.04L11.27 20.46L12.53 21.43L13.16 22.02L13.94 22.90L14.81 24.15L15.44 25.46L15.41 13.12L15.35 12.64L15.22 12.15L14.86 11.38L14.35 10.60L14.02 10.22L12.89 9.11L11.79 8.27L10.53 7.44L8.73 6.37L7.20 5.60L7.15 5.53L6.24 5.08L6.17 5.08L6.05 4.98L5.98 4.98L5.56 4.76Z";

/** The right leaf. */
const RIGHT_LEAF =
  "M27.60 4.24L26.43 4.76L26.02 4.98L25.94 4.98L25.82 5.08L25.75 5.08L24.85 5.53L24.79 5.60L23.27 6.37L21.46 7.44L20.20 8.27L19.10 9.11L17.97 10.22L17.65 10.60L17.13 11.38L16.77 12.15L16.77 12.26L16.68 12.48L16.58 13.12L16.56 25.46L17.19 24.15L18.06 22.90L18.83 22.02L19.46 21.43L20.72 20.46L21.36 20.04L22.46 19.43L23.81 18.81L25.43 18.23L27.60 17.68Z";

export const BOOK_PATH = [SPREAD, LEFT_LEAF, RIGHT_LEAF].join(" ");
