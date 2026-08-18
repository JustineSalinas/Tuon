"use client";

import { useEffect } from "react";

/**
 * Catches failures in the root layout itself, where the app's own providers
 * and styles are not available — so this renders its own minimal document.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    void fetch("/api/client-error", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message: error.message,
        digest: error.digest,
        route: "root-layout",
      }),
    }).catch(() => {});
  }, [error]);

  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: "100dvh",
          display: "grid",
          placeItems: "center",
          background: "#FAF7F2",
          color: "#1F1B18",
          fontFamily: "system-ui, sans-serif",
          padding: "24px",
          textAlign: "center",
        }}
      >
        <div style={{ maxWidth: "26rem" }}>
          <h1 style={{ fontSize: "1.5rem", margin: "0 0 8px" }}>Tuón could not start</h1>
          <p style={{ color: "#6B6259", lineHeight: 1.6, margin: "0 0 24px" }}>
            Your notes are safe. Reloading usually fixes this.
          </p>
          <button
            onClick={reset}
            style={{
              background: "#C0603A",
              color: "#fff",
              border: 0,
              borderRadius: "10px",
              padding: "11px 20px",
              fontSize: "0.95rem",
              cursor: "pointer",
            }}
          >
            Reload
          </button>
        </div>
      </body>
    </html>
  );
}
