import type { SrsRating } from "@/lib/types";

/**
 * Turning a quiz answer into a review rating.
 *
 * Until now a quiz taught the scheduler nothing: you could score 5/5 and every
 * card stayed exactly as unscheduled as before. The two halves of the app did
 * not talk. A wrong answer on a question written specifically to test one card
 * is the clearest signal this app ever gets, and it was being discarded.
 *
 * The mapping is deliberately not the obvious one.
 */

/**
 * A correct multiple-choice answer rates HARD, not GOOD.
 *
 * Recognising the right answer among four is materially easier than producing
 * it from nothing, and one in four blind guesses is correct. Rating that as
 * "Good" would inflate intervals on evidence the student never actually gave —
 * the card would come back later and later on the strength of guessing.
 *
 * "Hard" is the weakest passing grade: the card still advances, but its ease
 * drifts down rather than up, so a card only ever proven by multiple choice
 * stays on a shorter leash than one proven by recall. That is the honest
 * reading of the evidence.
 */
export const CORRECT_MCQ_RATING: SrsRating = "hard";

/** A wrong answer is a lapse, exactly as it is during review. */
export const WRONG_MCQ_RATING: SrsRating = "again";

export function ratingForQuizAnswer(correct: boolean): SrsRating {
  return correct ? CORRECT_MCQ_RATING : WRONG_MCQ_RATING;
}

/**
 * One card's worth of quiz evidence.
 *
 * A quiz can test the same card more than once, so answers are collapsed
 * before anything is written: two writes to the same review log in one
 * submission would mean the second silently schedules from the first's
 * result, which is a review the student never sat.
 *
 * When a card was both missed and answered correctly, the miss wins. Getting
 * it wrong once is proof the card is not secure, and over-scheduling a shaky
 * card is a far cheaper mistake than under-scheduling one.
 */
export function collapseQuizAnswers(
  answers: { flashcardId: string; correct: boolean }[],
): Map<string, SrsRating> {
  const worst = new Map<string, boolean>();
  for (const { flashcardId, correct } of answers) {
    if (!flashcardId) continue;
    const seen = worst.get(flashcardId);
    worst.set(flashcardId, seen === undefined ? correct : seen && correct);
  }

  const ratings = new Map<string, SrsRating>();
  for (const [flashcardId, correct] of worst) {
    ratings.set(flashcardId, ratingForQuizAnswer(correct));
  }
  return ratings;
}
