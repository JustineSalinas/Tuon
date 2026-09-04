import type { NextConfig } from "next";

/**
 * Hosts the browser genuinely talks to.
 *
 * Fonts are self-hosted by `next/font/google` at build time, so there is no
 * font CDN here. reCAPTCHA is listed because App Check loads it — see
 * `APP_CHECK_ENFORCED` — and it fails silently rather than loudly if blocked.
 */
const FIREBASE_HOSTS = [
  "https://*.googleapis.com",
  "https://*.firebaseio.com",
  "https://*.firebaseapp.com",
  "https://firebaseinstallations.googleapis.com",
];

const RECAPTCHA_HOSTS = ["https://www.google.com", "https://www.gstatic.com"];

/**
 * Everything except framing, reported rather than enforced.
 *
 * The inline palette script runs before first paint and Next.js injects its
 * own inline hydration scripts, so `script-src` still needs `unsafe-inline`
 * until both are nonced. Shipping that as an enforced policy would be a
 * policy that permits its own bypass; shipping it report-only says what the
 * page actually loads, which is what the next pass needs to know.
 */
const REPORT_ONLY_CSP = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline' ${RECAPTCHA_HOSTS.join(" ")}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "font-src 'self' data:",
  `connect-src 'self' ${FIREBASE_HOSTS.join(" ")}`,
  `frame-src 'self' ${RECAPTCHA_HOSTS.join(" ")}`,
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
].join("; ");

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          // Enforced, and deliberately narrow: framing is the one directive
          // this app can refuse today without breaking a single request.
          // `/app/settings` has a one-click "sign out everywhere" and study
          // groups have a one-click "leave", both without a confirm step —
          // exactly the controls a transparent overlay is aimed at.
          {
            key: "Content-Security-Policy",
            value: "frame-ancestors 'none'",
          },
          // For anything that predates frame-ancestors.
          { key: "X-Frame-Options", value: "DENY" },
          // A shared set lives at /s/{userId}/{setId}, so a plain Referer
          // would hand the student's Firebase UID to every site they click
          // through to. Same-origin navigation keeps the full path.
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          {
            key: "Content-Security-Policy-Report-Only",
            value: REPORT_ONLY_CSP,
          },
        ],
      },
    ];
  },
};

export default nextConfig;
