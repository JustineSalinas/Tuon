import { notFound } from "next/navigation";

import { LinkGraph } from "@/components/notes/link-graph";
import { buildGraph } from "@/lib/notes/links";
import type { Note } from "@/lib/types";

/**
 * The link graph, drawn from a fixture.
 *
 * The real screen needs an account *and* notes that link to each other with
 * `[[wiki links]]` — so a new student sees the empty state and the person
 * building it sees the empty state, which is how a graph view goes months
 * without anyone looking at the graph.
 */
export const metadata = {
  title: "Link graph — dev reference",
  robots: { index: false, follow: false },
};

/**
 * Firestore hands back a Timestamp; nothing on this page reads one, so it can
 * be an empty object. It must contain no FUNCTION: this is a server component
 * and a function cannot cross into a client one.
 */
const stamp = {} as Note["createdAt"];

/**
 * A reviewer's notes, linked the way notes actually link: a few hubs that
 * everything points at, a couple of tight clusters, and one pair off on its
 * own. An evenly connected mesh looks impressive and tells you nothing about
 * whether the layout survives a real shape.
 */
const NOTES: { title: string; links: string[]; subject: string }[] = [
  {
    title: "Accrual accounting",
    links: ["Revenue recognition", "Matching principle"],
    subject: "FAR",
  },
  {
    title: "Revenue recognition",
    links: ["Accrual accounting", "Performance obligations", "Contract assets"],
    subject: "FAR",
  },
  {
    title: "Performance obligations",
    links: ["Revenue recognition"],
    subject: "FAR",
  },
  {
    title: "Contract assets",
    links: ["Revenue recognition", "Receivables"],
    subject: "FAR",
  },
  {
    title: "Receivables",
    links: ["Contract assets", "Impairment"],
    subject: "FAR",
  },
  { title: "Impairment", links: ["Receivables", "Fair value"], subject: "FAR" },
  { title: "Fair value", links: ["Impairment"], subject: "FAR" },
  {
    title: "Matching principle",
    links: ["Accrual accounting", "Depreciation"],
    subject: "FAR",
  },
  {
    title: "Depreciation",
    links: ["Matching principle", "Fair value"],
    subject: "FAR",
  },

  {
    title: "Income tax",
    links: ["Gross income", "Deductions", "Withholding"],
    subject: "Taxation",
  },
  {
    title: "Gross income",
    links: ["Income tax", "Fringe benefits"],
    subject: "Taxation",
  },
  { title: "Deductions", links: ["Income tax"], subject: "Taxation" },
  { title: "Withholding", links: ["Income tax"], subject: "Taxation" },
  { title: "Fringe benefits", links: ["Gross income"], subject: "Taxation" },
  {
    title: "Value added tax",
    links: ["Input tax", "Output tax"],
    subject: "Taxation",
  },
  { title: "Input tax", links: ["Value added tax"], subject: "Taxation" },
  { title: "Output tax", links: ["Value added tax"], subject: "Taxation" },

  // A pair with no route to the rest — the graph should not pretend otherwise.
  { title: "Audit sampling", links: ["Sampling risk"], subject: "Auditing" },
  { title: "Sampling risk", links: ["Audit sampling"], subject: "Auditing" },
];

const notes: Note[] = NOTES.map((note, i) => ({
  id: `note-${i}`,
  title: note.title,
  content: note.links.map((l) => `[[${l}]]`).join(" "),
  courseTag: note.subject,
  linkedTitles: note.links.map((l) => l.toLowerCase()),
  createdAt: stamp,
  updatedAt: stamp,
}));

export default function DevGraphPage() {
  if (process.env.VERCEL_ENV === "production") notFound();

  const graph = buildGraph(notes);
  const linked = new Set(graph.edges.flatMap((e) => [e.source, e.target])).size;

  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-6 md:px-8 md:py-10">
      <header>
        <p className="text-muted-foreground text-xs font-medium tracking-widest uppercase">
          Dev reference · not real data
        </p>
        <h1 className="font-display mt-1 text-3xl font-semibold tracking-tight">
          Link graph
        </h1>
        <p className="text-muted-foreground mt-1.5 text-sm">
          {linked} notes, {graph.edges.length} links — two clusters, a few hubs,
          and one pair connected to nothing else.
        </p>
      </header>

      <div className="bg-card mt-6 overflow-hidden rounded-2xl border">
        <LinkGraph notes={notes} />
      </div>
    </main>
  );
}
