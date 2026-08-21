import { ImageResponse } from "next/og";

/**
 * The app icon: the mark on a cream tile.
 *
 * Generated rather than shipped as a PNG for the same reason the OG image is —
 * the palette and the mark stay in step with the app instead of drifting from
 * a file nobody remembers to re-export. This one also becomes the home-screen
 * icon once the app is installed from the manifest.
 *
 * The dot is drawn proportionally larger than in the in-app mark: at 512px in
 * a launcher the ring reads fine, but at a 32px favicon a faithful copy turns
 * into a smudge.
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
          <circle
            cx="16"
            cy="16"
            r="13"
            stroke="#C0603A"
            strokeWidth="2.4"
            strokeLinecap="round"
            strokeDasharray="60 22"
            opacity="0.5"
          />
          <circle cx="16" cy="16" r="6.5" fill="#C0603A" />
        </svg>
      </div>
    ),
    size,
  );
}
