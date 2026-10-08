import type { Plan } from "@/lib/types";

/** Tunable constants for AI generation and plan gating. */

export const AI_MODEL = "claude-sonnet-5";

/** Notes shorter than this don't contain enough to study from. */
export const MIN_NOTE_CHARS = 120;

/**
 * Absolute ceiling on note length across every plan — the editor's hard stop.
 * The *effective* limit is per-plan; see `maxNoteCharsFor`.
 */
export const MAX_NOTE_CHARS = 120_000;

// Pro's ceiling (25 cards, 10 questions) runs noticeably longer than Free's
// — headroom kept generous rather than tuned tight against the old 15/5 cap.
export const MAX_OUTPUT_TOKENS = 10_000;

export const QUIZ_CHOICES_PER_QUESTION = 4;

/**
 * Floor on flashcard count, shared by every plan — below this a set isn't
 * worth reviewing regardless of how short the note is or what the student
 * pays. The ceiling is per-plan; see `PLANS[plan].maxFlashcards`.
 */
export const MIN_FLASHCARDS = 8;

/**
 * Highest flashcard ceiling across all plans — the schema's defensive
 * fallback when no plan is known, and the number documentation and tests
 * reach for when they mean "the max anyone could ever get".
 */
export const MAX_FLASHCARDS = 25;

/**
 * Scales the flashcard target to note length, clamped to [MIN_FLASHCARDS,
 * maxFlashcards]. Roughly one card per 180 characters of source material.
 */
export function targetFlashcardCount(
  noteLength: number,
  maxFlashcards: number,
): number {
  const scaled = Math.round(noteLength / 180);
  return Math.min(maxFlashcards, Math.max(MIN_FLASHCARDS, scaled));
}

/* ===========================================================================
   Pricing
   ===========================================================================

   ALL PRICING LIVES IN THE `PLANS` TABLE BELOW. Change it there and the
   landing page, settings screen, quota meter, and generation gate all follow.

   --- Unit economics -------------------------------------------------------

   At Sonnet 5 list pricing ($3/M input, $15/M output), one study set costs:

     typical note (~1.5K tok in)   ~2.5K in + ~1.2K out  ≈ $0.026 ≈ PHP 1.50
     maximum note (30K chars)      ~8.5K in + ~2.5K out  ≈ $0.063 ≈ PHP 3.65

   Every monthly cap is derived from its price, so the tier stays profitable
   even for someone who uses every set they paid for:

     Free   5 sets  ≈ PHP   7 cost | PHP   0 revenue | cost of acquisition
     Plus  50 sets  ≈ PHP  75 cost | PHP 149 revenue | ~50% margin AT THE CAP
     Pro  120 sets  ≈ PHP 180 cost | PHP 299 revenue | ~40% margin AT THE CAP

   Those are worst-case margins. Real usage sits far below the ceiling, so
   realised margin is much higher — which is the point of capping rather than
   promising "unlimited": every set costs real money, and a cap we can honour
   beats an unlimited promise we would have to quietly throttle.

   The caps are also sized to mean something concrete to a student:

     50/month  = six subjects, a reviewer for each, twice a week (~48)
     120/month = four a day — finals week, thesis, board review

   --- Why these price points ----------------------------------------------

   PHP 149 lands exactly on Netflix PH Mobile, a subscription this market has
   already accepted, and sits under Quizlet Plus (~PHP 2,100/yr ≈ PHP 175/mo)
   rather than above it. PHP 299 anchors the middle tier without being the most
   expensive study app a price-sensitive student can buy.

   If you want to test a higher willingness to pay, raise `phpMonthly` AND
   `monthlyGenerations` together — the caps above are not arbitrary, they are
   what keeps each tier solvent at its ceiling.

   Exchange rate used for the reasoning above: ~PHP 58 / USD.
   =========================================================================== */

export interface PlanDefinition {
  id: Plan;
  name: string;
  /** One line under the price, in the student's terms. */
  tagline: string;
  /** Study sets included per calendar month. */
  monthlyGenerations: number;
  /**
   * Fallback display prices for the PayMongo path, which is Philippines-only
   * (GCash and Maya do not exist outside it). Everywhere else, the real price
   * is whatever RevenueCat's own catalog says — see
   * `revenuecat-client.ts` — these USD figures are shown before that call
   * resolves, or if it never does.
   */
  phpMonthly: number;
  /** Prepaid for a year. Null on the free plan. */
  phpAnnual: number | null;
  usdMonthly: number;
  usdAnnual: number | null;
  /** Longest note this plan may send to the model. */
  maxNoteChars: number;
  /** Highest flashcard count one generation can reach on this plan. */
  maxFlashcards: number;
  /** Quiz questions requested per generation on this plan. */
  quizQuestions: number;
  /**
   * Enforced wait between generations. This is what "priority generation"
   * actually means: paid plans are not throttled. Enforced server-side.
   */
  cooldownSeconds: number;
  /** Export a study set to Anki / CSV / PDF. */
  canExport: boolean;
  /** Share a study set by link. */
  canShare: boolean;
  /** Retention forecast and at-risk cards. */
  canSeeStats: boolean;
  /** Shown as bullets on the pricing table. */
  features: string[];
  /** Features not yet built, listed so the ladder reads honestly. */
  plannedFeatures: string[];
  /** The tier we steer people toward. */
  highlighted: boolean;
}

export const PLANS: Record<Plan, PlanDefinition> = {
  free: {
    id: "free",
    name: "Free",
    tagline: "Enough for one subject's reviewers each month.",
    monthlyGenerations: 5,
    phpMonthly: 0,
    phpAnnual: null,
    usdMonthly: 0,
    usdAnnual: null,
    maxNoteChars: 30_000,
    maxFlashcards: 15,
    quizQuestions: 5,
    cooldownSeconds: 20,
    canExport: false,
    canShare: false,
    canSeeStats: false,
    features: [
      "5 AI study sets a month",
      "Unlimited notes, PDF imports, and your own flashcards",
      "Spaced repetition with typed recall and hints",
      "Timed tests drawn from your weakest cards",
      "Deadlines, timetable, Pomodoro, and a study log",
      "Private study groups with your class",
      "Import and export your notes as Markdown",
    ],
    plannedFeatures: [],
    highlighted: false,
  },
  plus: {
    id: "plus",
    name: "Plus",
    tagline: "A full course load: six subjects, twice a week.",
    monthlyGenerations: 50,
    phpMonthly: 149,
    // Ten months' price for twelve months' access — the clearest way to say
    // "two months free", and far easier to grasp than a percentage.
    phpAnnual: 1_490,
    usdMonthly: 2.99,
    usdAnnual: 29.9,
    maxNoteChars: 60_000,
    maxFlashcards: 20,
    quizQuestions: 7,
    cooldownSeconds: 5,
    canExport: true,
    canShare: true,
    canSeeStats: true,
    features: [
      "50 AI study sets a month",
      "Notes up to 60,000 characters",
      "Export study sets to Anki, CSV, or PDF",
      "Retention stats — what you're about to forget",
      "Share a set by link with your blockmates",
      "Everything in Free",
    ],
    plannedFeatures: [],
    highlighted: true,
  },
  pro: {
    id: "pro",
    name: "Pro",
    tagline: "For finals week, thesis season, and board review.",
    monthlyGenerations: 120,
    phpMonthly: 299,
    phpAnnual: 2_990,
    usdMonthly: 5.99,
    usdAnnual: 59.9,
    maxNoteChars: 120_000,
    maxFlashcards: 25,
    quizQuestions: 10,
    cooldownSeconds: 0,
    canExport: true,
    canShare: true,
    canSeeStats: true,
    features: [
      "120 AI study sets a month — about four a day",
      "Notes up to 120,000 characters",
      "Priority generation — no waiting between sets",
      "Everything in Plus",
    ],
    plannedFeatures: [],
    highlighted: false,
  },
};

/** Display order for the pricing table. */
export const PLAN_ORDER: Plan[] = ["free", "plus", "pro"];

/** AI generation calls allowed per month on the free plan. */
export const FREE_TIER_MONTHLY_GENERATIONS = PLANS.free.monthlyGenerations;

/**
 * Coerces whatever is stored on the profile into a known plan.
 * Guards against a legacy value (an earlier build wrote `"paid"`) or a typo
 * silently granting or denying access.
 */
export function normalisePlan(value: unknown): Plan {
  if (value === "plus" || value === "pro" || value === "free") return value;
  if (value === "paid") return "plus"; // legacy two-tier value
  return "free";
}

export function monthlyGenerationLimit(plan: Plan): number {
  return PLANS[normalisePlan(plan)].monthlyGenerations;
}

export function isPaidPlan(plan: Plan): boolean {
  return plan !== "free";
}

/** Effective monthly price when prepaying a year. */
export function annualMonthlyEquivalent(plan: Plan): number {
  const definition = PLANS[plan];
  if (!definition.phpAnnual) return definition.phpMonthly;
  return Math.round(definition.phpAnnual / 12);
}

/** Percentage saved by prepaying the year, rounded. */
export function annualSavingsPercent(plan: Plan): number {
  const definition = PLANS[plan];
  if (!definition.phpAnnual || definition.phpMonthly === 0) return 0;
  const full = definition.phpMonthly * 12;
  return Math.round(((full - definition.phpAnnual) / full) * 100);
}

/** Months effectively free when paying annually, e.g. 2. */
export function annualFreeMonths(plan: Plan): number {
  const definition = PLANS[plan];
  if (!definition.phpAnnual || definition.phpMonthly === 0) return 0;
  return Math.round(12 - definition.phpAnnual / definition.phpMonthly);
}

export function maxNoteCharsFor(plan: Plan): number {
  return PLANS[normalisePlan(plan)].maxNoteChars;
}

export function maxFlashcardsFor(plan: Plan): number {
  return PLANS[normalisePlan(plan)].maxFlashcards;
}

export function quizQuestionsFor(plan: Plan): number {
  return PLANS[normalisePlan(plan)].quizQuestions;
}

export function cooldownSecondsFor(plan: Plan): number {
  return PLANS[normalisePlan(plan)].cooldownSeconds;
}

export function planCan(
  plan: Plan,
  capability: "canExport" | "canShare" | "canSeeStats",
): boolean {
  return PLANS[normalisePlan(plan)][capability];
}

/** The tier we upsell free users to. */
export const UPGRADE_TARGET: Plan = "plus";

/** Plain-language gloss of what one generation buys on a given plan. */
export function generationExplainerFor(plan: Plan): string {
  const { maxFlashcards, quizQuestions } = PLANS[normalisePlan(plan)];
  return `one note turned into ${MIN_FLASHCARDS}-${maxFlashcards} flashcards and a ${quizQuestions}-question quiz`;
}

/**
 * The generic version shown where no specific student's plan is known —
 * marketing copy and the FAQ, both logged-out surfaces. Free's numbers,
 * since that's the plan anyone reading them actually starts on.
 */
export const GENERATION_EXPLAINER = generationExplainerFor("free");
