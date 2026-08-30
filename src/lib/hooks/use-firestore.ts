"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  collection,
  doc,
  limit as limitTo,
  onSnapshot,
  orderBy,
  query,
  type QueryConstraint,
} from "firebase/firestore";

import { db } from "@/lib/firebase/client";
import type {
  Flashcard,
  Note,
  PlanItem,
  QuizQuestion,
  ReviewLog,
  StudySession,
  StudySet,
} from "@/lib/types";

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

/** How many rows a list screen loads before the student asks for more. */
export const PAGE_SIZE = 30;

export interface PagedState<T> extends CollectionState<T> {
  /** True while more rows may exist beyond what is loaded. */
  hasMore: boolean;
  loadMore: () => void;
}

/**
 * A list screen's view of a collection, capped to a page.
 *
 * Firestore bills per document read, and a live subscription over an entire
 * collection re-reads it on every change — so an unbounded list makes every
 * screen cost grow with the library. Widening `limit()` re-subscribes, which
 * costs one extra read of the rows already held; that is far cheaper than
 * never bounding it at all, and it keeps the list live.
 *
 * `hasMore` is inferred from a full page: if the query returned exactly the
 * limit, there is probably more. It can be wrong by one page at the boundary,
 * which costs the student one empty "Load more" and nothing else.
 */
function usePaged<T extends { id: string }>(
  userId: string | undefined,
  pathSegments: string[],
  constraints: QueryConstraint[],
  constraintKey: string,
): PagedState<T> {
  const [size, setSize] = useState(PAGE_SIZE);

  // Reset paging when the user changes, or one account would inherit the
  // other's scroll depth.
  const [activeUser, setActiveUser] = useState(userId);
  if (activeUser !== userId) {
    setActiveUser(userId);
    setSize(PAGE_SIZE);
  }

  const state = useUserCollection<T>(
    userId,
    pathSegments,
    [...constraints, limitTo(size)],
    `${constraintKey}|limit:${size}`,
  );

  const loadMore = useCallback(() => setSize((n) => n + PAGE_SIZE), []);

  return {
    ...state,
    hasMore: state.data.length >= size,
    loadMore,
  };
}

export function usePagedNotes(userId: string | undefined) {
  return usePaged<Note>(userId, ["notes"], BY_CREATED_DESC, "createdAt:desc");
}

export function usePagedStudySets(userId: string | undefined) {
  return usePaged<StudySet>(userId, ["studySets"], BY_CREATED_DESC, "createdAt:desc");
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

/**
 * The organiser: todos, deadlines and classes in one subscription.
 *
 * Unordered on purpose. The three kinds want three different orderings - and
 * each of those would need its own composite index for a collection this small
 * - so the sorting happens in lib/organiser/plan-items.ts, where it is pure
 * and tested.
 */
export function usePlanItems(userId: string | undefined) {
  const { data, loading, error } = useUserCollection<PlanItem>(
    userId,
    ["planItems"],
    NO_CONSTRAINTS,
    "",
  );
  return { items: data, loading, error };
}

/**
 * Every logged study session.
 *
 * Read whole rather than windowed to a week: the collection is one small
 * document per sitting, the week view flips backwards freely, and re-querying
 * on every arrow press would cost more than holding the lot.
 */
export function useStudySessions(userId: string | undefined) {
  const { data, loading, error } = useUserCollection<StudySession>(
    userId,
    ["studySessions"],
    NO_CONSTRAINTS,
    "",
  );
  return { sessions: data, loading, error };
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
