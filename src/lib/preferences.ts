/**
 * Pure preference logic, deliberately free of React and Firebase imports so it
 * can be unit-tested without booting a Firebase app.
 */

/** Cards a session aims for when the student has not chosen a number. */
export const DEFAULT_DAILY_CARD_GOAL = 20;

/** Bounds on the goal. Below 5 is not a session; above 200 is not a day. */
export const MIN_DAILY_CARD_GOAL = 5;
export const MAX_DAILY_CARD_GOAL = 200;

/**
 * Typing the answer is the default.
 *
 * Recognition flatters you - you see the back, feel the click, and rate
 * yourself Good on a card you could not have produced. Typing is the better
 * default for that reason, and it only ever applies to answers short enough
 * to type. Anyone who dislikes it can turn it off, or skip it per card.
 */
export const DEFAULT_TYPED_RECALL = true;

export function readTypedRecall(value: unknown): boolean {
  return typeof value === "boolean" ? value : DEFAULT_TYPED_RECALL;
}

/** UI sound effects and haptic feedback are on by default — both are a tap away from off. */
export const DEFAULT_SOUNDS_ENABLED = true;
export const DEFAULT_HAPTICS_ENABLED = true;

export function readSoundsEnabled(value: unknown): boolean {
  return typeof value === "boolean" ? value : DEFAULT_SOUNDS_ENABLED;
}

export function readHapticsEnabled(value: unknown): boolean {
  return typeof value === "boolean" ? value : DEFAULT_HAPTICS_ENABLED;
}

/**
 * Text scale for the whole app, applied as a class on <html> (see
 * `src/app/layout.tsx` and `globals.css`). "default" renders at the
 * project's normal type scale; "large" is the one step up that actually
 * helps on a phone — anything past that starts breaking card layouts rather
 * than helping anyone read them.
 */
export const FONT_SIZES = ["default", "large"] as const;
export type FontSize = (typeof FONT_SIZES)[number];
export const DEFAULT_FONT_SIZE: FontSize = "default";

export function readFontSize(value: unknown): FontSize {
  return FONT_SIZES.includes(value as FontSize)
    ? (value as FontSize)
    : DEFAULT_FONT_SIZE;
}

export function clampGoal(value: unknown): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return DEFAULT_DAILY_CARD_GOAL;
  }
  return Math.min(MAX_DAILY_CARD_GOAL, Math.max(MIN_DAILY_CARD_GOAL, Math.round(value)));
}
