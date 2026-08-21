import { ImageResponse } from "next/og";

/**
 * The app icon: the mark on a cream tile.
 *
 * Generated rather than shipped as a PNG for the same reason the OG image is —
 * the palette and the mark stay in step with the app instead of drifting from
 * a file nobody remembers to re-export. This one also becomes the home-screen
 * icon once the app is installed from the manifest.
 *
 * Same owl as the in-app mark, unmodified — it was drawn on a 32-unit grid
 * specifically so it survives being scaled from a launcher tile down to a
 * 16px browser tab without a second, diverging version.
 */

export const size = { width: 512, height: 512 };
export const contentType = "image/png";

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
          background: "#FAF7F2",
        }}
      >
        <svg width="360" height="360" viewBox="0 0 32 32" fill="none">
            <path d="M4.5 17.5 A11.5 11.5 0 0 1 27.5 17.5" stroke="#C0603A" strokeWidth="2" strokeLinecap="round" opacity="0.45" />
            <path d="M4.5 17.5 A11.5 11.5 0 0 0 27.5 17.5" stroke="#C0603A" strokeWidth="2" strokeLinecap="round" opacity="0.45" />
            <path d="M8.5 8.5 L6.5 4.5 M23.5 8.5 L25.5 4.5" stroke="#C0603A" strokeWidth="2" strokeLinecap="round" opacity="0.45" />
            <circle cx="12" cy="15" r="3.6" fill="#C0603A" />
            <circle cx="20" cy="15" r="3.6" fill="#C0603A" />
            <path d="M16 19.5 L14.6 21.8 H17.4 Z" fill="#C0603A" opacity="0.55" />
          </svg>
      </div>
    ),
    size,
  );
}
