import { notFound } from "next/navigation";

import {
  ReadinessCard,
  SubjectReadinessList,
} from "@/components/app/readiness";
import { TodaysPlan } from "@/components/app/todays-plan";
import { buildPlan } from "@/lib/stats/plan";
import type { ReadinessReport } from "@/lib/stats/readiness";

export const metadata = {
  title: "Readiness — dev reference",
  robots: { index: false, follow: false },
};

const day = 24 * 60 * 60 * 1000;

function report(over: Partial<ReadinessReport>): ReadinessReport {
  const base: ReadinessReport = {
    horizon: new Date(Date.now() + 47 * day),
    hasExam: true,
    total: 210,
    onTrack: 142,
    atRisk: 38,
    notStarted: 30,
    needsWork: 68,
    share: 142 / 210,
    bySubject: [],
  };
  return { ...base, ...over };
}

const SUBJECTS = [
  { subject: "Taxation", total: 62, onTrack: 18, atRisk: 30, notStarted: 14, share: 18 / 62 },
  { subject: "Auditing", total: 41, onTrack: 20, atRisk: 12, notStarted: 9, share: 20 / 41 },
  { subject: "Management Services", total: 33, onTrack: 22, atRisk: 7, notStarted: 4, share: 22 / 33 },
  { subject: "FAR", total: 74, onTrack: 62, atRisk: 9, notStarted: 3, share: 62 / 74 },
  { subject: "RFBT", total: 28, onTrack: 28, atRisk: 0, notStarted: 0, share: 1 },
];

const CASES: [string, ReadinessReport][] = [
  ["Board reviewer, work to do", report({ bySubject: SUBJECTS })],
  [
    "Student, no exam date",
    report({
      hasExam: false,
      horizon: new Date(Date.now() + 30 * day),
      total: 84,
      onTrack: 61,
      atRisk: 14,
      notStarted: 9,
      needsWork: 23,
      share: 61 / 84,
    }),
  ],
  [
    "Everything on track",
    report({
      total: 96,
      onTrack: 96,
      atRisk: 0,
      notStarted: 0,
      needsWork: 0,
      share: 1,
    }),
  ],
  [
    "Badly behind, exam close",
    report({
      horizon: new Date(Date.now() + 5 * day),
      total: 300,
      onTrack: 41,
      atRisk: 180,
      notStarted: 79,
      needsWork: 259,
      share: 41 / 300,
    }),
  ],
  [
    "Brand new — seeded sample, nothing reviewed yet",
    report({
      hasExam: false,
      total: 8,
      onTrack: 0,
      atRisk: 0,
      notStarted: 8,
      needsWork: 8,
      share: 0,
    }),
  ],
  [
    "One card, singular wording",
    report({
      total: 1,
      onTrack: 0,
      atRisk: 1,
      notStarted: 0,
      needsWork: 1,
      share: 0,
    }),
  ],
];

const PLAN_CASES: [string, ReturnType<typeof buildPlan>][] = [
  [
    "Board reviewer, backlog held back",
    buildPlan(
      [
        { id: "s1", title: "Income Taxation — Deductions", courseTag: "Taxation", due: 22, fresh: 6 },
        { id: "s2", title: "Audit Sampling", courseTag: "Auditing", due: 14, fresh: 0 },
        { id: "s3", title: "Consolidation", courseTag: "FAR", due: 9, fresh: 3 },
      ],
      [{ id: "n1", title: "Monday review centre handout", hasSet: false }],
      ["Taxation", "Auditing", "Management Services", "FAR", "RFBT"],
      20,
    ),
  ],
  [
    "Light day, nothing held back",
    buildPlan(
      [{ id: "s1", title: "General Biology 1 — Photosynthesis", courseTag: "General Biology 1", due: 6, fresh: 0 }],
      [],
      ["General Biology 1"],
      20,
    ),
  ],
  [
    "Only an unconverted note",
    buildPlan([], [{ id: "n1", title: "Thursday lecture", hasSet: false }], [], 20),
  ],
];

export default function DevReadiness() {
  devOnly();

  return (
    <div className="mx-auto max-w-2xl space-y-10 p-8">
      <div>
        <h1 className="font-display text-3xl font-semibold">Readiness — states</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Dev reference with synthetic reports. Switch your OS theme to check
          dark mode.
        </p>
      </div>

      {PLAN_CASES.map(([label, p]) => (
        <section key={label}>
          <h2 className="text-muted-foreground mb-2 text-xs font-medium tracking-widest uppercase">
            Plan — {label}
          </h2>
          <TodaysPlan plan={p} />
        </section>
      ))}

      {CASES.map(([label, r]) => (
        <section key={label}>
          <h2 className="text-muted-foreground mb-2 text-xs font-medium tracking-widest uppercase">
            {label}
          </h2>
          <ReadinessCard report={r} />
          {r.bySubject.length > 1 ? (
            <div className="mt-4">
              <SubjectReadinessList subjects={r.bySubject} />
            </div>
          ) : null}
        </section>
      ))}
    </div>
  );
}

/**
 * Dev-only. These pages exist to inspect an animated, multi-state, two-theme
 * component without hand-building the data behind it, which is worth keeping —
 * but they were reachable in production, where `robots: noindex` only keeps
 * them out of search results, not out of reach. Visible locally and on
 * previews, 404 in production.
 */
function devOnly() {
  if (process.env.VERCEL_ENV === "production") notFound();
}
