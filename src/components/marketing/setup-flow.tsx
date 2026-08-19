"use client";

import { STRANDS } from "@/lib/curriculum";

/**
 * The onboarding flow, shown rather than described.
 *
 * "It already knows your curriculum" is the page's strongest local claim and
 * it was being asserted in prose. This demonstrates it: the school field
 * mid-type with its suggestion, the four real strands, and real subjects for
 * the selected one — the same three questions the wizard actually asks.
 *
 * The strand list comes from `curriculum.ts` rather than a copy, so the page
 * cannot drift from the product.
 */

const SAMPLE_SUBJECTS = [
  { name: "General Biology 1", picked: true },
  { name: "General Chemistry 1", picked: true },
  { name: "Pre-Calculus", picked: false },
  { name: "Earth and Life Science", picked: false },
];

export function SetupFlow() {
  return (
    <div className="mt-14 border-t pt-10">
      <p className="font-medium">Three questions and you are studying.</p>

      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        {/* 1 — school */}
        <div className="border-border bg-card rounded-2xl border p-5">
          <div className="flex items-center gap-2.5">
            <span className="font-display text-primary text-[13px] font-semibold">01</span>
            <span className="text-muted-foreground text-[13px] font-medium">
              Your school
            </span>
          </div>

          {/* Mid-type, with the caret, so the free-text point lands visually. */}
          <div className="border-primary bg-background mt-3.5 flex h-11 items-center rounded-xl border px-3.5 text-[15px]">
            Batangas State
            <span className="bg-primary ml-0.5 h-[18px] w-[1.5px]" aria-hidden="true" />
          </div>

          <div className="mt-2 flex flex-col gap-1.5">
            <div className="bg-secondary rounded-[10px] px-3 py-2 text-[13px]">
              Batangas State University
            </div>
            <div className="text-muted-foreground rounded-[10px] px-3 py-2 text-[13px]">
              Batangas State University – JPLPC
            </div>
          </div>

          <p className="text-muted-foreground mt-3 text-xs leading-relaxed">
            Type anything — your school does not have to be on a list.
          </p>
        </div>

        {/* 2 — strand */}
        <div className="border-border bg-card rounded-2xl border p-5">
          <div className="flex items-center gap-2.5">
            <span className="font-display text-primary text-[13px] font-semibold">02</span>
            <span className="text-muted-foreground text-[13px] font-medium">
              Your strand
            </span>
          </div>

          <div className="mt-3.5 grid grid-cols-2 gap-2">
            {STRANDS.map((strand, index) => (
              <div
                key={strand.value}
                className={
                  index === 0
                    ? "bg-primary text-primary-foreground grid h-11 place-items-center rounded-xl text-[13.5px] font-medium"
                    : "border-border grid h-11 place-items-center rounded-xl border text-[13.5px]"
                }
              >
                {strand.label}
              </div>
            ))}
          </div>

          <p className="text-muted-foreground mt-3 text-xs leading-relaxed">
            College instead? You pick a degree program here.
          </p>
        </div>

        {/* 3 — subjects */}
        <div className="border-border bg-card rounded-2xl border p-5">
          <div className="flex items-center gap-2.5">
            <span className="font-display text-primary text-[13px] font-semibold">03</span>
            <span className="text-muted-foreground text-[13px] font-medium">
              Your subjects
            </span>
          </div>

          <div className="mt-3.5 flex flex-wrap gap-1.5">
            {SAMPLE_SUBJECTS.map((subject) => (
              <span
                key={subject.name}
                className={
                  subject.picked
                    ? "bg-primary text-primary-foreground flex h-8 items-center rounded-full px-3 text-[12.5px] font-medium"
                    : "border-border text-muted-foreground flex h-8 items-center rounded-full border px-3 text-[12.5px]"
                }
              >
                {subject.name}
              </span>
            ))}
            <span className="border-primary/50 text-primary flex h-8 items-center rounded-full border border-dashed px-3 text-[12.5px]">
              + Add your own
            </span>
          </div>

          <p className="text-muted-foreground mt-3 text-xs leading-relaxed">
            Every note and set is tagged with one, so nothing gets mixed up.
          </p>
        </div>
      </div>
    </div>
  );
}
