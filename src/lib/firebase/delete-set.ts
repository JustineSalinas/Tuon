import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  writeBatch,
  type DocumentReference,
} from "firebase/firestore";

import { db } from "@/lib/firebase/client";

/** Firestore caps a batch at 500 writes. */
const BATCH_LIMIT = 400;

async function deleteAll(refs: DocumentReference[]): Promise<void> {
  for (let i = 0; i < refs.length; i += BATCH_LIMIT) {
    const batch = writeBatch(db);
    for (const ref of refs.slice(i, i + BATCH_LIMIT)) batch.delete(ref);
    await batch.commit();
  }
}

/**
 * Deletes a study set *and* everything under it.
 *
 * Firestore does not cascade. `deleteDoc(setRef)` removes the set document and
 * leaves its flashcards, quiz questions, and their review logs unreachable but
 * still stored — and still billed. Worse, an orphaned card keeps its `ownerId`,
 * so it would go on matching the collection-group review query forever with no
 * parent set to name it.
 *
 * The owner can do all of this from the client: the rules already let them
 * delete their own documents, so no privileged path is needed.
 */
export async function deleteStudySetDeep(
  userId: string,
  studySetId: string,
): Promise<void> {
  const setRef = doc(db, "users", userId, "studySets", studySetId);

  const [cards, questions] = await Promise.all([
    getDocs(collection(setRef, "flashcards")),
    getDocs(collection(setRef, "quizQuestions")),
  ]);

  await deleteAll([...cards.docs, ...questions.docs].map((d) => d.ref));

  // Scheduling records are keyed by card id and live outside the set, so they
  // have to be swept explicitly — otherwise the stats screen keeps counting
  // cards that no longer exist.
  await deleteAll(
    cards.docs.map((card) => doc(db, "users", userId, "reviewLogs", card.id)),
  );

  // Last, so a failure part-way leaves the set still visible and retryable
  // rather than a set that has vanished with its children left behind.
  await deleteDoc(setRef);
}
