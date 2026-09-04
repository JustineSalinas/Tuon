import { BOOK_PATH } from "@/components/brand/book-mark";
import { ImageResponse } from "next/og";

/**
 * The app icon: the mark on a cream tile.
 *
 * Generated rather than shipped as a PNG for the same reason the OG image is —
 * the palette and the mark stay in step with the app instead of drifting from
 * a file nobody remembers to re-export. This one also becomes the home-screen
 * icon once the app is installed from the manifest.
 *
 * The same path the in-app mark draws, imported rather than restated, so a
 * launcher tile and a 16px browser tab can never disagree about the shape.
 * It can be shared because the traced mark has no holes and so needs no
 * fill rule — which is the one SVG feature Satori, the renderer here, does
 * not support.
 */

export const size = { width: 512, height: 512 };
export const contentType = "image/png";

const TILE = "#FAF7F2";
const INK = "#C0603A";

export default function Icon() {
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
        <svg width="380" height="380" viewBox="0 0 32 32" fill="none">
          <path d={BOOK_PATH} fill={INK} />
        </svg>
      </div>
    ),
    size,
  );
}
