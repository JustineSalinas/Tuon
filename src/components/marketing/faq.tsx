"use client";

import { useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "motion/react";
import { ChevronDown } from "lucide-react";

import { GENERATION_EXPLAINER, PLANS } from "@/lib/ai/config";
import { cn } from "@/lib/utils";

/**
 * The questions a student actually has before signing up.
 *
 * Written to answer them, not to reassure. Where the honest answer is a
 * limitation — offline, AI mistakes — it says so; a FAQ that only says yes is
 * marketing copy with a chevron on it, and students spot that immediately.
 */
const QUESTIONS: { q: string; a: React.ReactNode }[] = [
  {
    q: "Is it really free?",
    a: (
      <>
        Yes, and the free plan is not a trial. You get{" "}
        {PLANS.free.monthlyGenerations} AI study sets a month, forever. Writing
        notes, importing PDFs, making your own flashcards, and the whole review
        schedule are unlimited on every plan — the only thing that costs money
        is the AI turning a note into cards, because that is the only thing that
        costs us money.
      </>
    ),
  },
  {
    q: "What happens when I hit the monthly cap?",
    a: (
      <>
        Generation pauses until the 1st. Nothing else changes: every note, card,
        and review you already have keeps working, and the schedule carries on.
        You can still write your own flashcards without limit.
      </>
    ),
  },
  {
    q: "Who can see my notes?",
    a: (
      <>
        Only you. Sharing is off by default and per study set — turn it on and
        anyone with that link can see those cards; turn it off and access stops
        immediately. Your notes and review history are never shared.{" "}
        <Link href="/privacy" className="text-primary underline underline-offset-4">
          The privacy notice
        </Link>{" "}
        spells out exactly what we hold and who processes it.
      </>
    ),
  },
  {
    q: "Does my note get sent to an AI company?",
    a: (
      <>
        The text of a note is sent to Anthropic when — and only when — you press
        Generate. Your name, email, and review history are not. Nothing is sent
        while you are just writing or reviewing, and PDFs are read in your
        browser and never uploaded.
      </>
    ),
  },
  {
    q: "Are the flashcards ever wrong?",
    a: (
      <>
        Sometimes, yes. The AI works only from your note, so if the note has an
        error the cards will repeat it — and like any AI it can occasionally be
        confidently wrong on its own. Check anything that matters against your
        textbook. It is a study aid, not a source of truth.
      </>
    ),
  },
  {
    q: "Can I use it for UPCAT or board review?",
    a: (
      <>
        That is what spaced repetition is best at. Entrance-exam subjects are
        built into setup alongside your strand, and the schedule is designed for
        material you need to hold for months rather than until Friday.
      </>
    ),
  },
  {
    q: "Does it work offline?",
    a: (
      <>
        Not yet, and it should — data is not free and campus wifi is not
        reliable. Reviewing offline with a sync on reconnect is the next thing
        on the list after launch. Today you need a connection.
      </>
    ),
  },
  {
    q: "What exactly is one study set?",
    a: <>One study set is {GENERATION_EXPLAINER}.</>,
  },
];

export function Faq() {
  const [open, setOpen] = useState<number | null>(0);

  return (
    <div className="mx-auto mt-12 max-w-2xl divide-y rounded-2xl border">
      {QUESTIONS.map((item, index) => {
        const expanded = open === index;
        return (
          <div key={item.q}>
            <button
              type="button"
              onClick={() => setOpen(expanded ? null : index)}
              aria-expanded={expanded}
              className="hover:bg-accent/30 focus-visible:ring-ring flex w-full items-center gap-4 px-5 py-4 text-left transition-colors focus-visible:ring-[3px] focus-visible:outline-none"
            >
              <span className="flex-1 font-medium">{item.q}</span>
              <ChevronDown
                className={cn(
                  "text-muted-foreground size-4 shrink-0 transition-transform duration-200",
                  expanded && "rotate-180",
                )}
              />
            </button>

            <AnimatePresence initial={false}>
              {expanded ? (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
                  className="overflow-hidden"
                >
                  <p className="text-muted-foreground px-5 pb-4 text-sm leading-relaxed">
                    {item.a}
                  </p>
                </motion.div>
              ) : null}
            </AnimatePresence>
          </div>
        );
      })}
    </div>
  );
}
