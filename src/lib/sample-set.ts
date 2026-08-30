/**
 * The study set every new account starts with.
 *
 * A new account used to open on an empty screen that explained the loop in
 * three bullet points. Explaining it is weaker than handing someone a real set
 * and letting them do one review — which takes about thirty seconds and
 * teaches the whole product, including the part nobody reads about (that the
 * card comes back on a schedule).
 *
 * It also happens to be the only part of the loop that works before an
 * Anthropic key exists, so a new user gets something real either way.
 *
 * The topic deliberately matches the note shown on the landing page. Someone
 * who signed up after reading that page finds the same material waiting for
 * them, which reads as continuity rather than coincidence — and it shows the
 * shape of a real set rather than a toy one.
 *
 * Written by hand, so `source` is "manual". It is not AI output and should not
 * claim to be.
 */

export const SAMPLE_COURSE_TAG = "General Biology 1";

export const SAMPLE_NOTE = {
  title: "Photosynthesis — light-dependent reactions",
  courseTag: SAMPLE_COURSE_TAG,
  content: `This is a sample note so you can see how Tuón works. Delete it whenever you like — it is yours.

Photosynthesis happens in two stages.

The LIGHT-DEPENDENT REACTIONS take place in the thylakoid membrane of the chloroplast. Chlorophyll absorbs light energy. Water is split (photolysis), which releases oxygen as a by-product and supplies electrons to photosystem II. The energy captured is stored as ATP and NADPH.

The CALVIN CYCLE (light-independent reactions) takes place in the stroma, the fluid around the thylakoids. It uses the ATP and NADPH from the first stage to fix carbon dioxide into glucose. It is called light-independent because it does not use light directly — but it stops in prolonged darkness, because it runs out of ATP and NADPH.

Key point for exams: the oxygen released comes from WATER, not from carbon dioxide.`,
} as const;

export const SAMPLE_SET_TITLE = "Photosynthesis — light-dependent reactions";

/** Kept short on purpose: a first session should end, not grind. */
export const SAMPLE_FLASHCARDS: { front: string; back: string }[] = [
  {
    front: "Where do the light-dependent reactions take place?",
    back: "In the thylakoid membrane of the chloroplast.",
  },
  {
    front: "What two energy-carrying molecules do the light-dependent reactions produce?",
    back: "ATP and NADPH.",
  },
  {
    front: "What happens to water during the light-dependent reactions?",
    back: "It is split — photolysis — releasing oxygen as a by-product and supplying electrons to photosystem II.",
  },
  {
    front: "Which gas is released as a by-product of photolysis?",
    back: "Oxygen (O₂).",
  },
  {
    front: "Which pigment absorbs the light that drives the reaction?",
    back: "Chlorophyll — mainly chlorophyll a, held in the thylakoid membrane.",
  },
  {
    front: "Where does the Calvin cycle take place?",
    back: "In the stroma, the fluid surrounding the thylakoids.",
  },
  {
    front: "What does the Calvin cycle use the ATP and NADPH for?",
    back: "To fix carbon dioxide into glucose.",
  },
  {
    front: "Why is the Calvin cycle called light-independent?",
    back: "It does not use light directly. It still stops in prolonged darkness, because it runs out of the ATP and NADPH the light reactions supply.",
  },
];

/**
 * `testsCardIndex` points at the flashcard each question checks, by position
 * in SAMPLE_FLASHCARDS. Generated sets get this from the model; the sample is
 * hand-written, so it is hand-linked — without it a new account's first quiz
 * would teach the scheduler nothing, which is the exact gap this closes.
 */
export const SAMPLE_QUIZ: {
  question: string;
  choices: string[];
  correctIndex: number;
  testsCardIndex: number;
}[] = [
  {
    question: "Where do the light-dependent reactions occur?",
    choices: [
      "In the stroma",
      "In the thylakoid membrane",
      "In the cytoplasm",
      "In the mitochondrial matrix",
    ],
    correctIndex: 1,
    testsCardIndex: 0,
  },
  {
    question: "Which of these is NOT a product of the light-dependent reactions?",
    choices: ["ATP", "NADPH", "Oxygen", "Glucose"],
    correctIndex: 3,
    testsCardIndex: 1,
  },
  {
    question:
      "What is the immediate source of the oxygen released during photosynthesis?",
    choices: ["Carbon dioxide", "Water", "Glucose", "ATP"],
    correctIndex: 1,
    testsCardIndex: 2,
  },
  {
    question: "The Calvin cycle is called light-independent because…",
    choices: [
      "it happens only at night",
      "it does not directly require light",
      "it produces its own light",
      "it works without chlorophyll",
    ],
    correctIndex: 1,
    testsCardIndex: 7,
  },
];
