"use client";

import { useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { ArrowRight, Check, FileText, RotateCcw, Sparkles, X } from "lucide-react";

import { useI18n } from "@/components/providers/i18n-provider";
import type { Messages } from "@/lib/i18n/en";
import { AnimatedMark } from "@/components/brand/animated-mark";
import { PaperCreature } from "@/components/brand/paper-creature";
import {
  SAMPLE_FLASHCARDS,
  SAMPLE_NOTE,
  SAMPLE_QUESTION,
} from "@/lib/marketing/sample-set";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type Phase = "note" | "generating" | "cards" | "quiz";

/**
 * The product, before signup.
 *
 * A price-sensitive student will not create an account on faith, and a
 * screenshot cannot show what a flashcard feels like to flip. This runs the
 * real interaction on a real generated set — the cards below are genuine
 * output from the production prompt, shipped statically so a curious visitor
 * costs nothing and the endpoint is not exposed.
 *
 * The "generating" step is a staged three seconds, and it says so. Faking a
 * wait to look busy would be dishonest; showing the actual shape of the wait
 * (about twelve seconds in the app) is the useful part.
 */
export function TryIt() {
  const { t } = useI18n();
  const [phase, setPhase] = useState<Phase>("note");
  const reduceMotion = useReducedMotion();

  function generate() {
    setPhase("generating");
    window.setTimeout(() => setPhase("cards"), reduceMotion ? 400 : 2600);
  }

  return (
    <div className="bg-card mx-auto mt-12 w-full max-w-2xl overflow-hidden rounded-2xl border shadow-sm">
      <div className="flex items-center gap-2 border-b px-4 py-2.5">
        <FileText className="text-muted-foreground size-3.5" />
        <span className="truncate text-sm font-medium">{SAMPLE_NOTE.title}</span>
        <Badge variant="secondary" className="ml-auto shrink-0 text-xs">
          {SAMPLE_NOTE.courseTag}
        </Badge>
      </div>

      <div className="p-5 sm:p-6">
        <AnimatePresence mode="wait">
          {phase === "note" ? (
            <Step key="note">
              <pre className="text-muted-foreground max-h-56 overflow-y-auto text-left font-sans text-[13px] leading-relaxed whitespace-pre-wrap">
                {SAMPLE_NOTE.excerpt}
              </pre>
              <Button className="mt-5 w-full" size="lg" onClick={generate}>
                <Sparkles />
                {t.demo.generate}
              </Button>
              <p className="text-muted-foreground mt-2.5 text-center text-xs">
                {t.demo.noAccount}
              </p>
            </Step>
          ) : phase === "generating" ? (
            <Step key="generating">
              <div className="grid place-items-center py-14">
                <AnimatedMark motion="focusing" className="text-primary size-10" />
                <p className="mt-5 text-sm font-medium">{t.demo.reading}</p>
                <p className="text-muted-foreground mt-1.5 max-w-xs text-center text-xs leading-relaxed">
                  {t.demo.staged}
                </p>
              </div>
            </Step>
          ) : phase === "cards" ? (
            <Step key="cards">
              <CardDeck onFinish={() => setPhase("quiz")} t={t} />
            </Step>
          ) : (
            <Step key="quiz">
              <QuizPreview onRestart={() => setPhase("note")} t={t} />
            </Step>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

// `key` stays on the JSX element for AnimatePresence; it is never a prop.
function Step({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.div>
  );
}

function CardDeck({ onFinish, t }: { onFinish: () => void; t: Messages }) {
  const reduceMotion = useReducedMotion();
  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);

  const card = SAMPLE_FLASHCARDS[index];
  const last = index === SAMPLE_FLASHCARDS.length - 1;

  function next() {
    if (last) {
      onFinish();
      return;
    }
    setFlipped(false);
    setIndex((i) => i + 1);
  }

  return (
    <div>
      <div className="text-muted-foreground flex items-center justify-between text-xs">
        <span className="flex items-center gap-1.5">
          <Check className="text-primary size-3.5" strokeWidth={3} />
          {t.demo.cardsAndQuiz(SAMPLE_FLASHCARDS.length)}
        </span>
        <span className="tabular-nums">
          {t.demo.progress(index + 1, SAMPLE_FLASHCARDS.length)}
        </span>
      </div>

      <div className="mt-3" style={{ perspective: 1200 }}>
        <motion.button
          type="button"
          onClick={() => setFlipped((f) => !f)}
          className="relative block w-full cursor-pointer text-left"
          style={{ transformStyle: "preserve-3d" }}
          animate={{ rotateY: flipped && !reduceMotion ? 180 : 0 }}
          transition={{ duration: 0.42, ease: [0.22, 1, 0.36, 1] }}
          aria-label={flipped ? t.demo.showQuestion : t.demo.showAnswer}
        >
          <Face>
            <Label>{t.demo.question}</Label>
            <p className="font-display mt-3 text-lg leading-snug font-medium text-balance">
              {card.front}
            </p>
            <p className="text-muted-foreground mt-5 text-xs">{t.demo.tapToReveal}</p>
          </Face>
          <Face
            className="absolute inset-0"
            style={{ transform: reduceMotion ? undefined : "rotateY(180deg)" }}
          >
            <Label>{t.demo.answer}</Label>
            <p className="mt-3 leading-relaxed">{card.back}</p>
            {reduceMotion ? null : (
              <p className="text-muted-foreground mt-5 text-xs">{t.demo.tapToFlipBack}</p>
            )}
          </Face>
        </motion.button>
      </div>

      <Button variant="outline" className="mt-4 w-full" onClick={next}>
        {last ? t.demo.seeTheQuiz : t.demo.nextCard}
        <ArrowRight />
      </Button>
    </div>
  );
}

function QuizPreview({ onRestart, t }: { onRestart: () => void; t: Messages }) {
  const [picked, setPicked] = useState<number | null>(null);
  const correct = picked === SAMPLE_QUESTION.correctIndex;

  return (
    <div>
      <Label>{t.demo.practiceQuiz}</Label>
      <p className="font-display mt-3 text-lg leading-snug font-medium text-balance">
        {SAMPLE_QUESTION.question}
      </p>

      <div className="mt-4 grid gap-2">
        {SAMPLE_QUESTION.choices.map((choice, i) => {
          const isAnswer = i === SAMPLE_QUESTION.correctIndex;
          const chosen = picked === i;
          const revealed = picked !== null;

          return (
            <button
              key={choice}
              type="button"
              disabled={revealed}
              onClick={() => setPicked(i)}
              className={cn(
                "flex items-center gap-2.5 rounded-xl border px-4 py-3 text-left text-sm transition-colors",
                "focus-visible:ring-ring focus-visible:ring-[3px] focus-visible:outline-none",
                !revealed && "hover:border-primary/50 hover:bg-accent/30",
                revealed && isAnswer && "border-success bg-success/10",
                revealed && chosen && !isAnswer && "border-destructive bg-destructive/10",
                revealed && !isAnswer && !chosen && "opacity-55",
              )}
            >
              {revealed && isAnswer ? (
                <Check className="text-success size-4 shrink-0" strokeWidth={3} />
              ) : revealed && chosen ? (
                <X className="text-destructive size-4 shrink-0" strokeWidth={3} />
              ) : (
                <span className="text-muted-foreground w-4 shrink-0 text-xs font-medium">
                  {String.fromCharCode(65 + i)}
                </span>
              )}
              <span>{choice}</span>
            </button>
          );
        })}
      </div>

      <AnimatePresence>
        {picked !== null ? (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            transition={{ duration: 0.25 }}
            className="overflow-hidden"
          >
            <div className="mt-4 flex gap-3 rounded-xl border p-4">
              <PaperCreature
                state={correct ? "correct" : "wrong"}
                studying
                className="size-12 shrink-0"
              />
              <p className="text-muted-foreground text-sm leading-relaxed">
                {SAMPLE_QUESTION.explanation}
              </p>
            </div>

            <div className="mt-4 flex flex-col gap-2 sm:flex-row">
              <Button className="flex-1" size="lg" render={<Link href="/signup" />}>
                {t.demo.tryYourOwn}
              </Button>
              <Button variant="ghost" onClick={onRestart}>
                <RotateCcw />
                {t.demo.startOver}
              </Button>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}

function Face({
  children,
  className,
  style,
}: {
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}) {
  return (
    <div
      className={cn(
        "bg-background flex min-h-40 w-full flex-col justify-center rounded-xl border p-5",
        className,
      )}
      style={{ backfaceVisibility: "hidden", ...style }}
    >
      {children}
    </div>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return (
    <span className="text-muted-foreground text-xs font-medium tracking-widest uppercase">
      {children}
    </span>
  );
}
