/**
 * Colour palettes.
 *
 * Palette and light/dark are two SEPARATE axes, which is the whole design.
 * Folding them into one list — "Terracotta light", "Terracotta dark", "Indigo
 * light"… — doubles every time either axis grows, and it forces a student who
 * likes indigo to re-pick it when they switch to dark at midnight. Here you
 * choose a colour once, and it follows you into whichever mode you are in.
 *
 * Each palette only overrides the hue-bearing tokens: the brand colour, its
 * accent wash, the focus ring, and a light tint on the surfaces so the greys
 * agree with the brand rather than fighting it. Surfaces, text and the
 * semantic colours (success, warning, destructive) are deliberately shared, so
 * the contrast work behind them is done once rather than five times — and a
 * new palette cannot quietly make error text unreadable.
 *
 * Pure data. The CSS lives in globals.css, keyed on `data-palette`.
 */

export const PALETTES = [
  {
    id: "terracotta",
    label: "Terracotta",
    hint: "Warm clay and cream — the original",
    /** Shown in the picker. A real hex so the swatch needs no theme to render. */
    swatch: "#C0603A",
  },
  {
    id: "indigo",
    label: "Indigo",
    hint: "Cool and quiet, for studying at night",
    swatch: "#4C5FD7",
  },
  {
    id: "forest",
    label: "Forest",
    hint: "Deep green, easy on the eyes for long sessions",
    swatch: "#3E7C57",
  },
  {
    id: "plum",
    label: "Plum",
    hint: "Muted purple with a warm grey",
    swatch: "#8A4F86",
  },
  {
    id: "slate",
    label: "Slate",
    hint: "Almost no colour at all — nothing competes with your notes",
    swatch: "#5A6472",
  },
] as const;

export type PaletteId = (typeof PALETTES)[number]["id"];

export const DEFAULT_PALETTE: PaletteId = "terracotta";

/** Narrows anything — a profile field, a localStorage string — to a palette. */
export function readPalette(value: unknown): PaletteId {
  return PALETTES.some((p) => p.id === value)
    ? (value as PaletteId)
    : DEFAULT_PALETTE;
}

/**
 * Mirrored in localStorage as well as the profile.
 *
 * The profile is the source of truth — it is what makes the choice follow a
 * student to the computer lab — but it arrives a moment after the page does,
 * and repainting the whole app a different colour once it lands is worse than
 * not offering palettes at all. The mirror lets the very first paint be right.
 */
export const PALETTE_STORAGE_KEY = "tuon.palette";
