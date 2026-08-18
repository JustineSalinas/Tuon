import "server-only";

import { adminConfigError, adminDb } from "@/lib/firebase/admin";
import type { Flashcard, QuizQuestion, StudySet } from "@/lib/types";

export interface SharedSetData {
  studySet: StudySet;
  flashcards: Flashcard[];
  quizQuestions: QuizQuestion[];
}

/**
 * Reads a shared study set on the server.
 *
 * A shared link is the cheapest growth channel there is: it gets pasted into a
 * class group chat, and what unfurls there decides whether anyone clicks. That
 * needs real HTML at first byte, which a client-side fetch cannot give.
 *
 * Access is re-checked here rather than trusted from the URL — the Admin SDK
 * bypasses security rules, so this function is the boundary. `isShared` false
 * and "does not exist" both return null, deliberately: a revoked link must not
 * be distinguishable from one that was never real.
 */
export async function getSharedSet(
  userId: string,
  setId: string,
): Promise<SharedSetData | null> {
  if (adminConfigError()) return null;

  // Ids come straight from the URL. Firestore rejects empty or slash-bearing
  // segments with a throw, so screen them before building a reference.
  if (!isSafeId(userId) || !isSafeId(setId)) return null;

  try {
    const setRef = adminDb()
      .collection("users")
      .doc(userId)
      .collection("studySets")
      .doc(setId);

    const snapshot = await setRef.get();
    if (!snapshot.exists) return null;

    const studySet = { id: snapshot.id, ...snapshot.data() } as StudySet;
    if (studySet.isShared !== true) return null;

    const [cards, questions] = await Promise.all([
      setRef.collection("flashcards").orderBy("order", "asc").get(),
      setRef.collection("quizQuestions").orderBy("order", "asc").get(),
    ]);

    return {
      studySet,
      flashcards: cards.docs.map((d) => ({ id: d.id, ...d.data() }) as Flashcard),
      quizQuestions: questions.docs.map(
        (d) => ({ id: d.id, ...d.data() }) as QuizQuestion,
      ),
    };
  } catch {
    return null;
  }
}

function isSafeId(value: string): boolean {
  return (
    typeof value === "string" &&
    value.length > 0 &&
    value.length <= 128 &&
    !value.includes("/")
  );
}

/**
 * Strips Firestore Timestamps so the payload can cross the server/client
 * boundary. Only `createdAt` is a Timestamp here, and the shared view does not
 * show it.
 */
export function toPlainSharedSet(data: SharedSetData) {
  const { createdAt: _createdAt, ...studySet } = data.studySet;
  return {
    studySet: studySet as Omit<StudySet, "createdAt">,
    flashcards: data.flashcards,
    quizQuestions: data.quizQuestions,
  };
}
