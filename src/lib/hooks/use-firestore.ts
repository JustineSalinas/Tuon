"use client";

import { useEffect, useMemo, useState } from "react";
import {
  collection,
  doc,
  onSnapshot,
  orderBy,
  query,
  type QueryConstraint,
} from "firebase/firestore";

import { db } from "@/lib/firebase/client";
import type { Flashcard, Note, QuizQuestion, ReviewLog, StudySet } from "@/lib/types";

interface CollectionState<T> {
  data: T[];
  loading: boolean;
  error: string | null;
}

// Shared empty array so a disabled hook returns a referentially stable `data`.
const EMPTY_LIST: never[] = [];

function emptyState<T>(): CollectionState<T> {
  return { data: EMPTY_LIST as T[], loading: false, error: null };
}

/**
 * Subscribes to a subcollection under the signed-in user.
 *
 * State is reset during render (React's documented "adjust state when props
 * change" pattern) rather than inside the effect, so switching between two
 * study sets never shows the previous set's cards.
 */
function useUserCollection<T>(
  userId: string | undefined,
  pathSegments: string[],
  constraints: QueryConstraint[],
  constraintKey: string,
): CollectionState<T> {
  const enabled = Boolean(userId) && pathSegments.length > 0;
  const pathKey = pathSegments.join("/");
  const subscriptionKey = `${userId ?? ""}|${pathKey}|${constraintKey}`;

  const [state, setState] = useState<CollectionState<T>>({
    data: [],
    loading: true,
    error: null,
  });
  const [activeKey, setActiveKey] = useState(subscriptionKey);

  if (activeKey !== subscriptionKey) {
    setActiveKey(subscriptionKey);
    setState({ data: [], loading: true, error: null });
  }

  useEffect(() => {
    if (!enabled || !userId) return;

    const ref = collection(db, "users", userId, ...pathKey.split("/"));
    return onSnapshot(
      constraints.length ? query(ref, ...constraints) : ref,
      (snapshot) => {
        setState({
          data: snapshot.docs.map((d) => ({ id: d.id, ...d.data() }) as T),
          loading: false,
          error: null,
        });
      },
      (error) => {
        console.error(`[useUserCollection ${pathKey}]`, error);
        setState({ data: [], loading: false, error: error.message });
      },
    );
    // `constraints` is rebuilt each render; `constraintKey` identifies it.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [subscriptionKey, enabled]);

  if (!enabled) return emptyState<T>();
  return state;
}

/** Subscribes to a single document under the signed-in user. */
function useUserDocument<T extends { id: string }>(
  userId: string | undefined,
  pathSegments: string[],
): { data: T | null; loading: boolean; notFound: boolean } {
  const enabled = Boolean(userId) && pathSegments.every(Boolean);
  const pathKey = pathSegments.join("/");
  const subscriptionKey = `${userId ?? ""}|${pathKey}`;

  const [state, setState] = useState<{
    data: T | null;
    loading: boolean;
    notFound: boolean;
  }>({ data: null, loading: true, notFound: false });
  const [activeKey, setActiveKey] = useState(subscriptionKey);

  if (activeKey !== subscriptionKey) {
    setActiveKey(subscriptionKey);
    setState({ data: null, loading: true, notFound: false });
  }

  useEffect(() => {
    if (!enabled || !userId) return;

    return onSnapshot(
      doc(db, "users", userId, ...pathKey.split("/")),
      (snapshot) => {
        setState({
          data: snapshot.exists() ? ({ id: snapshot.id, ...snapshot.data() } as T) : null,
          loading: false,
          notFound: !snapshot.exists(),
        });
      },
      () => setState({ data: null, loading: false, notFound: true }),
    );
  }, [subscriptionKey, enabled, userId, pathKey]);

  if (!enabled) return { data: null, loading: false, notFound: false };
  return state;
}

const BY_CREATED_DESC = [orderBy("createdAt", "desc")];
const BY_ORDER_ASC = [orderBy("order", "asc")];

export function useNotes(userId: string | undefined) {
  return useUserCollection<Note>(userId, ["notes"], BY_CREATED_DESC, "createdAt:desc");
}

export function useStudySets(userId: string | undefined) {
  return useUserCollection<StudySet>(
    userId,
    ["studySets"],
    BY_CREATED_DESC,
    "createdAt:desc",
  );
}

export function useFlashcards(userId: string | undefined, studySetId: string | undefined) {
  return useUserCollection<Flashcard>(
    userId,
    studySetId ? ["studySets", studySetId, "flashcards"] : [],
    BY_ORDER_ASC,
    "order:asc",
  );
}

export function useQuizQuestions(
  userId: string | undefined,
  studySetId: string | undefined,
) {
  return useUserCollection<QuizQuestion>(
    userId,
    studySetId ? ["studySets", studySetId, "quizQuestions"] : [],
    BY_ORDER_ASC,
    "order:asc",
  );
}

const NO_CONSTRAINTS: QueryConstraint[] = [];

/** All scheduling records for the user, indexed by flashcard id. */
export function useReviewLogs(userId: string | undefined) {
  const { data, loading, error } = useUserCollection<ReviewLog & { id: string }>(
    userId,
    ["reviewLogs"],
    NO_CONSTRAINTS,
    "",
  );

  const byFlashcardId = useMemo(() => {
    const map = new Map<string, ReviewLog>();
    for (const log of data) map.set(log.id, log);
    return map;
  }, [data]);

  return { logs: data, byFlashcardId, loading, error };
}

export function useStudySet(userId: string | undefined, studySetId: string | undefined) {
  return useUserDocument<StudySet>(
    userId,
    studySetId ? ["studySets", studySetId] : [],
  );
}

export function useNote(userId: string | undefined, noteId: string | undefined) {
  return useUserDocument<Note>(userId, noteId ? ["notes", noteId] : []);
}
