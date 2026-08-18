"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "motion/react";
import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { ArrowRight, Check, Loader2, RotateCcw, X } from "lucide-react";

import { db } from "@/lib/firebase/client";
import { useAuth } from "@/components/providers/auth-provider";
import { useQuizQuestions, useStudySet } from "@/lib/hooks/use-firestore";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

const CHOICE_LETTERS = ["A", "B", "C", "D", "E", "F"];

export function QuizRunner({ studySetId }: { studySetId: string }) {
  const { user } = useAuth();
  const { data: studySet } = useStudySet(user?.uid, studySetId);
  const { data: questions, loading } = useQuizQuestions(user?.uid, studySetId);

  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<(number | null)[]>([]);
  const [selected, setSelected] = useState<number | null>(null);
  const [finished, setFinished] = useState(false);
  const [savingAttempt, setSavingAttempt] = useState(false);

  const current = questions[index];
  const answered = selected !== null;
  const isLast = index === questions.length - 1;

  const score = useMemo(
    () =>
      answers.reduce<number>(
        (total, answer, i) => total + (answer === questions[i]?.correctIndex ? 1 : 0),
        0,
      ),
    [answers, questions],
  );

  function handleSelect(choiceIndex: number) {
    if (answered) return;
    setSelected(choiceIndex);
    setAnswers((prev) => {
      const next = [...prev];
      next[index] = choiceIndex;
      return next;
    });
  }

  async function handleNext() {
    if (!isLast) {
      setIndex((i) => i + 1);
      setSelected(null);
      return;
    }

    setFinished(true);

    // Record the attempt. A failure here should not block the score screen.
    if (user) {
      setSavingAttempt(true);
      const finalScore = answers.reduce<number>(
        (total, answer, i) => total + (answer === questions[i]?.correctIndex ? 1 : 0),
        0,
      );
      try {
        await addDoc(collection(db, "users", user.uid, "quizAttempts"), {
          studySetId,
          studySetTitle: studySet?.title ?? "Quiz",
          score: finalScore,
          total: questions.length,
          completedAt: serverTimestamp(),
        });
      } catch {
        // Non-critical.
      }
      setSavingAttempt(false);
    }
  }

  function restart() {
    setIndex(0);
    setAnswers([]);
    setSelected(null);
    setFinished(false);
  }

  if (loading) {
    return (
      <div className="grid min-h-dvh place-items-center">
        <Loader2 className="text-muted-foreground size-6 animate-spin" />
      </div>
    );
  }

  if (questions.length === 0) {
    return (
      <div className="grid min-h-dvh place-items-center px-6 text-center">
        <div className="max-w-sm">
          <h1 className="font-display text-2xl font-semibold tracking-tight">
            No quiz yet
          </h1>
          <p className="text-muted-foreground mt-2 text-sm">
            This study set does not have any quiz questions.
          </p>
          <Button className="mt-6" render={<Link href={`/app/sets/${studySetId}`} />}>Back to set</Button>
        </div>
      </div>
    );
  }

  if (finished) {
    return (
      <QuizResults
        studySetId={studySetId}
        questions={questions}
        answers={answers}
        score={score}
        saving={savingAttempt}
        onRestart={restart}
      />
    );
  }

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="flex items-center gap-4 px-4 py-3 md:px-6">
        <Button variant="ghost" size="icon" aria-label="Exit quiz" render={<Link href={`/app/sets/${studySetId}`} />}>
            <X />
          </Button>
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-medium">{studySet?.title ?? "Quiz"}</div>
          <Progress value={(index / questions.length) * 100} className="mt-1.5 h-1" />
        </div>
        <span className="text-muted-foreground shrink-0 text-sm tabular-nums">
          {index + 1} / {questions.length}
        </span>
      </header>

      <div className="flex flex-1 flex-col justify-center px-4 py-6 md:px-6">
        <div className="mx-auto w-full max-w-2xl">
          <AnimatePresence mode="wait">
            <motion.div
              key={current.id}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
            >
              <h1 className="font-display text-2xl leading-snug font-medium text-balance md:text-3xl">
                {current.question}
              </h1>

              <div className="mt-8 grid gap-2.5">
                {current.choices.map((choice, choiceIndex) => {
                  const isCorrect = choiceIndex === current.correctIndex;
                  const isPicked = selected === choiceIndex;
                  const reveal = answered;

                  return (
                    <button
                      key={choiceIndex}
                      type="button"
                      onClick={() => handleSelect(choiceIndex)}
                      disabled={answered}
                      className={cn(
                        "bg-card flex items-start gap-3 rounded-xl border p-4 text-left transition-all",
                        "focus-visible:ring-ring focus-visible:ring-[3px] focus-visible:outline-none",
                        !reveal && "hover:border-primary/50 hover:bg-accent/40",
                        reveal && isCorrect && "border-success bg-success/10",
                        reveal && isPicked && !isCorrect && "border-destructive bg-destructive/10",
                        reveal && !isCorrect && !isPicked && "opacity-55",
                      )}
                    >
                      <span
                        className={cn(
                          "grid size-6 shrink-0 place-items-center rounded-full border text-xs font-medium",
                          reveal && isCorrect && "border-success bg-success text-success-foreground",
                          reveal &&
                            isPicked &&
                            !isCorrect &&
                            "border-destructive bg-destructive text-white",
                        )}
                      >
                        {reveal && isCorrect ? (
                          <Check className="size-3.5" strokeWidth={3} />
                        ) : reveal && isPicked ? (
                          <X className="size-3.5" strokeWidth={3} />
                        ) : (
                          CHOICE_LETTERS[choiceIndex]
                        )}
                      </span>
                      <span className="pt-0.5 leading-relaxed">{choice}</span>
                    </button>
                  );
                })}
              </div>
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      <div className="px-4 pb-[max(1rem,env(safe-area-inset-bottom))] md:px-6 md:pb-6">
        <div className="mx-auto max-w-2xl">
          <AnimatePresence>
            {answered ? (
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2 }}
              >
                <Button size="lg" className="w-full" onClick={handleNext}>
                  {isLast ? "See results" : "Next question"}
                  <ArrowRight />
                </Button>
              </motion.div>
            ) : null}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}

function QuizResults({
  studySetId,
  questions,
  answers,
  score,
  saving,
  onRestart,
}: {
  studySetId: string;
  questions: { id: string; question: string; choices: string[]; correctIndex: number }[];
  answers: (number | null)[];
  score: number;
  saving: boolean;
  onRestart: () => void;
}) {
  const total = questions.length;
  const percent = Math.round((score / total) * 100);
  const missed = questions.filter((q, i) => answers[i] !== q.correctIndex);

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-8 md:px-6 md:py-12">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
        className="text-center"
      >
        <div className="text-muted-foreground text-sm">{verdict(percent)}</div>
        <div className="font-display mt-2 text-5xl font-semibold tracking-tight tabular-nums">
          {score}
          <span className="text-muted-foreground text-3xl">/{total}</span>
        </div>
        <div className="text-muted-foreground mt-1 text-sm tabular-nums">{percent}%</div>

        <Progress value={percent} className="mx-auto mt-6 h-2 max-w-xs" />
      </motion.div>

      {missed.length > 0 ? (
        <section className="mt-10">
          <h2 className="font-display text-lg font-semibold tracking-tight">
            Worth another look
          </h2>
          <div className="mt-4 space-y-3">
            {missed.map((question) => {
              const picked = answers[questions.indexOf(question)];
              return (
                <div key={question.id} className="rounded-xl border p-4">
                  <p className="font-medium">{question.question}</p>
                  {picked !== null && picked !== undefined ? (
                    <p className="text-destructive mt-2.5 flex items-start gap-2 text-sm">
                      <X className="mt-0.5 size-3.5 shrink-0" strokeWidth={3} />
                      <span>{question.choices[picked]}</span>
                    </p>
                  ) : null}
                  <p className="text-success mt-1.5 flex items-start gap-2 text-sm">
                    <Check className="mt-0.5 size-3.5 shrink-0" strokeWidth={3} />
                    <span>{question.choices[question.correctIndex]}</span>
                  </p>
                </div>
              );
            })}
          </div>
        </section>
      ) : (
        <p className="text-success mt-10 text-center text-sm font-medium">
          Perfect score. Every question correct.
        </p>
      )}

      <div className="mt-10 flex flex-col gap-2 sm:flex-row-reverse">
        <Button className="flex-1" render={<Link href={`/app/sets/${studySetId}/review`} />}>Review the flashcards</Button>
        <Button variant="outline" className="flex-1" onClick={onRestart}>
          <RotateCcw />
          Retake quiz
        </Button>
        <Button variant="ghost" className="flex-1" render={<Link href={`/app/sets/${studySetId}`} />}>Back to set</Button>
      </div>

      {saving ? (
        <p className="text-muted-foreground mt-4 text-center text-xs">Saving result…</p>
      ) : null}
    </div>
  );
}

function verdict(percent: number): string {
  if (percent === 100) return "Flawless";
  if (percent >= 80) return "Solid";
  if (percent >= 60) return "Getting there";
  if (percent >= 40) return "Needs another pass";
  return "Worth restudying the note";
}
