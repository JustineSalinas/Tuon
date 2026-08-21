import { ImageResponse } from "next/og";

/**
 * The app icon: the mark on a cream tile.
 *
 * Generated rather than shipped as a PNG for the same reason the OG image is —
 * the palette and the mark stay in step with the app instead of drifting from
 * a file nobody remembers to re-export. This one also becomes the home-screen
 * icon once the app is installed from the manifest.
 *
 * Same owl as the in-app mark, drawn on the same 32-unit grid so it survives
 * scaling from a launcher tile down to a 16px browser tab without a second,
 * diverging version. The one difference is the eyes: the mark punches them out
 * with `fill-rule="evenodd"`, and Satori (which renders this) does not support
 * that, so here they are painted in the tile colour instead. Same result.
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
          <path
            d="M10.6 8.6 L6.4 2.6 L15.2 6.6 Z M21.4 8.6 L25.6 2.6 L16.8 6.6 Z"
            fill={INK}
            strokeLinejoin="round"
          />
          <path
            d="M16 6.2 C 21.4 6.2 25.2 8.8 26.6 12.4 C 27.8 15.4 27.8 19.8 26.4 22.8 C 24.4 27 20.6 29.4 16 29.4 C 11.4 29.4 7.6 27 5.6 22.8 C 4.2 19.8 4.2 15.4 5.4 12.4 C 6.8 8.8 10.6 6.2 16 6.2 Z"
            fill={INK}
          />
          <circle cx="11.2" cy="15.6" r="4.4" fill={TILE} />
          <circle cx="20.8" cy="15.6" r="4.4" fill={TILE} />
          <circle cx="11.2" cy="15.7" r="2.5" fill={INK} />
          <circle cx="20.8" cy="15.7" r="2.5" fill={INK} />
          <path d="M16 20.2 L13.9 23.4 H18.1 Z" fill={TILE} />
        </svg>
      </div>
    ),
    size,
  );
}
