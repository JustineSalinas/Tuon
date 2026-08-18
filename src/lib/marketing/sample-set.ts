/**
 * A real study set, shipped as static content.
 *
 * The landing page needs to show what a generated set actually looks like
 * before asking a price-sensitive student to create an account. Doing that
 * with a live API call would mean paying for every curious visitor and
 * handing anyone a free generation endpoint; doing it with a mockup would be
 * a promise the product might not keep.
 *
 * So this is genuine output from the real prompt on the note below, frozen.
 * If the prompt changes materially, regenerate this rather than editing it by
 * hand — the whole point is that it is representative.
 */

export const SAMPLE_NOTE = {
  title: "Le Chatelier's Principle",
  courseTag: "General Chemistry 1",
  excerpt: `Le Chatelier's Principle: if a system at equilibrium is disturbed, it shifts to counteract the disturbance and restore equilibrium.

Concentration — adding reactant shifts right (toward products); adding product shifts left. Removing a substance shifts toward the side it was removed from.

Pressure — only affects gases. Increasing pressure shifts toward the side with FEWER moles of gas. If both sides have equal moles, no shift.

Temperature — treat heat as a reactant or product. Exothermic (heat is a product): raising temperature shifts LEFT. Endothermic (heat is a reactant): raising temperature shifts RIGHT. Temperature is the only factor that changes K.

Catalysts do NOT shift equilibrium. They speed up both directions equally, so the system reaches equilibrium faster at the same position.`,
};

export const SAMPLE_FLASHCARDS = [
  {
    id: "s1",
    front: "What does Le Chatelier's Principle predict when a system at equilibrium is disturbed?",
    back: "The system shifts in the direction that counteracts the disturbance, restoring equilibrium.",
  },
  {
    id: "s2",
    front: "Which way does equilibrium shift when you add more reactant?",
    back: "To the right, toward the products.",
  },
  {
    id: "s3",
    front: "How does increasing pressure affect a gaseous equilibrium?",
    back: "It shifts toward the side with fewer moles of gas. If both sides have equal moles, there is no shift.",
  },
  {
    id: "s4",
    front:
      "Raising the temperature of an exothermic reaction shifts the equilibrium which way, and why?",
    back: "Left. Heat behaves as a product, so adding heat pushes the system back toward the reactants.",
  },
  {
    id: "s5",
    front: "Why does a catalyst not shift the position of equilibrium?",
    back: "It speeds up the forward and reverse reactions equally, so equilibrium is reached faster but at the same position.",
  },
  {
    id: "s6",
    front: "Which single factor changes the value of the equilibrium constant K?",
    back: "Temperature. Concentration and pressure changes shift the position of equilibrium without changing K.",
  },
];

export const SAMPLE_QUESTION = {
  question:
    "For the exothermic reaction N₂(g) + 3H₂(g) ⇌ 2NH₃(g), which change increases the yield of ammonia?",
  choices: [
    "Raising the temperature",
    "Increasing the pressure",
    "Adding a catalyst",
    "Removing some nitrogen",
  ],
  correctIndex: 1,
  // Shown after answering. The distractors are the three misconceptions a
  // half-studied student actually holds, which is what makes the quiz worth
  // sitting rather than a vocabulary check.
  explanation:
    "Four moles of gas become two, so higher pressure shifts the equilibrium right. Raising the temperature would shift an exothermic reaction left, a catalyst changes nothing, and removing nitrogen shifts it left.",
};
