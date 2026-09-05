import { notFound } from "next/navigation";

import { RetentionFixture } from "./fixture";

/**
 * Retention, drawn from a fixture.
 *
 * The real screen needs an account, a paid plan and months of review history
 * before it renders anything — three conditions that made the most chart-dense
 * page in the product effectively impossible to look at.
 *
 * A reference, not a test: nothing here proves the numbers are right, only
 * that the thing is legible when they are.
 */
export const metadata = {
  title: "Retention — dev reference",
  robots: { index: false, follow: false },
};

export default function DevRetentionPage() {
  if (process.env.VERCEL_ENV === "production") notFound();

  return (
    <main className="mx-auto w-full max-w-4xl px-4 py-6 md:px-8 md:py-10">
      <header>
        <p className="text-muted-foreground text-xs font-medium tracking-widest uppercase">
          Dev reference · not real data
        </p>
        <h1 className="font-display mt-1 text-3xl font-semibold tracking-tight">
          Retention
        </h1>
        <p className="text-muted-foreground mt-1.5 text-sm">
          70 fixture cards across four subjects, spanning every maturity stage
          and both sides of the at-risk line.
        </p>
      </header>

      <RetentionFixture />
    </main>
  );
}
