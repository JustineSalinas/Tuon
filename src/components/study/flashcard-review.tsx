"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { doc, serverTimestamp, setDoc, Timestamp } from "firebase/firestore";
import {
  Check,
  CornerDownLeft,
  Lightbulb,
  Loader2,
  Minus,
  Plus,
  RotateCcw,
  X,
} from "lucide-react";
import { toast } from "sonner";

import { db } from "@/lib/firebase/client";
import { useAuth } from "@/components/providers/auth-provider";
import { CardFeedback } from "@/components/study/card-feedback";
import { usePreferences } from "@/lib/hooks/use-preferences";
import { useNow } from "@/lib/hooks/use-now";
import {
  bucketByDue,
  useReviewCards,
  type ReviewCard,
} from "@/lib/hooks/use-review-cards";
import {
  initialSrsState,
  parseExamDate,
  previewIntervals,
  scheduleNextReview,
  shouldRequeueInSession,
  type SrsState,
} from "@/lib/srs/sm2";
import {
  MAX_HINT_LEVEL,
  gradeAnswer,
  hintFor,
  isTypeable,
  suggestedRating,
  type AnswerGrade,
} from "@/lib/study/answer-match";
import type { SrsRating } from "@/lib/types";
import { PaperCreature, type CreatureState } from "@/components/brand/paper-creature";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

/** How many cards to let pass before a lapsed card comes back around. */
const REQUEUE_GAP = 3;

const RATINGS: {
  value: SrsRating;
  label: string;
  key: string;
  className: string;
}[] = [
  {
    value: "again",
    label: "Again",
    key: "1",
    className: "border-destructive/40 text-destructive hover:bg-destructive/10",
  },
  {
    value: "hard",
    label: "Hard",
    key: "2",
    className: "border-warning/50 text-warning-text hover:bg-warning/15",
  },
  {
    value: "good",
    label: "Good",
    key: "3",
    className: "border-primary/50 text-primary hover:bg-primary/10",
  },
  {
    value: "easy",
    label: "Easy",
    key: "4",
    className: "border-success/50 text-success hover:bg-success/10",
  },
];

type Mode = "loading" | "empty" | "reviewing" | "done";

/**
 * @param studySetId  review a single set. Omit to review everything due across
 *                    every set — the calendar and dashboard entry point.
 */
export function FlashcardReview({ studySetId }: { studySetId?: string }) {
  const { user, profile } = useAuth();
  // A fixed exam date pulls reviews forward so nothing is scheduled past it.
  const examDate = useMemo(
    () => parseExamDate(profile?.examDate),
    [profile?.examDate],
  );
  const { cards, setsById, loading } = useReviewCards(user?.uid, studySetId);
  const { dailyCardGoal, typedRecall } = usePreferences();
  const reduceMotion = useReducedMotion();
  // Frozen for the session: the queue must not shift while the student rates.
  const now = useNow();

  const [queue, setQueue] = useState<ReviewCard[] | null>(null);
  const [position, setPosition] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [saving, setSaving] = useState(false);
  const [cramming, setCramming] = useState(false);
  const [lastRating, setLastRating] = useState<SrsRating | null>(null);
  const [tally, setTally] = useState({ again: 0, hard: 0, good: 0, easy: 0 });

  // Typed recall. `grade` is null until the answer is submitted, and
  // `skipTyping` is the per-card escape: a student who cannot spell the term
  // should not be stuck on it.
  const [typed, setTyped] = useState("");
  const [grade, setGrade] = useState<AnswerGrade | null>(null);
  const [skipTyping, setSkipTyping] = useState(false);
  // 0 = none asked for. Kept after the reveal so the rating can account
  // for it: a hinted answer is not the same memory as a cold one.
  const [hintLevel, setHintLevel] = useState(0);

  // Scheduling state is updated in place as the student rates, so a card that
  // gets re-queued within the session schedules from its *new* state.
  const [srsOverrides, setSrsOverrides] = useState<Record<string, SrsState>>({});

  const dueCards = useMemo(() => {
    if (loading) return [];
    const { due, fresh } = bucketByDue(cards, now);
    // Reviews first: they are the ones at risk of being forgotten.
    return [...due, ...fresh];
  }, [cards, loading, now]);

  // Seed the session queue exactly once, capped at the student's daily goal.
  //
  // The cap is the point of the setting: 300 cards after a missed week is the
  // moment people quit. Nothing is dropped — the rest simply stay due, and
  // "Keep going" extends the same session rather than starting a new one.
  const seeded = useRef(false);
  useEffect(() => {
    if (seeded.current || loading) return;
    seeded.current = true;
    setQueue(dueCards.slice(0, dailyCardGoal));
  }, [dueCards, loading, dailyCardGoal]);

  const heldBack = Math.max(0, dueCards.length - (queue?.length ?? 0));

  /** Adds the next batch to the running session, keeping progress intact. */
  const extendSession = useCallback(() => {
    setQueue((prev) => {
      if (!prev) return prev;
      const seen = new Set(prev.map((card) => card.id));
      const next = dueCards.filter((card) => !seen.has(card.id)).slice(0, dailyCardGoal);
      return [...prev, ...next];
    });
  }, [dueCards, dailyCardGoal]);

  const currentCard = queue?.[position] ?? null;

  const srsStateFor = useCallback(
    (card: ReviewCard): SrsState => {
      const override = srsOverrides[card.id];
      if (override) return override;
      if (!card.log) return initialSrsState();
      return {
        easeFactor: card.log.easeFactor,
        intervalDays: card.log.intervalDays,
        repetitions: card.log.repetitions ?? 0,
      };
    },
    [srsOverrides],
  );

  // Only offered on answers short enough that a matcher can judge them
  // fairly; a paragraph keeps the plain flip. See lib/study/answer-match.
  const typing =
    typedRecall && !skipTyping && currentCard !== null && isTypeable(currentCard.back);

  /** Grades what was typed and reveals the answer. */
  const submitTyped = useCallback(() => {
    if (!currentCard || flipped) return;
    setGrade(gradeAnswer(typed, currentCard.back).grade);
    setFlipped(true);
  }, [currentCard, flipped, typed]);

  const intervals = useMemo(
    () =>
      currentCard
        ? previewIntervals(srsStateFor(currentCard), new Date(), examDate)
        : null,
    [currentCard, srsStateFor, examDate],
  );

  const handleRate = useCallback(
    async (rating: SrsRating) => {
      if (!user || !currentCard || !queue || saving) return;
      setSaving(true);

      const next = scheduleNextReview(
        srsStateFor(currentCard),
        rating,
        new Date(),
        examDate,
      );

      try {
        await setDoc(
          doc(db, "users", user.uid, "reviewLogs", currentCard.id),
          {
            flashcardId: currentCard.id,
            studySetId: currentCard.studySetId,
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
        toast.error("Could not save that review. Check your connection.");
        setSaving(false);
        return;
      }

      setSrsOverrides((prev) => ({
        ...prev,
        [currentCard.id]: {
          easeFactor: next.easeFactor,
          intervalDays: next.intervalDays,
          repetitions: next.repetitions,
        },
      }));
      setTally((prev) => ({ ...prev, [rating]: prev[rating] + 1 }));
      setLastRating(rating);

      // A card the student struggled with comes back before the session ends,
      // even though its saved schedule follows SM-2 exactly.
      if (shouldRequeueInSession(rating)) {
        setQueue((prev) => {
          if (!prev) return prev;
          const rest = [...prev];
          const [card] = rest.splice(position, 1);
          rest.splice(Math.min(position + REQUEUE_GAP, rest.length), 0, card);
          return rest;
        });
      } else {
        setPosition((p) => p + 1);
      }

      setFlipped(false);
      setTyped("");
      setGrade(null);
      setSkipTyping(false);
      setHintLevel(0);
      setSaving(false);
    },
    [user, currentCard, queue, saving, srsStateFor, position, examDate],
  );

  // Keyboard: space/enter flips, 1-4 rate. While an answer is being typed the
  // card must not steal the keys — space is a space, and Enter submits.
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (!currentCard) return;
      if (typing && !flipped) {
        if (event.key === "Enter") {
          event.preventDefault();
          submitTyped();
        }
        return;
      }
      if (event.key === " " || event.key === "Enter") {
        event.preventDefault();
        setFlipped((f) => !f);
        return;
      }
      if (!flipped) return;
      const match = RATINGS.find((r) => r.key === event.key);
      if (match) {
        event.preventDefault();
        void handleRate(match.value);
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [currentCard, flipped, handleRate, typing, submitTyped]);

  function startCram() {
    setCramming(true);
    setQueue(cards);
    setPosition(0);
    setFlipped(false);
    setTyped("");
    setGrade(null);
    setSkipTyping(false);
    setHintLevel(0);
    setLastRating(null);
    setTally({ again: 0, hard: 0, good: 0, easy: 0 });
  }

  const mode: Mode =
    loading || queue === null
      ? "loading"
      : queue.length === 0
        ? "empty"
        : position >= queue.length
          ? "done"
          : "reviewing";

  const reviewed = tally.again + tally.hard + tally.good + tally.easy;
  const progress = queue?.length ? Math.min(100, (position / queue.length) * 100) : 0;
  const exitHref = studySetId ? `/app/sets/${studySetId}` : "/app";
  const heading = studySetId
    ? (setsById.get(studySetId)?.title ?? "Review")
    : "Everything due";

  // The creature reacts to whatever just happened, then settles.
  const creature: CreatureState =
    mode === "done"
      ? "celebrating"
      : mode === "empty"
        ? "asleep"
        : saving
          ? "thinking"
          : lastRating === "again" || lastRating === "hard"
            ? "wrong"
            : lastRating
              ? "correct"
              : "idle";

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="flex items-center gap-4 px-4 py-3 md:px-6">
        <Button
          variant="ghost"
          size="icon"
          aria-label="Exit review"
          render={<Link href={exitHref} />}
        >
          <X />
        </Button>

        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-medium">{heading}</div>
          {mode === "reviewing" ? (
            <Progress value={progress} className="mt-1.5 h-1" />
          ) : null}
        </div>

        {mode === "reviewing" ? (
          <span className="text-muted-foreground shrink-0 text-sm tabular-nums">
            {position + 1} / {queue!.length}
          </span>
        ) : null}
      </header>

      {mode === "loading" ? (
        <div className="grid flex-1 place-items-center">
          <Loader2 className="text-muted-foreground size-6 animate-spin" />
        </div>
      ) : mode === "empty" ? (
        <AllCaughtUp exitHref={exitHref} hasCards={cards.length > 0} onCram={startCram} />
      ) : mode === "done" ? (
        <SessionComplete
          exitHref={exitHref}
          tally={tally}
          reviewed={reviewed}
          cramming={cramming}
          onCram={startCram}
          heldBack={heldBack}
          onKeepGoing={extendSession}
        />
      ) : (
        <>
          <div className="flex flex-1 items-center justify-center px-4 pb-4 md:px-6">
            <div className="w-full max-w-2xl" style={{ perspective: 1600 }}>
              {/* Which set this card came from — only meaningful across sets */}
              {!studySetId ? (
                <p className="text-muted-foreground mb-3 truncate text-center text-xs">
                  {currentCard!.studySetTitle}
                </p>
              ) : null}

              <motion.button
                type="button"
                onClick={() => {
                  // Tapping to flip would skip the retrieval the typing is
                  // there for. Once the answer is in, it flips as usual.
                  if (typing && !flipped) return;
                  setFlipped((f) => !f);
                }}
                className="relative block w-full cursor-pointer text-left"
                style={{ transformStyle: "preserve-3d" }}
                animate={{ rotateY: flipped && !reduceMotion ? 180 : 0 }}
                transition={{ duration: 0.42, ease: [0.22, 1, 0.36, 1] }}
                aria-label={flipped ? "Show question" : "Show answer"}
              >
                <CardFace>
                  <FaceLabel>Question</FaceLabel>
                  <p className="font-display mt-4 text-2xl leading-snug font-medium text-balance md:text-3xl">
                    {currentCard!.front}
                  </p>
                  <p className="text-muted-foreground mt-8 text-xs">
                    {typing
                      ? "Type what you remember, then press Enter"
                      : "Tap the card or press Space to reveal"}
                  </p>
                </CardFace>

                <CardFace
                  className="absolute inset-0"
                  style={{ transform: reduceMotion ? undefined : "rotateY(180deg)" }}
                  hidden={reduceMotion ? !flipped : false}
                >
                  <FaceLabel>Answer</FaceLabel>
                  <p className="mt-4 text-lg leading-relaxed text-pretty md:text-xl">
                    {currentCard!.back}
                  </p>
                </CardFace>
              </motion.button>

              {/* Outside the card on purpose. It used to sit on the answer
                  face, which put a <button> inside the card's own <button> —
                  invalid HTML, and React reported a hydration error on every
                  single review. Rendering it here keeps the original intent
                  (it only appears once the answer is visible) without nesting
                  anything, and it no longer needs to swallow click events to
                  stop the card flipping underneath it. */}
              {user && flipped ? (
                <div className="mt-3 flex justify-end">
                  <CardFeedback
                    userId={user.uid}
                    studySetId={currentCard!.studySetId}
                    flashcardId={currentCard!.id}
                  />
                </div>
              ) : null}
            </div>
          </div>

          <div className="px-4 pb-[max(1rem,env(safe-area-inset-bottom))] md:px-6 md:pb-6">
            <div className="mx-auto max-w-2xl">
              <AnimatePresence mode="wait">
                {flipped ? (
                  <motion.div
                    key="ratings"
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 8 }}
                    transition={{ duration: 0.2 }}
                    className="space-y-3"
                  >
                    {grade ? (
                      <Verdict grade={grade} typed={typed} hinted={hintLevel > 0} />
                    ) : null}

                    <div className="grid grid-cols-4 gap-2">
                    {RATINGS.map((rating) => (
                      <motion.button
                        key={rating.value}
                        type="button"
                        onClick={() => void handleRate(rating.value)}
                        disabled={saving}
                        whileTap={{ scale: 0.95 }}
                        transition={{ type: "spring", stiffness: 400, damping: 25 }}
                        className={cn(
                          "bg-card flex flex-col items-center gap-0.5 rounded-xl border py-3 transition-colors disabled:opacity-60",
                          "focus-visible:ring-ring focus-visible:ring-[3px] focus-visible:outline-none",
                          rating.className,
                          // What the typed answer suggests. It is a default,
                          // not a verdict: only the student knows whether it
                          // came instantly or after ten seconds of digging,
                          // and that is most of what SM-2 is reading.
                          grade &&
                            suggestedRating(grade, hintLevel > 0) === rating.value &&
                            "ring-foreground/25 ring-2 ring-offset-1 ring-offset-background",
                        )}
                      >
                        <span className="text-sm font-medium">{rating.label}</span>
                        <span className="text-muted-foreground text-[11px] tabular-nums">
                          {intervals?.[rating.value]}
                        </span>
                      </motion.button>
                    ))}
                    </div>
                  </motion.div>
                ) : (
                  <motion.div
                    key="reveal"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.15 }}
                  >
                    {typing ? (
                      <div className="space-y-2">
                        {hintLevel > 0 ? (
                          <p
                            className="text-muted-foreground text-center font-mono text-base tracking-[0.2em]"
                            aria-label="Hint"
                          >
                            {hintFor(currentCard!.back, hintLevel)}
                          </p>
                        ) : null}
                        <div className="flex gap-2">
                          <Input
                            // Focus on mount rather than in an effect: the
                            // box does not exist until the ratings have
                            // finished animating out, so an effect keyed on
                            // the card runs while the ref is still null and
                            // the next card opens unfocused. This is what
                            // lets a whole session run from the keyboard.
                            ref={(node) => {
                              node?.focus();
                            }}
                            value={typed}
                            onChange={(e) => setTyped(e.target.value)}
                            placeholder="Your answer"
                            aria-label="Your answer"
                            autoComplete="off"
                            autoCorrect="off"
                            spellCheck={false}
                            className="h-11 flex-1 text-base"
                          />
                          <Button size="lg" onClick={submitTyped}>
                            <CornerDownLeft />
                            Check
                          </Button>
                        </div>
                        <div className="flex items-center justify-center gap-4">
                          {hintLevel < MAX_HINT_LEVEL ? (
                            <button
                              type="button"
                              onClick={() => setHintLevel((h) => h + 1)}
                              className="text-muted-foreground hover:text-foreground focus-visible:ring-ring flex items-center gap-1.5 rounded-md py-1 text-xs underline-offset-4 hover:underline focus-visible:ring-[3px] focus-visible:outline-none"
                            >
                              <Lightbulb className="size-3.5" />
                              {hintLevel === 0 ? "Hint" : "More"}
                            </button>
                          ) : null}
                          <button
                            type="button"
                            onClick={() => setSkipTyping(true)}
                            className="text-muted-foreground hover:text-foreground focus-visible:ring-ring rounded-md py-1 text-xs underline-offset-4 hover:underline focus-visible:ring-[3px] focus-visible:outline-none"
                          >
                            Just show me the answer
                          </button>
                        </div>
                      </div>
                    ) : (
                      <Button size="lg" className="w-full" onClick={() => setFlipped(true)}>
                        Show answer
                      </Button>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* Companion — decorative, and kept out of the thumb zone on mobile */}
          <PaperCreature
            state={creature}
            // This branch only renders mid-review, so the book stays out for
            // the whole session rather than appearing for the instant after
            // each rating and vanishing again.
            studying
            className="pointer-events-none fixed bottom-24 left-4 hidden size-16 opacity-90 lg:block"
          />
        </>
      )}
    </div>
  );
}

function CardFace({
  children,
  className,
  style,
  hidden,
}: {
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
  hidden?: boolean;
}) {
  return (
    <div
      className={cn(
        "bg-card flex min-h-[46vh] flex-col justify-center rounded-2xl border p-6 shadow-sm md:min-h-[42vh] md:p-10",
        hidden && "invisible",
        className,
      )}
      style={{ backfaceVisibility: "hidden", WebkitBackfaceVisibility: "hidden", ...style }}
    >
      {children}
    </div>
  );
}

/**
 * What the grader made of the typed answer.
 *
 * Worded so that being wrong is information rather than a scolding - the card
 * came back precisely because it was not known yet, which is the system
 * working. The student's own words are echoed on anything short of a clean
 * match, because "close" is meaningless unless you can see what you wrote next
 * to what was wanted.
 */
function Verdict({
  grade,
  typed,
  hinted,
}: {
  grade: AnswerGrade;
  typed: string;
  hinted: boolean;
}) {
  const written = typed.trim();

  const { icon: Icon, label, className } =
    grade === "correct"
      ? {
          icon: Check,
          label: "Correct",
          className: "border-success/40 bg-success/10 text-success",
        }
      : grade === "close"
        ? {
            icon: Minus,
            label: "Almost",
            className: "border-warning/40 bg-warning/10 text-warning-text",
          }
        : {
            icon: X,
            label: written ? "Not quite" : "Skipped",
            className: "border-destructive/40 bg-destructive/10 text-destructive",
          };

  return (
    <div
      className={cn("flex items-center gap-2 rounded-xl border px-3 py-2 text-sm", className)}
      role="status"
    >
      <Icon className="size-4 shrink-0" />
      <span className="font-medium">{label}</span>
      {grade !== "correct" && written ? (
        <span className="text-muted-foreground min-w-0 truncate">
          you wrote &ldquo;{written}&rdquo;
        </span>
      ) : null}
      {hinted ? (
        <span className="text-muted-foreground ml-auto shrink-0 text-xs">
          with a hint
        </span>
      ) : null}
    </div>
  );
}

function FaceLabel({ children }: { children: React.ReactNode }) {
  return (
    <span className="text-muted-foreground text-[11px] font-medium tracking-widest uppercase">
      {children}
    </span>
  );
}

function AllCaughtUp({
  exitHref,
  hasCards,
  onCram,
}: {
  exitHref: string;
  hasCards: boolean;
  onCram: () => void;
}) {
  return (
    <div className="grid flex-1 place-items-center px-6 pb-16 text-center">
      <div className="max-w-sm">
        <PaperCreature state="asleep" className="mx-auto size-32" />
        <h1 className="font-display mt-2 text-2xl font-semibold tracking-tight">
          All caught up
        </h1>
        <p className="text-muted-foreground mt-2 text-sm leading-relaxed">
          Nothing is due right now. Coming back early is wasted effort — the
          schedule is doing its job.
        </p>
        <div className="mt-7 flex flex-col gap-2">
          {hasCards ? (
            <Button variant="outline" onClick={onCram}>
              <RotateCcw />
              Review anyway
            </Button>
          ) : null}
          <Button variant="ghost" render={<Link href={exitHref} />}>
            Back
          </Button>
        </div>
      </div>
    </div>
  );
}

function SessionComplete({
  exitHref,
  tally,
  reviewed,
  cramming,
  onCram,
  heldBack,
  onKeepGoing,
}: {
  exitHref: string;
  tally: Record<SrsRating, number>;
  reviewed: number;
  cramming: boolean;
  onCram: () => void;
  /** Due cards left over the daily goal. */
  heldBack: number;
  onKeepGoing: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      className="grid flex-1 place-items-center px-6 pb-16 text-center"
    >
      <div className="w-full max-w-sm">
        <PaperCreature state="celebrating" className="mx-auto size-32" />

        <h1 className="font-display mt-2 text-2xl font-semibold tracking-tight">
          Session complete
        </h1>
        <p className="text-muted-foreground mt-2 text-sm">
          {reviewed} {reviewed === 1 ? "review" : "reviews"} logged
          {cramming ? " (practice run)" : ""}.
        </p>

        <div className="mt-7 grid grid-cols-4 gap-2 text-center">
          {RATINGS.map((rating) => (
            <div key={rating.value} className="rounded-xl border py-3">
              <div className="font-display text-xl font-semibold tabular-nums">
                {tally[rating.value]}
              </div>
              <div className="text-muted-foreground mt-0.5 text-[11px]">
                {rating.label}
              </div>
            </div>
          ))}
        </div>

        {heldBack > 0 ? (
          <p className="text-muted-foreground mt-5 text-sm leading-relaxed">
            {heldBack} more {heldBack === 1 ? "card is" : "cards are"} still due.
            They keep until you want them — stopping here is a finished session,
            not an unfinished one.
          </p>
        ) : null}

        <div className="mt-7 flex flex-col gap-2">
          {heldBack > 0 ? (
            <Button onClick={onKeepGoing}>
              <Plus />
              Keep going
            </Button>
          ) : null}
          <Button
            variant={heldBack > 0 ? "outline" : "default"}
            render={<Link href={exitHref} />}
          >
            Done
          </Button>
          <Button variant="ghost" onClick={onCram}>
            <RotateCcw />
            Go through them again
          </Button>
        </div>
      </div>
    </motion.div>
  );
}
