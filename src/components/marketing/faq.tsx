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
        Reviewing does. Data is not free and campus wifi is not reliable, so
        cards you already have keep working with no connection and your ratings
        sync when one comes back. Generating a new study set needs the network,
        because that part happens on a server.
      </>
    ),
  },
  {
    q: "What exactly is one study set?",
    a: <>One study set is {GENERATION_EXPLAINER}.</>,
  },
  {
    q: "How is this different from Quizlet or Anki?",
    a: (
      <>
        Anki is the better scheduler and has a reputation for being hard to
        start; Quizlet is easier to start and its free tier keeps shrinking.
        Tuón sits between them and adds the thing neither does: it knows your
        exam date, so it can answer &ldquo;will I be ready?&rdquo; rather than
        just &ldquo;what is due?&rdquo;. It also reads notes that mix English
        with Tagalog or Cebuano, which is how most students here actually write
        them.
      </>
    ),
  },
  {
    q: "Do I have to type every answer?",
    a: (
      <>
        Only on cards short enough to type, and you can turn it off in
        settings or skip it on any single card. It is on by default because
        reading the back and thinking &ldquo;yeah, I knew that&rdquo; is not the
        same as remembering it. Spelling, word order, accents and the Tagalog
        markers you might write are all forgiven — a typo never counts as
        wrong.
      </>
    ),
  },
  {
    q: "Can I study with my classmates?",
    a: (
      <>
        Yes, in invite-only groups: share a set, put a shared deadline in, and
        see who is studying right now. There is deliberately no public room and
        no directory — a lot of students here are minors, and a space strangers
        can walk into needs moderation we are not able to promise. You join a
        group because someone in it sent you a code.
      </>
    ),
  },
  {
    q: "Can I get my notes back out?",
    a: (
      <>
        Any time, as Markdown, with your{" "}
        <code className="bg-secondary rounded px-1 py-0.5 text-[13px]">[[links]]</code>{" "}
        intact — one download for the whole library. You can bring a folder of
        Markdown in the same way. Locking the exit is how apps keep people who
        want to leave, and it is not a plan.
      </>
    ),
  },
  {
    q: "What if I miss a week?",
    a: (
      <>
        Nothing breaks and nothing is lost. Cards you missed are simply still
        due, and a session is capped at a daily goal you set, so a backlog
        never arrives as a wall of 300 cards. There is a study grid on your
        dashboard that counts the days you studied, but it is a record rather
        than a threat — nothing nags you about keeping it going, and your best
        run stays on screen even after a gap.
      </>
    ),
  },
  {
    q: "Can I use it on my phone?",
    a: (
      <>
        Yes — it is a website, so there is nothing to install, and you can add
        it to your home screen if you want it to open like an app. Reviewing is
        built thumb-first, because most of it happens on a phone between
        classes.
      </>
    ),
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
