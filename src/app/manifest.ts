import type { MetadataRoute } from "next";

/**
 * Web app manifest — what makes Tuón installable to a home screen.
 *
 * This is the honest near-term version of the "native apps are coming" line on
 * the landing page: an installed PWA gives a student the icon, the standalone
 * window and the offline review, which is most of what they actually wanted
 * from an app. It does not replace store listings, and the landing copy still
 * says those are in the works.
 *
 * `start_url` points at /app rather than /: someone who installed this has an
 * account, and landing them on the marketing page every launch is a small
 * insult repeated daily.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Tuón — turn your notes into study sets",
    short_name: "Tuón",
    description:
      "Paste your notes and get flashcards and a practice quiz, scheduled so each card comes back right before you would have forgotten it.",
    start_url: "/app",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#FAF7F2",
    // Matches the app's cream surface rather than the terracotta accent: this
    // paints the status bar, and a loud bar above a calm page reads as chrome
    // from a different product.
    theme_color: "#FAF7F2",
    lang: "en-PH",
    categories: ["education", "productivity"],
    icons: [
      {
        src: "/icon",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icon",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
    shortcuts: [
      {
        name: "Review due cards",
        short_name: "Review",
        url: "/app/review",
      },
      {
        name: "New note",
        short_name: "New note",
        url: "/app/notes/new",
      },
    ],
  };
}
