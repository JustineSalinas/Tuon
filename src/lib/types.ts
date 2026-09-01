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
  /**
   * Terms, each with its own subject list.
   *
   * A LAYER ABOVE `courses`, not a replacement: switching semester rewrites
   * `courses` from the chosen term's list, so everything reading `courses`
   * keeps working and an account that has never seen a semester behaves
   * exactly as it did before. See lib/profile/semesters.
   */
  semesters?: { id: string; name: string; subjects: string[] }[];
  activeSemesterId?: string | null;
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
  /**
   * Type the answer before flipping, on cards short enough to type.
   * Absent means on: retrieval beats recognition, and the escape hatch is
   * one tap away on the card itself.
   */
  typedRecall?: boolean;
  /**
   * Colour palette id. A separate axis from light/dark, which lives in
   * localStorage under next-themes. On the profile so the choice follows
   * the student to a shared machine.
   */
  palette?: string;
  /**
   * Profile picture as a small JPEG data URL, not a Storage path.
   * See lib/profile/avatar for why, and for the ceiling that keeps this
   * document small enough to read on every page load.
   */
  photoURL?: string | null;
  /**
   * Pomodoro phase lengths in minutes. Absent means the classic 25/5/15.
   * On the profile rather than the device so a student who studies on a
   * phone and a lab machine gets the same blocks on both.
   */
  pomodoroFocus?: number;
  pomodoroShortBreak?: number;
  pomodoroLongBreak?: number;

  // --- consent (self-attested at onboarding; see lib/legal/consent.ts) -----
  /** Which version of the terms and privacy notice was agreed to. */
  termsAcceptedVersion?: string;
  termsAcceptedAt?: Timestamp;
  /** Self-declared 18-or-over. */
  isAdult?: boolean;
  /** A minor confirmed a parent or guardian reviewed and agreed. */
  guardianConsent?: boolean;

  /**
   * Study groups this student belongs to.
   *
   * Server-owned, written only by /api/groups/*. It is the other half of the
   * access-control list: a set shared into a group is readable by anyone whose
   * profile names that group, so a client that could edit this could read
   * every set shared into any group whose id it could guess.
   */
  groupIds?: string[];

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
  /**
   * Study groups this set has been shared into. Read by the rules: a
   * member of any group named here can open the set. Narrower than
   * `isShared`, which means anyone holding the link.
   */
  sharedWithGroups?: string[];
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
  /**
   * The flashcard this question tests, when the model could say which.
   *
   * Absent on every set generated before questions carried the link, and on
   * questions whose card did not survive normalisation. Those quizzes still
   * work; they simply do not feed the scheduler.
   */
  flashcardId?: string | null;
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

/**
 * Firestore: users/{userId}/planItems/{itemId}
 *
 * The organiser: a todo list, dated deadlines, and a weekly class timetable.
 * One collection with a `kind` discriminator rather than three, because the
 * calendar screen wants all of them at once and three subscriptions to three
 * tiny collections is three times the work for the same result.
 *
 * Everything here is local to one student. There is no sharing, no sync with
 * a school system, and no server involvement at all.
 */
export type PlanItemKind = "todo" | "deadline" | "class";

export interface PlanItem {
  id: string;
  kind: PlanItemKind;
  title: string;
  /** Which subject this belongs to. Free text, matched against the profile. */
  courseTag: string | null;
  /** todo + deadline. `YYYY-MM-DD` in the student's own zone, or null for an
   * undated todo. A calendar day, not an instant - see UserProfile.examDate. */
  dueDate?: string | null;
  /** todo only. Deadlines are not "done", they simply pass. */
  done?: boolean;
  /** class only. 0 = Sunday, matching Date.getDay(). */
  weekday?: number;
  /** class only. Minutes from midnight, so comparisons need no date. */
  startMinute?: number;
  endMinute?: number;
  /** class only. A room, a building, or a meeting link. */
  location?: string | null;
  createdAt: Timestamp;
  updatedAt?: Timestamp;
}

/**
 * Firestore: users/{userId}/studySessions/{sessionId}
 *
 * Minutes actually studied. Written by the Pomodoro timer and by review
 * sessions, and editable afterwards - a student who studied offline would
 * otherwise open a blank week and stop believing the number, which makes the
 * whole log worthless.
 *
 * `minutes` is stored rather than derived from the timestamps because an
 * edited session no longer matches them, and the edit is the point.
 */
export type StudySessionSource = "pomodoro" | "review" | "manual";

export interface StudySession {
  id: string;
  source: StudySessionSource;
  /** `YYYY-MM-DD` in the student's zone. What the week view groups on. */
  day: string;
  minutes: number;
  courseTag: string | null;
  /** Cards reviewed, when the session came from a review run. */
  cardsReviewed?: number | null;
  startedAt: Timestamp;
  createdAt: Timestamp;
  updatedAt?: Timestamp;
}

/**
 * Firestore: studyGroups/{groupId}
 *
 * The first data in Tuón that more than one account can read, which is why it
 * is the only top-level collection and why membership is server-owned.
 *
 * Invite-only by design, and deliberately NOT public rooms. The core audience
 * is Grade 11 and 12 - minors - and a public room puts them in a live space
 * with adult strangers, which makes Tuón responsible for moderation, reporting
 * and blocking. A group of people who already know each other (a class, a
 * barkada, a review batch) is how Filipino students actually study and carries
 * none of that.
 */
export interface StudyGroup {
  id: string;
  name: string;
  courseTag: string | null;
  ownerId: string;
  /**
   * Server-owned. Written only by /api/groups/*, never from a browser - it is
   * the access-control list, and a client that could edit it could add itself
   * to any group whose id it could guess.
   */
  memberIds: string[];
  memberCount: number;
  createdAt: Timestamp;
  updatedAt?: Timestamp;
}

/**
 * Firestore: studyGroups/{groupId}/members/{userId}
 *
 * Carries the display name so the group can show who is in it without anyone
 * being able to read another student's profile. Server-written on join.
 */
export interface GroupMember {
  id: string;
  displayName: string;
  role: "owner" | "member";
  joinedAt: Timestamp;
}

/**
 * Firestore: studyGroups/{groupId}/sharedSets/{id}
 *
 * A pointer to a set that still lives in its owner's library. Copying the
 * cards would fork them: the owner fixes a typo and the group keeps the wrong
 * card forever.
 */
export interface GroupSharedSet {
  id: string;
  ownerId: string;
  studySetId: string;
  title: string;
  courseTag: string | null;
  cardCount: number;
  sharedByName: string;
  sharedAt: Timestamp;
}

/** Firestore: studyGroups/{groupId}/deadlines/{id} */
export interface GroupDeadline {
  id: string;
  title: string;
  /** `YYYY-MM-DD`, same reasoning as everywhere else: a calendar day. */
  dueDate: string;
  createdBy: string;
  createdByName: string;
  createdAt: Timestamp;
}

/**
 * Firestore: studyGroups/{groupId}/presence/{userId}
 *
 * "Who is studying right now", written while a focus block is running and
 * expiring on its own. Deliberately thin: a name and an expiry, nothing about
 * what they are studying or for how long they have been at it. The version of
 * this that ranks people by hours is the one that turns studying into a
 * competition, which is a different product.
 */
export interface GroupPresence {
  id: string;
  displayName: string;
  /** After this instant the entry is ignored by readers. */
  until: Timestamp;
  updatedAt: Timestamp;
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
      /** Index into `flashcards`, or null when the link could not be resolved. */
      tests_card_index: number | null;
    }[];
  };
}
