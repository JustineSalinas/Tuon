"use client";

import { Check, Globe2 } from "lucide-react";

import { useI18n } from "@/components/providers/i18n-provider";
import { STRANDS } from "@/lib/curriculum";
import { cn } from "@/lib/utils";

/**
 * The onboarding flow, shown rather than described.
 *
 * "It already knows your curriculum" is the page's strongest local claim and
 * it was being asserted in prose. This demonstrates it: the country already
 * picked, the school field mid-type with its suggestion, the four real
 * strands, and real subjects for the selected one. Four stops on one thread
 * rather than four equal cards, because they are not equal: the country
 * answer is what makes the next three possible, so it reads as the hinge
 * rather than as a fifth item fighting the other four for attention.
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

function Stop({
  index,
  label,
  hint,
  children,
}: {
  index: number;
  label: string;
  hint: string;
  children: React.ReactNode;
}) {
  return (
    <li className="relative pl-10">
      {/* The thread: a single rule running top to bottom behind every stop,
          with this stop's number sitting directly on it rather than beside
          it in its own box. One line, four names on it, not four cards. */}
      <span
        aria-hidden="true"
        className="border-border absolute top-1 left-[13px] h-full border-l"
      />
      <span
        aria-hidden="true"
        className="bg-background text-muted-foreground border-border font-display absolute top-0 left-0 grid size-[27px] place-items-center rounded-full border text-[12px] font-semibold"
      >
        {index}
      </span>

      <p className="text-sm font-medium">{label}</p>
      <div className="mt-2.5">{children}</div>
      <p className="text-muted-foreground mt-2.5 text-xs leading-relaxed">{hint}</p>
    </li>
  );
}

export function SetupFlow() {
  const { t } = useI18n();

  return (
    <div className="mt-14 border-t pt-10">
      <p className="font-medium">{t.marketing.local.setupTitle}</p>

      <ol className="mt-7 flex flex-col gap-8 lg:flex-row lg:gap-6">
        <div className="shrink-0 lg:w-[15%]">
          {/* 0 — country, resolved rather than mid-choice: the three
              questions after it only make sense once this one is answered. */}
          <li className="relative list-none pl-10">
            <span
              aria-hidden="true"
              className="border-border absolute top-1 left-[13px] h-full border-l lg:hidden"
            />
            <span
              aria-hidden="true"
              className="bg-primary text-primary-foreground font-display absolute top-0 left-0 grid size-[27px] place-items-center rounded-full text-[12px] font-semibold"
            >
              <Check className="size-3.5" strokeWidth={3} />
            </span>
            <p className="text-sm font-medium">{t.marketing.local.yourCountry}</p>
            <div className="border-primary/30 bg-primary/5 text-foreground mt-2.5 flex h-11 items-center gap-2 rounded-xl border px-3.5 text-[15px]">
              <Globe2 className="text-primary size-4 shrink-0" />
              Philippines
            </div>
          </li>
        </div>

        <div className="flex-1">
          <ol className="flex flex-col gap-8 sm:flex-row sm:gap-6">
            {/* 1 — school */}
            <Stop index={1} label={t.marketing.local.yourSchool} hint={t.marketing.local.schoolHint}>
              {/* Mid-type, with the caret, so the free-text point lands visually. */}
              <div className="border-primary bg-background flex h-11 items-center rounded-xl border px-3.5 text-[15px]">
                Batangas State
                <span className="bg-primary ml-0.5 h-[18px] w-[1.5px]" aria-hidden="true" />
              </div>
              <div className="mt-2 flex flex-col gap-1.5">
                <div className="bg-secondary rounded-[10px] px-3 py-2 text-[13px]">
                  Batangas State University
                </div>
              </div>
            </Stop>

            {/* 2 — strand */}
            <Stop index={2} label={t.marketing.local.yourStrand} hint={t.marketing.local.strandHint}>
              <div className="grid grid-cols-2 gap-1.5">
                {/* min-h rather than a fixed h, with padding and centred
                    text: "TVL — Home Economics" is the one label that wraps
                    at this width, and in a fixed 44px box it sat flush-left
                    and spilled out of its own border while every other chip
                    was centred. Four shown, not all eleven: the point is the
                    shape of the choice, not a complete catalogue. */}
                {STRANDS.slice(0, 4).map((strand, index) => (
                  <div
                    key={strand.value}
                    className={cn(
                      "grid min-h-10 place-items-center rounded-lg px-2 py-1 text-center text-[12.5px] leading-tight text-balance",
                      index === 0
                        ? "bg-primary text-primary-foreground font-medium"
                        : "border-border border",
                    )}
                  >
                    {strand.label}
                  </div>
                ))}
              </div>
            </Stop>

            {/* 3 — subjects */}
            <Stop index={3} label={t.marketing.local.yourSubjects} hint={t.marketing.local.subjectsHint}>
              <div className="flex flex-wrap gap-1.5">
                {SAMPLE_SUBJECTS.map((subject) => (
                  <span
                    key={subject.name}
                    className={
                      subject.picked
                        ? "bg-primary text-primary-foreground flex h-7 items-center rounded-full px-2.5 text-[12px] font-medium"
                        : "border-border text-muted-foreground flex h-7 items-center rounded-full border px-2.5 text-[12px]"
                    }
                  >
                    {subject.name}
                  </span>
                ))}
                <span className="border-primary/50 text-primary flex h-7 items-center rounded-full border border-dashed px-2.5 text-[12px]">
                  {t.marketing.local.addYourOwn}
                </span>
              </div>
            </Stop>
          </ol>
        </div>
      </ol>
    </div>
  );
}
