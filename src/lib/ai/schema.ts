import { z } from "zod";

import { MAX_FLASHCARDS, QUIZ_CHOICES_PER_QUESTION } from "./config";
import type { GeneratedStudySet } from "@/lib/types";

/**
 * The model is instructed to return strict JSON. It usually does. This module
 * assumes it sometimes won't, and recovers where recovery is safe.
 */

const flashcardSchema = z.object({
  front: z.string().min(1).max(400),
  back: z.string().min(1).max(1200),
});

const questionSchema = z.object({
  question: z.string().min(1).max(600),
  choices: z.array(z.string().min(1).max(400)),
  correct_index: z.number().int().nonnegative(),
});

const studySetSchema = z.object({
  flashcards: z.array(flashcardSchema),
  quiz: z.object({
    questions: z.array(questionSchema),
  }),
});

/** Minimum usable output — below this we ask the student to retry. */
const MIN_USABLE_FLASHCARDS = 4;
const MIN_USABLE_QUESTIONS = 2;

/**
 * The shape the model is *constrained* to emit, via `output_config.format`.
 *
 * This replaces the old assistant-prefill trick, which newer models reject
 * outright ("does not support assistant message prefill"). Structured outputs
 * are also strictly stronger: the prefill only nudged the model toward JSON,
 * whereas this guarantees the response parses and matches the shape.
 *
 * Note the JSON Schema subset: `additionalProperties: false` is required on
 * every object, and count/length constraints (minItems, minLength) are not
 * supported — `parseGeneratedStudySet` still enforces those.
 */
export const STUDY_SET_JSON_SCHEMA = {
  type: "object",
  properties: {
    flashcards: {
      type: "array",
      items: {
        type: "object",
        properties: {
          front: { type: "string" },
          back: { type: "string" },
        },
        required: ["front", "back"],
        additionalProperties: false,
      },
    },
    quiz: {
      type: "object",
      properties: {
        questions: {
          type: "array",
          items: {
            type: "object",
            properties: {
              question: { type: "string" },
              choices: { type: "array", items: { type: "string" } },
              correct_index: { type: "integer" },
            },
            required: ["question", "choices", "correct_index"],
            additionalProperties: false,
          },
        },
      },
      required: ["questions"],
      additionalProperties: false,
    },
  },
  required: ["flashcards", "quiz"],
  additionalProperties: false,
} as const;

export type ParseResult =
  | { ok: true; data: GeneratedStudySet }
  | { ok: false; error: string };

/**
 * Pulls a JSON object out of raw model text.
 *
 * Handles, in order: clean JSON; ```json fenced blocks; bare ``` fences; and
 * JSON preceded or followed by prose (by slicing between the outermost braces).
 */
export function extractJson(raw: string): string | null {
  let text = raw.trim();
  if (!text) return null;

  // ```json ... ```  or  ``` ... ```
  const fence = text.match(/```(?:json)?\s*\n?([\s\S]*?)\n?\s*```/i);
  if (fence?.[1]) {
    text = fence[1].trim();
  }

  if (text.startsWith("{") && text.endsWith("}")) return text;

  // Prose around the payload: take the outermost brace pair.
  const first = text.indexOf("{");
  const last = text.lastIndexOf("}");
  if (first !== -1 && last > first) {
    return text.slice(first, last + 1);
  }
  return null;
}

/**
 * Parses and validates raw model output, normalising as it goes.
 *
 * Individual malformed flashcards or questions are dropped rather than failing
 * the whole generation — but if too little survives, this returns an error so
 * the caller can offer a retry (and refund the quota).
 */
export function parseGeneratedStudySet(raw: string): ParseResult {
  const json = extractJson(raw);
  if (!json) {
    return { ok: false, error: "The AI response did not contain any JSON." };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(json);
  } catch {
    return { ok: false, error: "The AI response was not valid JSON." };
  }

  const result = studySetSchema.safeParse(parsed);
  if (!result.success) {
    const first = result.error.issues[0];
    return {
      ok: false,
      error: `The AI response had an unexpected shape${
        first ? ` (${first.path.join(".")}: ${first.message})` : ""
      }.`,
    };
  }

  // --- Normalise flashcards ---
  const seenFronts = new Set<string>();
  const flashcards = result.data.flashcards
    .map((card) => ({ front: card.front.trim(), back: card.back.trim() }))
    .filter((card) => {
      if (!card.front || !card.back) return false;
      const key = card.front.toLowerCase();
      if (seenFronts.has(key)) return false; // drop duplicate prompts
      seenFronts.add(key);
      return true;
    })
    .slice(0, MAX_FLASHCARDS);

  // --- Normalise quiz questions ---
  const questions = result.data.quiz.questions
    .map((q) => ({
      question: q.question.trim(),
      choices: q.choices.map((c) => c.trim()).filter(Boolean),
      correct_index: q.correct_index,
    }))
    .filter(
      (q) =>
        q.question.length > 0 &&
        q.choices.length === QUIZ_CHOICES_PER_QUESTION &&
        // The answer key must actually point at one of the choices.
        q.correct_index >= 0 &&
        q.correct_index < q.choices.length &&
        // Reject questions whose options are not distinct.
        new Set(q.choices.map((c) => c.toLowerCase())).size === q.choices.length,
    );

  if (flashcards.length < MIN_USABLE_FLASHCARDS) {
    return {
      ok: false,
      error: `Only ${flashcards.length} usable flashcard(s) came back. The note may be too short or too unstructured.`,
    };
  }
  if (questions.length < MIN_USABLE_QUESTIONS) {
    return {
      ok: false,
      error: `Only ${questions.length} usable quiz question(s) came back. Try again, or lengthen the note.`,
    };
  }

  return { ok: true, data: { flashcards, quiz: { questions } } };
}
