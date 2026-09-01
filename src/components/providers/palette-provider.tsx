"use client";

/**
 * Applies the student's chosen palette to <html>.
 *
 * Palette is a separate axis from light/dark, which next-themes owns. This
 * only ever touches `data-palette`, so the two never fight over the same
 * attribute.
 *
 * The profile is the source of truth — it is what carries the choice to the
 * computer lab — but it arrives a moment after the page does. Repainting the
 * whole app a different colour once it lands is worse than not offering
 * palettes at all, so a localStorage mirror makes the FIRST paint right and
 * the profile corrects it afterwards if they differ (a palette changed on
 * another device).
 *
 * Renders nothing.
 */

import { useEffect } from "react";

import { useAuth } from "@/components/providers/auth-provider";
import {
  PALETTE_STORAGE_KEY,
  readPalette,
  type PaletteId,
} from "@/lib/theme/palettes";

/** Written by the inline script in the document head; see `paletteScript`. */
export function applyPalette(palette: PaletteId): void {
  document.documentElement.dataset.palette = palette;
  try {
    window.localStorage.setItem(PALETTE_STORAGE_KEY, palette);
  } catch {
    // A private window. The palette still applies for this session.
  }
}

export function PaletteProvider() {
  const { profile } = useAuth();
  const chosen = profile?.palette;

  useEffect(() => {
    // Only once the profile has actually loaded. Applying the default while it
    // is still undefined would flash terracotta over whatever the inline
    // script correctly painted a moment earlier.
    if (chosen === undefined) return;
    applyPalette(readPalette(chosen));
  }, [chosen]);

  return null;
}

/**
 * Runs before first paint, from the document head.
 *
 * Deliberately tiny and dependency-free — it blocks rendering. Everything it
 * can get wrong is wrapped, because an exception here would leave the page
 * unstyled rather than merely the wrong colour.
 */
export const paletteScript = `(function(){try{var p=localStorage.getItem(${JSON.stringify(
  PALETTE_STORAGE_KEY,
)});if(p){document.documentElement.setAttribute('data-palette',p)}}catch(e){}})()`;
