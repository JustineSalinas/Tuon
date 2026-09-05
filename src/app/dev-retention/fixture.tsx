"use client";

import { RetentionReport } from "@/components/app/retention-report";
import type { ReviewCard } from "@/lib/hooks/use-review-cards";

/**
 * The fixture, built in the browser.
 *
 * It has to be: `nextReviewAt` is a Firestore Timestamp and the report calls
 * `.toDate()` on it, and a server component cannot pass a function to a
 * client component. The gate that 404s this in production stays in page.tsx,
 * where `VERCEL_ENV` is readable.
 */

const day = 24 * 60 * 60 * 1000;

/** Firestore hands back a Timestamp; retention only ever calls `toDate`. */
const stamp = (ms: number) =>
  ({ toDate: () => new Date(ms) }) as ReviewCard["log"] extends null
    ? never
    : NonNullable<ReviewCard["log"]>["nextReviewAt"];

const SETS = [
  { id: "far", title: "Financial Accounting and Reporting", subject: "FAR" },
  { id: "tax", title: "Taxation", subject: "Taxation" },
  { id: "aud", title: "Auditing Theory", subject: "Auditing" },
  { id: "rfbt", title: "Regulatory Framework", subject: "RFBT" },
];

const FRONTS = [
  "Define a contingent liability",
  "When is revenue recognised over time?",
  "VAT threshold for registration",
  "Substantive vs analytical procedures",
  "Elements of a valid contract",
  "Straight-line vs declining balance",
  "What makes an opinion qualified?",
  "Fringe benefit tax base",
  "Going concern indicators",
  "Prescriptive period for assessment",
];

/**
 * Seventy cards spread across every stage and both sides of the at-risk line,
 * so each branch of the report actually has something to draw. Deterministic
 * — the same page twice is the same page, or comparing two screenshots means
 * nothing.
 */
function fixture(now: number): ReviewCard[] {
  const cards: ReviewCard[] = [];

  for (let i = 0; i < 70; i += 1) {
    const set = SETS[i % SETS.length];
    // Ten of them have never been reviewed, so "new" is populated.
    const seen = i % 7 !== 0;

    // Interval walks the maturity thresholds: <7 learning, <30 young, else
    // mature.
    const intervalDays = [1, 3, 6, 12, 21, 45, 90][i % 7];
    // A tenth sit below AT_RISK_EASE (2.0) so the at-risk list is not empty.
    const easeFactor = i % 9 === 0 ? 1.6 + (i % 3) * 0.1 : 2.1 + (i % 5) * 0.15;
    // Due dates from three days overdue to a fortnight out.
    const dueOffset = ((i * 5) % 18) - 3;

    cards.push({
      id: `card-${i}`,
      front: FRONTS[i % FRONTS.length],
      back: "…",
      order: i,
      studySetId: set.id,
      studySetTitle: set.title,
      courseTag: set.subject,
      log: seen
        ? {
            flashcardId: `card-${i}`,
            studySetId: set.id,
            easeFactor,
            intervalDays,
            repetitions: Math.min(9, Math.floor(intervalDays / 3)),
            nextReviewAt: stamp(now + dueOffset * day),
            lastReviewedAt: stamp(now - intervalDays * day),
            lastRating: "good",
          }
        : null,
    } as ReviewCard);
  }

  return cards;
}

export function RetentionFixture() {
  // Fixed, not `Date.now()`, so the forecast does not shift between a
  // screenshot and the one you are comparing it against.
  const now = Date.UTC(2026, 8, 5, 4, 0, 0);

  return (
    <RetentionReport
      cards={fixture(now)}
      loading={false}
      now={now}
      timeZone="Asia/Manila"
    />
  );
}
