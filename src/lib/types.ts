import type { Timestamp } from "firebase/firestore";

export type EducationLevel = "grade_11" | "grade_12" | "college";
export type Strand = "stem" | "abm" | "humss" | "gas";
export type Plan = "free" | "plus" | "pro";

/** Firestore: users/{userId} */
export interface UserProfile {
  email: string;
  displayName: string;
  educationLevel: EducationLevel | null;
  /**
   * Grade 11-12: the subjects they picked (many).
   * College: their degree program, e.g. "BS Computer Science" (exactly one).
   * Kept as an array in both cases so downstream code has one shape to handle.
   */
  courses: string[];
  /** Only meaningful for grade_11 / grade_12. Null for college. */
  strand: Strand | null;
  onboardingCompleted: boolean;

  // --- server-owned; not writable from the client (see firestore.rules) ---
  plan: Plan;
  aiGenerationsUsedThisPeriod: number;
  /** Start of the current monthly quota window. */
  generationPeriodStart: Timestamp;
  /** Drives the per-plan cooldown between generations. */
  lastGenerationAt?: Timestamp;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

/** Firestore: users/{userId}/notes/{noteId} */
export interface Note {
  id: string;
  title: string;
  content: string;
  /** Grade 11-12: one of their selected subjects. College: free text. */
  courseTag: string | null;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

/** Firestore: users/{userId}/studySets/{studySetId} */
export interface StudySet {
  id: string;
  /** Null when the set was built by hand rather than generated from a note. */
  noteId: string | null;
  title: string;
  courseTag: string | null;
  flashcardCount: number;
  quizQuestionCount: number;
  source: "ai" | "manual";
  /**
   * When true, anyone holding the link can read this set and its cards.
   * This flag is the real access gate — see firestore.rules.
   */
  isShared?: boolean;
  createdAt: Timestamp;
}

/** Firestore: users/{userId}/studySets/{setId}/flashcards/{flashcardId} */
export interface Flashcard {
  id: string;
  front: string;
  back: string;
  order: number;
}

/** Firestore: users/{userId}/studySets/{setId}/quizQuestions/{questionId} */
export interface QuizQuestion {
  id: string;
  question: string;
  choices: string[];
  correctIndex: number;
  order: number;
}

/**
 * Firestore: users/{userId}/reviewLogs/{flashcardId}
 *
 * Keyed by flashcard id — one scheduling record per card, updated in place.
 */
export interface ReviewLog {
  flashcardId: string;
  studySetId: string;
  easeFactor: number;
  intervalDays: number;
  /** SM-2 "n" — consecutive successful recalls. */
  repetitions: number;
  nextReviewAt: Timestamp;
  lastReviewedAt: Timestamp;
  lastRating: SrsRating;
}

/** Firestore: users/{userId}/quizAttempts/{attemptId} */
export interface QuizAttempt {
  id: string;
  studySetId: string;
  studySetTitle: string;
  score: number;
  total: number;
  completedAt: Timestamp;
}

export type SrsRating = "again" | "hard" | "good" | "easy";

/** Shape the LLM must return. Validated before anything is written. */
export interface GeneratedStudySet {
  flashcards: { front: string; back: string }[];
  quiz: {
    questions: {
      question: string;
      choices: string[];
      correct_index: number;
    }[];
  };
}
