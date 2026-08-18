"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  collection,
  collectionGroup,
  getDocs,
  orderBy,
  query,
  where,
} from "firebase/firestore";

import { db } from "@/lib/firebase/client";
import type { Flashcard, ReviewLog, StudySet } from "@/lib/types";

export interface ReviewCard extends Flashcard {
  studySetId: string;
  studySetTitle: string;
  courseTag: string | null;
  log: ReviewLog | null;
}

interface ReviewCardsState {
  cards: ReviewCard[];
  setsById: Map<string, StudySet>;
  loading: boolean;
  error: string | null;
}

/**
 * Loads flashcards plus their scheduling records, either for one study set or
 * across every set the student owns.
 *
 * This is a one-shot read rather than a live subscription on purpose. A review
 * queue is built once when a session starts and must not reshuffle underneath
 * the student as they rate; a snapshot listener would do exactly that. It also
 * avoids holding one listener per study set open for the whole session.
 */
export function useReviewCards(
  userId: string | undefined,
  studySetId?: string,
): ReviewCardsState & { reload: () => void } {
  const [state, setState] = useState<ReviewCardsState>({
    cards: [],
    setsById: new Map(),
    loading: true,
    error: null,
  });
  const [nonce, setNonce] = useState(0);
  const [activeKey, setActiveKey] = useState(`${userId ?? ""}|${studySetId ?? ""}|0`);

  const reload = useCallback(() => setNonce((n) => n + 1), []);

  const requestKey = `${userId ?? ""}|${studySetId ?? ""}|${nonce}`;
  if (activeKey !== requestKey) {
    setActiveKey(requestKey);
    setState((prev) => ({ ...prev, loading: true }));
  }

  useEffect(() => {
    if (!userId) return;

    let cancelled = false;

    async function load(uid: string) {
      try {
        const [setsSnapshot, logsSnapshot, cardsSnapshot] = await Promise.all([
          getDocs(
            query(collection(db, "users", uid, "studySets"), orderBy("createdAt", "desc")),
          ),
          getDocs(collection(db, "users", uid, "reviewLogs")),
          // One collection-group query for every card the student owns,
          // instead of one query per study set. `ownerId` is stamped on each
          // card at write time and pinned to the owning path by the rules.
          getDocs(
            query(
              collectionGroup(db, "flashcards"),
              where("ownerId", "==", uid),
              orderBy("order", "asc"),
            ),
          ),
        ]);

        const logsByCardId = new Map<string, ReviewLog>();
        for (const doc of logsSnapshot.docs) {
          logsByCardId.set(doc.id, doc.data() as ReviewLog);
        }

        const sets = setsSnapshot.docs
          .map((d) => ({ id: d.id, ...d.data() }) as StudySet)
          .filter((set) => !studySetId || set.id === studySetId);

        const setsById = new Map(sets.map((set) => [set.id, set]));

        const cards: ReviewCard[] = [];
        for (const cardDoc of cardsSnapshot.docs) {
          // The card's parent set is two segments up: .../studySets/{setId}/flashcards/{id}
          const parentSetId = cardDoc.ref.parent.parent?.id;
          if (!parentSetId) continue;

          // Drops cards whose set was filtered out (single-set review) and any
          // card left behind by a set that was deleted without its children.
          const set = setsById.get(parentSetId);
          if (!set) continue;

          const card = { id: cardDoc.id, ...cardDoc.data() } as Flashcard;
          cards.push({
            ...card,
            studySetId: set.id,
            studySetTitle: set.title,
            courseTag: set.courseTag ?? null,
            log: logsByCardId.get(cardDoc.id) ?? null,
          });
        }

        // The query returns cards interleaved across sets (it sorts by `order`
        // globally). Regroup them per set, newest set first, so the queue
        // reads the same way it did when each set was fetched separately.
        const setPosition = new Map(sets.map((set, index) => [set.id, index]));
        cards.sort(
          (a, b) =>
            (setPosition.get(a.studySetId) ?? 0) - (setPosition.get(b.studySetId) ?? 0) ||
            a.order - b.order,
        );

        if (cancelled) return;
        setState({
          cards,
          setsById,
          loading: false,
          error: null,
        });
      } catch (error) {
        if (cancelled) return;
        console.error("[useReviewCards]", error);
        setState({
          cards: [],
          setsById: new Map(),
          loading: false,
          error: "Could not load your cards.",
        });
      }
    }

    void load(userId);
    return () => {
      cancelled = true;
    };
  }, [userId, studySetId, nonce]);

  // Signed out: nothing to load, so report settled rather than perpetually
  // loading. Derived here rather than written from the effect.
  if (!userId) return { ...EMPTY_STATE, reload };

  return { ...state, reload };
}

const EMPTY_STATE: ReviewCardsState = {
  cards: [],
  setsById: new Map(),
  loading: false,
  error: null,
};

export interface DueBuckets {
  /** Scheduled and the date has passed. */
  due: ReviewCard[];
  /** Never reviewed. */
  fresh: ReviewCard[];
  /** Scheduled for later. */
  scheduled: ReviewCard[];
}

export function bucketByDue(cards: ReviewCard[], now: number): DueBuckets {
  const due: ReviewCard[] = [];
  const fresh: ReviewCard[] = [];
  const scheduled: ReviewCard[] = [];

  for (const card of cards) {
    if (!card.log) fresh.push(card);
    else if ((card.log.nextReviewAt?.toDate?.().getTime() ?? 0) <= now) due.push(card);
    else scheduled.push(card);
  }
  return { due, fresh, scheduled };
}

/** Local (Manila) YYYY-MM-DD key for a date, used by the calendar. */
export function dayKey(date: Date): string {
  return new Intl.DateTimeFormat("en-CA", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    timeZone: "Asia/Manila",
  }).format(date);
}

/** How many cards fall due on each calendar day. */
export function useForecast(cards: ReviewCard[]) {
  return useMemo(() => {
    const byDay = new Map<string, ReviewCard[]>();
    for (const card of cards) {
      const next = card.log?.nextReviewAt?.toDate?.();
      if (!next) continue;
      const key = dayKey(next);
      const bucket = byDay.get(key);
      if (bucket) bucket.push(card);
      else byDay.set(key, [card]);
    }
    return byDay;
  }, [cards]);
}
