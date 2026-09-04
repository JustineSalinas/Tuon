"use client";

/**
 * Test mode.
 *
 * An exam rehearsal: timed, mixed-format, and drawn from the material the
 * scheduler says is weakest rather than a fixed five questions in a fixed
 * order. The results feed SM-2 exactly as a review does, so sitting a test is
 * real scheduling work and not a score you forget.
 *
 * The clock is read from the start instant, never accumulated from ticks —
 * a test that pauses when you switch tabs is not testing anything.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
import { ArrowRight, Check, Clock, Loader2, RotateCcw, X } from "lucide-react";

import { db } from "@/lib/firebase/client";
import { useAuth } from "@/components/providers/auth-provider";
import { useI18n } from "@/components/providers/i18n-provider";
import type { Messages } from "@/lib/i18n/en";
import {
  useFlashcards,
  useQuizQuestions,
  useReviewLogs,
  useStudySet,
} from "@/lib/hooks/use-firestore";
import { usePreferences } from "@/lib/hooks/use-preferences";
import { dayKey } from "@/lib/hooks/use-review-cards";
import { initialSrsState, parseExamDate, scheduleNextReview } from "@/lib/srs/sm2";
import { collapseQuizAnswers } from "@/lib/srs/from-quiz";
import { gradeAnswer } from "@/lib/study/answer-match";
import {
  DEFAULT_TEST_LENGTH,
  SECONDS_PER_ITEM,
  type TestItem,
  buildTest,
  formatClock,
  remainingMs,
  scoreTest,
} from "@/lib/study/test-mode";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { PaperCreature } from "@/components/brand/paper-creature";
import { cn } from "@/lib/utils";

const CHOICE_LETTERS = ["A", "B", "C", "D", "E", "F"];
const REDRAW_MS = 500;

interface Answered {
  flashcardId: string;
  correct: boolean;
  /** What the student put, for the review at the end. */
  given: string;
}

export function TestRunner({ studySetId }: { studySetId: string }) {
  const { user, profile } = useAuth();
  const { t } = useI18n();
  const { data: studySet } = useStudySet(user?.uid, studySetId);
  const { data: cards, loading: cardsLoading } = useFlashcards(user?.uid, studySetId);
  const { data: questions, loading: questionsLoading } = useQuizQuestions(user?.uid, studySetId);
  const { byFlashcardId } = useReviewLogs(user?.uid);
  const { timeZone } = usePreferences();

  const loading = cardsLoading || questionsLoading;

  // One seed per sitting, so the test is stable across a reload but a retake
  // is a different draw.
  const [seed, setSeed] = useState(() => Math.floor(Math.random() * 100000) + 1);
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [index, setIndex] = useState(0);
  const [typed, setTyped] = useState("");
  const [picked, setPicked] = useState<number | null>(null);
  const [answers, setAnswers] = useState<Answered[]>([]);
  const [finished, setFinished] = useState(false);
  const [saving, setSaving] = useState(false);
  const [now, setNow] = useState(() => Date.now());

  const draft = useMemo(
    () =>
      buildTest({
        cards,
        questions,
        logs: byFlashcardId,
        length: DEFAULT_TEST_LENGTH,
        seed,
      }),
    [cards, questions, byFlashcardId, seed],
  );

  /**
   * The paper, fixed at the moment the student starts.
   *
   * `draft` depends on the review logs, and finishing the test WRITES review
   * logs — so leaving it live meant the question list was rebuilt underneath
   * the answers, and the results screen paired each answer with whatever
   * question had moved into that position. Found by sitting a test and reading
   * the review list, which showed the right answer against the wrong card.
   *
   * It is also just what a test is: the paper does not change once it starts.
   */
  const [paper, setPaper] = useState<TestItem[] | null>(null);
  const items = paper ?? draft;

  const running = startedAt !== null && !finished;
  const left = startedAt === null ? testLength(items.length) : remainingMs(startedAt, items.length, now);

  useEffect(() => {
    if (!running) return;
    const id = window.setInterval(() => setNow(Date.now()), REDRAW_MS);
    return () => window.clearInterval(id);
  }, [running]);

  const current = items[index] ?? null;

  /**
   * Writes the scheduling consequences, then the attempt.
   *
   * Identical treatment to the quiz: one review per card, a miss wins over a
   * hit, and a correct multiple-choice answer rates "hard" rather than "good"
   * because recognising is easier than producing. A typed answer is graded by
   * the same lenient matcher review uses.
   */
  const finish = useCallback(
    async (final: Answered[]) => {
      setFinished(true);
      if (!user) return;
      setSaving(true);

      const score = scoreTest(final, items.length);
      const examDate = parseExamDate(profile?.examDate);
      const when = new Date();

      try {
        await addDoc(collection(db, "users", user.uid, "quizAttempts"), {
          studySetId,
          studySetTitle: studySet?.title ?? t.test.title,
          score: score.correct,
          total: score.total,
          completedAt: serverTimestamp(),
        });
      } catch {
        // The score on screen is the useful part; a lost attempt record is not
        // worth blocking it for.
      }

      // A test is real study time, and logging it is what stops the week view
      // disagreeing with what the student actually did.
      const minutes = Math.round(
        Math.min(testLength(items.length), Date.now() - (startedAt ?? Date.now())) / 60000,
      );
      if (minutes > 0) {
        try {
          await addDoc(collection(db, "users", user.uid, "studySessions"), {
            source: "review",
            day: dayKey(when, timeZone),
            minutes,
            courseTag: studySet?.courseTag ?? null,
            cardsReviewed: final.length,
            startedAt: serverTimestamp(),
            createdAt: serverTimestamp(),
          });
        } catch {
          // Same reasoning.
        }
      }

      const ratings = collapseQuizAnswers(final);
      await Promise.all(
        [...ratings].map(async ([flashcardId, rating]) => {
          const log = byFlashcardId.get(flashcardId);
          const state = log
            ? {
                easeFactor: log.easeFactor,
                intervalDays: log.intervalDays,
                repetitions: log.repetitions ?? 0,
              }
            : initialSrsState();
          const next = scheduleNextReview(state, rating, when, examDate);
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
            // The card simply stays where it was.
          }
        }),
      );

      setSaving(false);
    },
    [
      user,
      items.length,
      profile?.examDate,
      studySetId,
      studySet,
      byFlashcardId,
      startedAt,
      timeZone,
      t.test.title,
    ],
  );

  /**
   * Time running out ends the test where it stands.
   *
   * Guarded by a ref so a redraw at the same instant cannot submit twice.
   */
  const submitted = useRef(false);
  useEffect(() => {
    if (!running || left > 0 || submitted.current) return;
    submitted.current = true;
    void finish(answers);
  }, [running, left, answers, finish]);

  function answerCurrent() {
    if (!current) return;

    const correct =
      current.kind === "mcq"
        ? picked === current.correctIndex
        : current.kind === "typed"
          ? gradeAnswer(typed, current.back).grade === "correct"
          : // "recall" is self-graded on the next screen; until then it counts
            // as unanswered, which scores as wrong.
            false;

    const given =
      current.kind === "mcq"
        ? (current.choices?.[picked ?? -1] ?? "")
        : typed.trim();

    const next = [...answers, { flashcardId: current.flashcardId, correct, given }];
    setAnswers(next);
    setTyped("");
    setPicked(null);

    if (index + 1 >= items.length) {
      submitted.current = true;
      void finish(next);
    } else {
      setIndex(index + 1);
    }
  }

  /** Self-graded items: the student says whether they had it. */
  function answerRecall(correct: boolean) {
    if (!current) return;
    const next = [...answers, { flashcardId: current.flashcardId, correct, given: "" }];
    setAnswers(next);
    if (index + 1 >= items.length) {
      submitted.current = true;
      void finish(next);
    } else {
      setIndex(index + 1);
    }
  }

  function restart() {
    setSeed(Math.floor(Math.random() * 100000) + 1);
    setPaper(null);
    setStartedAt(null);
    setIndex(0);
    setAnswers([]);
    setTyped("");
    setPicked(null);
    setFinished(false);
    submitted.current = false;
  }

  const exitHref = `/app/sets/${studySetId}`;

  if (loading) {
    return (
      <div className="grid min-h-dvh place-items-center">
        <Loader2 className="text-muted-foreground size-6 animate-spin" />
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <Shell exitHref={exitHref} title={studySet?.title} t={t}>
        <div className="grid flex-1 place-items-center px-6 text-center">
          <div className="max-w-sm">
            <PaperCreature state="asleep" className="mx-auto size-28" />
            <h1 className="font-display mt-2 text-2xl font-semibold tracking-tight">
              {t.test.noneYet}
            </h1>
            <p className="text-muted-foreground mt-2 text-sm leading-relaxed">
              {t.test.noneYetHint}
            </p>
            <Button className="mt-6" render={<Link href={exitHref} />}>
              {t.test.backToSet}
            </Button>
          </div>
        </div>
      </Shell>
    );
  }

  if (finished) {
    const score = scoreTest(answers, items.length);
    const missed = items
      .map((item, i) => ({ item, answer: answers[i] }))
      .filter(({ answer }) => !answer || !answer.correct);

    return (
      <Shell exitHref={exitHref} title={studySet?.title} t={t}>
        <div className="mx-auto w-full max-w-2xl flex-1 px-4 py-8 md:px-6">
          <div className="text-center">
            <PaperCreature
              state={score.percent >= 70 ? "celebrating" : "wrong"}
              className="mx-auto size-28"
            />
            <h1 className="font-display mt-2 text-3xl font-semibold tracking-tight tabular-nums">
              {score.correct} / {score.total}
            </h1>
            <p className="text-muted-foreground mt-1 text-sm">
              {t.test.underTime(score.percent)}
              {saving ? t.test.savingSchedule : t.test.scheduleUpdated}
            </p>
          </div>

          {missed.length > 0 ? (
            <section className="mt-8">
              <h2 className="font-display text-lg font-semibold tracking-tight">
                {t.test.worthAnotherLook}
              </h2>
              <p className="text-muted-foreground mt-1 text-sm">
                {t.test.dueSooner}
              </p>
              <ul className="mt-3 divide-y rounded-xl border">
                {missed.map(({ item, answer }, i) => (
                  <li key={`${item.flashcardId}-${i}`} className="p-4">
                    <p className="text-sm font-medium">{item.front}</p>
                    <p className="text-muted-foreground mt-1 text-sm leading-relaxed">
                      {item.back}
                    </p>
                    {answer?.given ? (
                      <p className="text-muted-foreground mt-1.5 text-xs">
                        {t.test.youPut(answer.given)}
                      </p>
                    ) : answer ? (
                      // Answered, but with nothing to quote back: a self-graded
                      // card the student marked as missed. Saying "not reached"
                      // here would be a plain lie about what they did.
                      <p className="text-muted-foreground mt-1.5 text-xs">
                        {t.test.markedMissed}
                      </p>
                    ) : (
                      <p className="text-muted-foreground mt-1.5 text-xs">
                        {t.test.notReached}
                      </p>
                    )}
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          <div className="mt-8 flex flex-col gap-2">
            <Button onClick={restart}>
              <RotateCcw />
              {t.test.takeAnother}
            </Button>
            <Button variant="ghost" render={<Link href={exitHref} />}>
              {t.test.backToSet}
            </Button>
          </div>
        </div>
      </Shell>
    );
  }

  if (startedAt === null) {
    return (
      <Shell exitHref={exitHref} title={studySet?.title} t={t}>
        <div className="grid flex-1 place-items-center px-6 text-center">
          <div className="max-w-md">
            <Clock className="text-primary mx-auto size-8" />
            <h1 className="font-display mt-4 text-2xl font-semibold tracking-tight">
              {t.test.briefTitle(
                items.length,
                Math.round(testDurationMinutes(items.length)),
              )}
            </h1>
            <p className="text-muted-foreground mt-3 text-sm leading-relaxed">
              {t.test.brief}
            </p>
            <p className="text-muted-foreground mt-3 text-sm leading-relaxed">
              {t.test.briefSchedule}
            </p>
            <Button
              size="lg"
              className="mt-7 w-full"
              onClick={() => {
                setPaper(draft);
                setNow(Date.now());
                setStartedAt(Date.now());
              }}
            >
              {t.test.start}
            </Button>
          </div>
        </div>
      </Shell>
    );
  }

  const answerable =
    current?.kind === "mcq" ? picked !== null : current?.kind === "typed" ? true : false;

  return (
    <Shell exitHref={exitHref} title={studySet?.title} t={t}>
      <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col px-4 py-4 md:px-6">
        <div className="flex items-center gap-3">
          <Progress value={(index / items.length) * 100} className="h-1 flex-1" />
          <span
            className={cn(
              "shrink-0 text-sm font-medium tabular-nums",
              left < 60_000 ? "text-destructive" : "text-muted-foreground",
            )}
          >
            {formatClock(left)}
          </span>
        </div>
        <p className="text-muted-foreground mt-2 text-xs tabular-nums">
          {t.test.position(index + 1, items.length)}
        </p>

        <AnimatePresence mode="wait">
          <motion.div
            key={index}
            initial={{ opacity: 0, x: 16 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -16 }}
            transition={{ duration: 0.18 }}
            className="mt-8 flex-1"
          >
            <p className="font-display text-2xl leading-snug font-medium text-balance md:text-3xl">
              {current?.kind === "mcq" ? current.question : current?.front}
            </p>

            {current?.kind === "mcq" ? (
              <div className="mt-6 grid gap-2">
                {current.choices?.map((choice, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setPicked(i)}
                    className={cn(
                      "flex items-center gap-3 rounded-xl border p-4 text-left transition-colors",
                      "focus-visible:ring-ring focus-visible:ring-[3px] focus-visible:outline-none",
                      picked === i
                        ? "border-primary bg-accent/60"
                        : "hover:border-primary/40 hover:bg-accent/30",
                    )}
                  >
                    <span className="text-muted-foreground w-5 shrink-0 text-sm font-medium">
                      {CHOICE_LETTERS[i]}
                    </span>
                    <span className="text-sm">{choice}</span>
                  </button>
                ))}
              </div>
            ) : current?.kind === "typed" ? (
              <div className="mt-6">
                <Input
                  ref={(node) => {
                    node?.focus();
                  }}
                  value={typed}
                  onChange={(e) => setTyped(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      answerCurrent();
                    }
                  }}
                  placeholder={t.test.yourAnswer}
                  aria-label={t.test.yourAnswer}
                  autoComplete="off"
                  spellCheck={false}
                  className="h-12 text-base"
                />
                <p className="text-muted-foreground mt-2 text-xs">
                  {t.test.forgiving}
                </p>
              </div>
            ) : (
              <RecallItem back={current?.back ?? ""} onGrade={answerRecall} t={t} />
            )}
          </motion.div>
        </AnimatePresence>

        {current?.kind !== "recall" ? (
          <div className="pb-[max(1rem,env(safe-area-inset-bottom))]">
            <Button
              size="lg"
              className="w-full"
              onClick={answerCurrent}
              disabled={!answerable}
            >
              {index + 1 >= items.length ? t.test.finish : t.test.next}
              <ArrowRight />
            </Button>
          </div>
        ) : null}
      </div>
    </Shell>
  );
}

/**
 * A card with a long answer and no multiple-choice question.
 *
 * Self-graded, because no matcher can fairly judge a paragraph someone recalled
 * correctly but phrased differently. Including these at all matters: dropping
 * them would quietly exclude the long-form material from every test, and that
 * is exactly what a board exam asks about.
 */
function RecallItem({
  back,
  onGrade,
  t,
}: {
  back: string;
  onGrade: (correct: boolean) => void;
  t: Messages;
}) {
  const [revealed, setRevealed] = useState(false);

  if (!revealed) {
    return (
      <div className="mt-6">
        <p className="text-muted-foreground text-sm">
          {t.test.answerInYourHead}
        </p>
        <Button className="mt-4 w-full" size="lg" onClick={() => setRevealed(true)}>
          {t.test.showAnswer}
        </Button>
      </div>
    );
  }

  return (
    <div className="mt-6">
      <p className="text-lg leading-relaxed text-pretty">{back}</p>
      <div className="mt-6 grid grid-cols-2 gap-2">
        <Button variant="outline" onClick={() => onGrade(false)}>
          <X />
          {t.test.missedIt}
        </Button>
        <Button variant="outline" onClick={() => onGrade(true)}>
          <Check />
          {t.test.hadIt}
        </Button>
      </div>
    </div>
  );
}

function Shell({
  exitHref,
  title,
  children,
  t,
}: {
  exitHref: string;
  title?: string;
  children: React.ReactNode;
  t: Messages;
}) {
  return (
    <div className="flex min-h-dvh flex-col">
      <header className="flex items-center gap-4 px-4 py-3 md:px-6">
        <Button
          variant="ghost"
          size="icon"
          aria-label={t.test.leave}
          render={<Link href={exitHref} />}
        >
          <X />
        </Button>
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-medium">{title ?? t.test.title}</div>
        </div>
      </header>
      {children}
    </div>
  );
}

function testLength(itemCount: number): number {
  return itemCount * SECONDS_PER_ITEM * 1000;
}

function testDurationMinutes(itemCount: number): number {
  return (itemCount * SECONDS_PER_ITEM) / 60;
}
