import { BOOK_PATH, MARK_HEX } from "@/components/brand/book-mark";
import { ImageResponse } from "next/og";

/**
 * The app icon: the mark on a cream tile.
 *
 * Generated rather than shipped as a PNG for the same reason the link preview
 * is — the palette and the mark stay in step with the app instead of drifting
 * from a file nobody remembers to re-export. The large size also becomes the
 * home-screen icon once the app is installed from the manifest.
 *
 * The same path the in-app mark draws, imported rather than restated, so a
 * launcher tile and a browser tab can never disagree about the shape. It can
 * be shared because the traced mark has no holes and so needs no fill rule —
 * the one SVG feature Satori, the renderer here, does not support.
 *
 * TWO SIZES, on purpose. The mark is three shapes with real negative space
 * between them, and that space is most of what makes it read as a book rather
 * than as a shield. A browser handed only a 512px icon downsamples it to 16
 * with its own filter and closes those gaps to mud. Rendering a 32 natively
 * lets the rasteriser make that decision once, properly, with the geometry in
 * front of it — and browsers pick the nearest size rather than the first.
 */

export const contentType = "image/png";

const TILE = "#FAF7F2";

/**
 * The mark's own colour rather than the theme's.
 *
 * A tab icon sits on the browser's chrome, not on the app's ground, so it
 * follows the artwork rather than `--primary` — which a student can change to
 * one of five palettes without meaning to restyle the thing in their taskbar.
 */
const INK = MARK_HEX;

/**
 * How much of the tile the mark fills, per size.
 *
 * The small one is drawn proportionally larger. Margin costs nothing at 512px
 * and costs a legible pixel at 32, where the whole mark is barely two dozen
 * across.
 */
const SIZES = [
  { id: "32", size: 32, inset: 0.94 },
  { id: "512", size: 512, inset: 0.74 },
] as const;

export function generateImageMetadata() {
  return SIZES.map(({ id, size }) => ({
    id,
    size: { width: size, height: size },
    contentType,
  }));
}

export default function Icon({ id }: { id: string }) {
  const chosen = SIZES.find((entry) => entry.id === id) ?? SIZES[SIZES.length - 1];
  const mark = Math.round(chosen.size * chosen.inset);

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: TILE,
        }}
      >
        <svg width={mark} height={mark} viewBox="0 0 32 32" fill="none">
          <path d={BOOK_PATH} fill={INK} />
        </svg>
      </div>
    ),
    { width: chosen.size, height: chosen.size },
  );
}
