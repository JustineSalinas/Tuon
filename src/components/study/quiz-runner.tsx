"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "motion/react";
import {
  addDoc,
  collection,
  doc,
  serverTimestamp,
  setDoc,
  Timestamp,
} from "firebase/firestore";
import { ArrowRight, Check, Loader2, RotateCcw, X } from "lucide-react";

import { db } from "@/lib/firebase/client";
import { useAuth } from "@/components/providers/auth-provider";
import { useI18n } from "@/components/providers/i18n-provider";
import type { Messages } from "@/lib/i18n/en";
import { useQuizQuestions, useReviewLogs, useStudySet } from "@/lib/hooks/use-firestore";
import { initialSrsState, parseExamDate, scheduleNextReview } from "@/lib/srs/sm2";
import { collapseQuizAnswers } from "@/lib/srs/from-quiz";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

const CHOICE_LETTERS = ["A", "B", "C", "D", "E", "F"];

export function QuizRunner({ studySetId }: { studySetId: string }) {
  const { user, profile } = useAuth();
  const { t } = useI18n();
  const { data: studySet } = useStudySet(user?.uid, studySetId);
  const { data: questions, loading } = useQuizQuestions(user?.uid, studySetId);
  // Needed to schedule FROM each card's current state rather than from scratch.
  const { byFlashcardId } = useReviewLogs(user?.uid);

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
          studySetTitle: studySet?.title ?? t.quiz.title,
          score: finalScore,
          total: questions.length,
          completedAt: serverTimestamp(),
        });
      } catch {
        // Non-critical.
      }

      // Feed the result back into the schedule. Questions generated before
      // they carried a card link have no `flashcardId`, so those sets keep
      // behaving exactly as they did — the quiz still works, it just teaches
      // the scheduler nothing.
      const graded = questions
        .map((q, i) => ({
          flashcardId: q.flashcardId ?? "",
          correct: answers[i] === q.correctIndex,
        }))
        .filter((a) => a.flashcardId);

      const examDate = parseExamDate(profile?.examDate);
      const now = new Date();

      await Promise.all(
        [...collapseQuizAnswers(graded)].map(async ([flashcardId, rating]) => {
          const log = byFlashcardId.get(flashcardId);
          const state = log
            ? {
                easeFactor: log.easeFactor,
                intervalDays: log.intervalDays,
                repetitions: log.repetitions ?? 0,
              }
            : initialSrsState();

          const next = scheduleNextReview(state, rating, now, examDate);
          try {
            await setDoc(
              doc(db, "users", user.uid, "reviewLogs", flashcardId),
              {
                flashcardId,
                studySetId,
                easeFactor: next.easeFactor,
                intervalDays: next.intervalDays,
                repetitions: next.repetitions,
                nextReviewAt: Timestamp.fromDate(next.nextReviewAt),
                lastReviewedAt: serverTimestamp(),
                lastRating: rating,
              },
              { merge: true },
            );
          } catch {
            // A schedule that failed to save is not worth blocking the score
            // screen for; the card simply stays where it was.
          }
        }),
      );

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
            {t.quiz.noneYet}
          </h1>
          <p className="text-muted-foreground mt-2 text-sm">
            {t.quiz.noneYetHint}
          </p>
          <Button className="mt-6" render={<Link href={`/app/sets/${studySetId}`} />}>
            {t.quiz.backToSet}
          </Button>
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
        t={t}
      />
    );
  }

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="flex items-center gap-4 px-4 py-3 md:px-6">
        <Button
          variant="ghost"
          size="icon"
          aria-label={t.quiz.exit}
          render={<Link href={`/app/sets/${studySetId}`} />}
        >
            <X />
          </Button>
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-medium">{studySet?.title ?? t.quiz.title}</div>
          <Progress value={(index / questions.length) * 100} className="mt-1.5 h-1" />
        </div>
        <span className="text-muted-foreground shrink-0 text-sm tabular-nums">
          {t.quiz.progress(index + 1, questions.length)}
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
                      {/* The tick and cross are the only signal that an answer
                          was right or wrong, and an icon carries nothing to a
                          screen reader — it would announce "FOR loop, disabled"
                          either way. Say it in words. */}
                      {reveal && isCorrect ? (
                        <span className="sr-only">{t.quiz.correctAnswer}</span>
                      ) : reveal && isPicked ? (
                        <span className="sr-only">{t.quiz.yourAnswerWrong}</span>
                      ) : null}
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
                  {isLast ? t.quiz.seeResults : t.quiz.nextQuestion}
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
  t,
}: {
  studySetId: string;
  questions: { id: string; question: string; choices: string[]; correctIndex: number }[];
  answers: (number | null)[];
  score: number;
  saving: boolean;
  onRestart: () => void;
  t: Messages;
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
        <div className="text-muted-foreground text-sm">{verdict(percent, t)}</div>
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
            {t.quiz.worthAnotherLook}
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
          {t.quiz.perfect}
        </p>
      )}

      <div className="mt-10 flex flex-col gap-2 sm:flex-row-reverse">
        <Button className="flex-1" render={<Link href={`/app/sets/${studySetId}/review`} />}>
          {t.quiz.reviewFlashcards}
        </Button>
        <Button variant="outline" className="flex-1" onClick={onRestart}>
          <RotateCcw />
          {t.quiz.retake}
        </Button>
        <Button variant="ghost" className="flex-1" render={<Link href={`/app/sets/${studySetId}`} />}>
          {t.quiz.backToSet}
        </Button>
      </div>

      {saving ? (
        <p className="text-muted-foreground mt-4 text-center text-xs">
          {t.quiz.savingResult}
        </p>
      ) : null}
    </div>
  );
}

function verdict(percent: number, t: Messages): string {
  if (percent === 100) return t.quiz.flawless;
  if (percent >= 80) return t.quiz.solid;
  if (percent >= 60) return t.quiz.gettingThere;
  if (percent >= 40) return t.quiz.needsAnotherPass;
  return t.quiz.worthRestudying;
}
