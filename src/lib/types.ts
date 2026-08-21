import type { Timestamp } from "firebase/firestore";

/**
 * `board_review` covers licensure and board examinees, who are usually
 * graduates rather than enrolled students. They were previously forced to
 * claim "college" — and the Pro tier's own copy promises them board review,
 * so the door was closed on people the pricing already invited.
 */
export type EducationLevel =
  | "grade_11"
  | "grade_12"
  | "college"
  | "board_review";
/**
 * SHS track/strand. DepEd has four TRACKS; the Academic track is the one with
 * four strands under it, TVL has four, and Sports and Arts and Design have
 * none. This is a flat union rather than a track+strand pair because that is
 * the shape the profile already stores — the grouping lives in
 * `curriculum.ts` instead.
 */
export type Strand =
  | "stem"
  | "abm"
  | "humss"
  | "gas"
  | "tvl_he"
  | "tvl_ict"
  | "tvl_ia"
  | "tvl_afa"
  | "sports"
  | "arts";
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
  /**
   * Free text, self-reported, optional. Not validated against any
   * institution list — see lib/schools.ts for why.
   */
  school?: string | null;
  /**
   * The date of a fixed exam the material has to be ready for, as `YYYY-MM-DD`
   * in the user's own timezone. Board and licensure reviewers sit on a date
   * set by the PRC, and plain SM-2 will happily schedule a well-known card
   * past it — see `clampToExam` in lib/srs/sm2.ts.
   *
   * Stored as a plain date string rather than a Timestamp: it is a calendar
   * day, not an instant, and converting it through UTC shifts it by one day
   * for everyone in Manila.
   */
  examDate?: string | null;
  onboardingCompleted: boolean;

  // --- scheduling preferences ---------------------------------------------
  /**
   * IANA zone deciding what "due today" means. Absent means Asia/Manila.
   * A wrong value shifts every review date silently, so it is stored rather
   * than read from the device on each render.
   */
  timeZone?: string;
  /** Cards the student aims to review in a session. */
  dailyCardGoal?: number;

  // --- consent (self-attested at onboarding; see lib/legal/consent.ts) -----
  /** Which version of the terms and privacy notice was agreed to. */
  termsAcceptedVersion?: string;
  termsAcceptedAt?: Timestamp;
  /** Self-declared 18-or-over. */
  isAdult?: boolean;
  /** A minor confirmed a parent or guardian reviewed and agreed. */
  guardianConsent?: boolean;

  // --- server-owned; not writable from the client (see firestore.rules) ---
  plan: Plan;
  /** Subscription lifecycle. Only the PayMongo webhook writes these. */
  planStatus?: "free" | "active" | "cancelled" | "past_due";
  /** When paid access ends. Grace runs on past this; see plan-state.ts. */
  planExpiresAt?: Timestamp;
  billingPeriod?: "monthly" | "annual";
  planUpdatedAt?: Timestamp;
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
  /**
   * Normalised titles this note links to, written at save time so backlinks
   * and the graph never re-parse every note. Absent on notes saved before the
   * field existed — see `linkedTitlesOf`.
   */
  linkedTitles?: string[];
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
  /**
   * Denormalised copy of the owning user id. Exists so the review queue can
   * read every card in one collection-group query rather than one query per
   * study set; the rules pin it to the owning path.
   */
  ownerId?: string;
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

/**
 * Firestore: users/{userId}/cardReports/{flashcardId}
 *
 * A student saying a generated card is wrong. Keyed by flashcard id so one
 * card cannot be reported twice by the same person. Read with a
 * collection-group query when tuning the prompt against real failures.
 */
export interface CardReport {
  studySetId: string;
  flashcardId: string;
  reportedAt: Timestamp;
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
