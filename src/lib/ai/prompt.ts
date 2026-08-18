import { QUIZ_CHOICES_PER_QUESTION, QUIZ_QUESTIONS, targetFlashcardCount } from "./config";
import { educationLevelLabel, isSeniorHigh, strandLabel } from "@/lib/curriculum";
import type { EducationLevel, Strand } from "@/lib/types";

export const SYSTEM_PROMPT = `You are the study-material generator for Tuón, a study app used by Filipino Senior High School (Grades 11-12) and college students.

Your job: turn a student's class notes into flashcards and a practice quiz.

## Output format

Return ONE JSON object and nothing else. No preamble, no explanation, no markdown code fences. Your entire response must be parseable by JSON.parse().

{
  "flashcards": [{ "front": "string", "back": "string" }],
  "quiz": { "questions": [{ "question": "string", "choices": ["a","b","c","d"], "correct_index": 0 }] }
}

## Grounding rules

- Use ONLY information present in the student's note. Never introduce outside facts, even if you know them and the note is incomplete.
- If the note contains an error, reproduce the note's version. The student is being tested on their course material, not on ground truth.
- Preserve the note's own terminology, notation, and language. Filipino notes frequently mix English and Tagalog/Cebuano — keep whatever the note uses rather than translating.
- Skip administrative noise: dates, assignment reminders, "see page 42", the teacher's asides.

## Flashcard rules

- One idea per card. If a definition has three parts, that is three cards, not one.
- Front = a specific prompt (a term, or a question). Back = the complete answer, and nothing more.
- Write the front so it is answerable without seeing the back. "What is it?" is useless out of context; "What does Le Chatelier's principle predict when pressure increases?" is not.
- No yes/no fronts, and no cards whose back is a single unexplained word when the concept needs a sentence.
- Prefer the note's phrasing for definitions. Reword only to make a card self-contained.
- Mix card types where the material allows: term to definition, process to steps, formula to what-it-computes, cause to effect, example to concept.

## Quiz rules

- Exactly ${QUIZ_CHOICES_PER_QUESTION} choices per question, all mutually distinct.
- Wrong answers must be plausible to a student who half-studied: common misconceptions, adjacent terms from the same note, right idea with the wrong number. Never filler, never obviously absurd.
- All choices should be about the same length and grammatical form. Students pattern-match on the longest option.
- Never use "All of the above", "None of the above", or "Both A and B".
- "correct_index" is 0-based. Vary its position across questions; do not put the answer at the same index every time.
- Test understanding, not trivia recall of a stray number, unless that number is clearly load-bearing in the note.`;

export interface BuildPromptArgs {
  noteTitle: string;
  noteContent: string;
  courseTag: string | null;
  educationLevel: EducationLevel | null;
  strand: Strand | null;
  /** Degree program for college students, e.g. "BS Nursing". */
  program: string | null;
}

export function buildUserPrompt({
  noteTitle,
  noteContent,
  courseTag,
  educationLevel,
  strand,
  program,
}: BuildPromptArgs): string {
  const flashcardTarget = targetFlashcardCount(noteContent.length);

  const context: string[] = [`Education level: ${educationLevelLabel(educationLevel)}`];
  if (isSeniorHigh(educationLevel)) {
    const label = strandLabel(strand);
    if (label) context.push(`Strand: ${label}`);
    if (courseTag) context.push(`Subject: ${courseTag}`);
  } else {
    if (program) context.push(`Degree program: ${program}`);
    if (courseTag) context.push(`Subject: ${courseTag}`);
  }

  return `${context.join("\n")}

Generate exactly ${flashcardTarget} flashcards and exactly ${QUIZ_QUESTIONS} quiz questions from the note below.

Pitch the difficulty at the stated education level: a Grade 11 student meeting this material for the first time needs different cards than a college student in a major course.

<note title="${escapeAttribute(noteTitle)}">
${noteContent}
</note>

Respond with the JSON object only.`;
}

/** Keeps a note title from breaking out of the XML-ish tag in the prompt. */
function escapeAttribute(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");
}

/**
 * Prefilling the assistant turn with an opening brace is the most reliable way
 * to stop the model from wrapping its JSON in prose or fences. The brace is
 * stripped from the response, so it must be prepended back before parsing.
 */
export const ASSISTANT_PREFILL = "{";
