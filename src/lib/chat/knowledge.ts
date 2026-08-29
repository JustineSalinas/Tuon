import {
  BOARD_EXAMS,
  COLLEGE_PROGRAMS,
  EDUCATION_LEVELS,
  STRANDS,
} from "@/lib/curriculum";
import { PLANS, PLAN_ORDER } from "@/lib/ai/config";

/**
 * Everything the landing-page assistant is allowed to know.
 *
 * Deliberately NOT a retrieval system. The whole corpus is about 4k tokens
 * against a 200k window, so retrieval would add embeddings, a vector store,
 * chunking and an index that goes stale the day pricing changes — to fetch the
 * top-k guess from a document that fits in the prompt fifty times over. The
 * model sees all of it, every time, and there is nothing to keep in sync.
 *
 * The parts that CAN drift are generated from the same constants the product
 * uses, not retyped. A bot quoting last month's price is worse than no bot.
 */

/** Prices and caps, read from the real plan config rather than restated. */
function pricing(): string {
  return PLAN_ORDER.map((id) => {
    const plan = PLANS[id];
    const price =
      plan.phpMonthly === 0 ? "free forever" : `PHP ${plan.phpMonthly}/month`;
    const annual = plan.phpAnnual ? `, or PHP ${plan.phpAnnual}/year` : "";
    return `- ${plan.name}: ${price}${annual}. ${plan.monthlyGenerations} AI study sets per month. ${plan.tagline}`;
  }).join("\n");
}

/** Curriculum coverage, from the same lists the signup flow offers. */
function coverage(): string {
  return [
    `Education levels: ${EDUCATION_LEVELS.map((l) => l.label).join(", ")}.`,
    "",
    `Senior High strands (${STRANDS.length}): ${STRANDS.map((s) => s.label).join(", ")}.`,
    "",
    `College programs (${COLLEGE_PROGRAMS.length}), including: ${COLLEGE_PROGRAMS.slice(0, 12).join(", ")}, and more. Anything not listed can be typed in free-text.`,
    "",
    `PRC licensure and board exams (${BOARD_EXAMS.length}): ${BOARD_EXAMS.join(", ")}. Any exam not listed can also be typed in.`,
  ].join("\n");
}

/**
 * The hand-written half. Everything here is a claim about the product, so it
 * has to stay true — if a behaviour changes, this changes with it.
 */
const PRODUCT = `
WHAT TUÓN IS
Tuón turns a student's own class notes into flashcards and a practice quiz, then
schedules each card using SM-2 spaced repetition so it comes back just before it
would be forgotten. Built for Philippine Senior High School, college, and board
or licensure reviewers.

"Tuón" is Cebuano and Tagalog: to study, to give something your full attention.

HOW IT WORKS
1. Paste notes — lecture notes, a textbook excerpt, a typed-up reviewer.
2. Generate — Tuón writes 8 to 15 flashcards and a 5-question practice quiz from
   that material and nothing else.
3. Review on schedule — rate each card Again, Hard, Good or Easy. SM-2 decides
   when it comes back.

Every new account starts with a sample study set already made, so you can try a
review without writing anything first.

PRIVACY
Notes are private to the account that wrote them. A study set is only visible to
others if the student explicitly shares it, and even then a stranger cannot list
or browse the rest of their library.
Note text is sent to Anthropic to generate cards, and is not used to train
models. Students can export everything they have, and can delete their account
along with all of its data.
Tuón follows the Philippine Data Privacy Act: privacy notice, minor consent,
data export, and account deletion are all in the product today.

BOARD AND LICENSURE REVIEW
Reviewers can set their exam date. Ordinary spaced repetition will happily
schedule a well-known card past the exam; Tuón pulls those reviews back inside
the runway so every card is seen again before the day, with the gaps tightening
as the date approaches.

OFFLINE
Tuón is an installable web app. Notes and cards already loaded stay readable and
reviewable without a connection; reviews sync when the connection returns.
Generating a new set needs a connection.

ACCURACY
Cards are written from the student's own note. If the note contains an error the
card will reproduce it, because the student is being tested on their course
material. Every card can be edited, and a thumbs-down reports a bad one.

WHAT IS NOT BUILT YET
- Payments are not switched on yet. Everything currently runs on the free tier.
- Native iOS and Android apps are announced but not released. The web app
  installs to a home screen in the meantime.
Be straight about both if asked. Do not promise dates.
`.trim();

/** The full corpus, assembled once per process. */
export function knowledgeBase(): string {
  return [
    PRODUCT,
    "",
    "PLANS AND PRICING",
    pricing(),
    "",
    "CURRICULUM COVERAGE",
    coverage(),
  ].join("\n");
}
