import { FieldValue } from "firebase-admin/firestore";

import { adminDb } from "@/lib/firebase/admin";
import { log } from "@/lib/observability/log";
import {
  SAMPLE_COURSE_TAG,
  SAMPLE_FLASHCARDS,
  SAMPLE_NOTE,
  SAMPLE_QUIZ,
  SAMPLE_SET_TITLE,
} from "@/lib/sample-set";

/**
 * Puts a real, reviewable study set in a brand-new account.
 *
 * Runs server-side with the Admin SDK because it writes a note, a study set,
 * its cards and its quiz in one batch — the client can do each of those, but
 * not atomically, and a half-seeded account is worse than an empty one.
 *
 * Deliberately NOT counted against the AI quota: nothing was generated. It
 * also carries no review logs, so every card is "new" and the dashboard opens
 * with something genuinely due rather than a congratulation.
 */
export async function seedSampleSet(userId: string): Promise<void> {
  const db = adminDb();
  const userRef = db.collection("users").doc(userId);

  const noteRef = userRef.collection("notes").doc();
  const setRef = userRef.collection("studySets").doc();
  const batch = db.batch();

  batch.create(noteRef, {
    title: SAMPLE_NOTE.title,
    content: SAMPLE_NOTE.content,
    courseTag: SAMPLE_NOTE.courseTag,
    linkedTitles: [],
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  });

  batch.create(setRef, {
    noteId: noteRef.id,
    title: SAMPLE_SET_TITLE,
    courseTag: SAMPLE_COURSE_TAG,
    flashcardCount: SAMPLE_FLASHCARDS.length,
    quizQuestionCount: SAMPLE_QUIZ.length,
    // Hand-written, not model output. Saying "ai" would be a lie about where
    // it came from.
    source: "manual",
    isShared: false,
    createdAt: FieldValue.serverTimestamp(),
  });

  // Refs are minted up front so each quiz question can name the card it tests.
  const cardRefs = SAMPLE_FLASHCARDS.map(() =>
    setRef.collection("flashcards").doc(),
  );

  SAMPLE_FLASHCARDS.forEach((card, order) => {
    batch.create(cardRefs[order], {
      front: card.front,
      back: card.back,
      order,
      // Denormalised so the review queue can read every card in one
      // collection-group query; the rules pin it to the owning path.
      ownerId: userId,
    });
  });

  SAMPLE_QUIZ.forEach((question, order) => {
    batch.create(setRef.collection("quizQuestions").doc(), {
      question: question.question,
      choices: [...question.choices],
      correctIndex: question.correctIndex,
      order,
      // So the sample's quiz feeds the scheduler from the very first session,
      // the same way a generated set now does.
      flashcardId: cardRefs[question.testsCardIndex]?.id ?? null,
    });
  });

  await batch.commit();
  log.info({ scope: "profile", event: "sample.seeded", uid: userId });
}

/**
 * Seeds without ever failing the caller.
 *
 * Profile creation is the critical path — without it nobody can use the app at
 * all. A welcome gift is not worth failing that for, so a seeding error is
 * logged and swallowed, and the account simply starts empty.
 */
export async function seedSampleSetQuietly(userId: string): Promise<void> {
  try {
    await seedSampleSet(userId);
  } catch (error) {
    log.error({
      scope: "profile",
      event: "sample.seed_failed",
      uid: userId,
      detail: error instanceof Error ? error.message : String(error),
    });
  }
}
