import { ImageResponse } from "next/og";

/**
 * The link preview.
 *
 * A shared link in a class group chat is this product's main distribution
 * path, and an unfurl that renders as a bare URL wastes it. Generated at build
 * time rather than shipped as a PNG so the wordmark and palette stay in step
 * with the app.
 *
 * Deliberately no external fonts: next/og would have to fetch them, and a
 * failed fetch means no preview at all. System serif fallbacks are fine at
 * this size.
 */

export const alt = "Tuón — turn your class notes into flashcards and quizzes";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: "#FAF7F2",
          padding: 72,
          fontFamily: "Georgia, serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
          <svg width="52" height="52" viewBox="0 0 32 32" fill="none">
            <circle
              cx="16"
              cy="16"
              r="13"
              stroke="#C0603A"
              strokeWidth="2"
              strokeLinecap="round"
              strokeDasharray="60 22"
              opacity="0.45"
            />
            <circle cx="16" cy="16" r="5.5" fill="#C0603A" />
          </svg>
          <div style={{ fontSize: 44, fontWeight: 600, color: "#1F1B18" }}>Tuón</div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>
          <div
            style={{
              fontSize: 76,
              lineHeight: 1.05,
              color: "#1F1B18",
              letterSpacing: "-0.02em",
              maxWidth: 940,
            }}
          >
            Turn your class notes into flashcards and quizzes
          </div>
          <div style={{ fontSize: 32, color: "#6B6259", maxWidth: 900 }}>
            Then review them on a schedule that makes things stick. Built for
            Senior High and college students in the Philippines.
          </div>
        </div>

        <div style={{ display: "flex", fontSize: 26, color: "#C0603A" }}>tuon.app</div>
      </div>
    ),
    size,
  );
}
