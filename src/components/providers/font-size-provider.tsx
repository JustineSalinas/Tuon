"use client";

/**
 * Applies the student's chosen text scale to <html>, the same way
 * PaletteProvider applies colour — a `data-font-size` attribute, a
 * localStorage mirror for first paint, and the profile as the source of
 * truth once it loads. See palette-provider.tsx for why this shape.
 *
 * Renders nothing.
 */

import { useEffect } from "react";

import { useAuth } from "@/components/providers/auth-provider";
import { readFontSize, type FontSize } from "@/lib/preferences";

export const FONT_SIZE_STORAGE_KEY = "tuon.fontSize";

export function applyFontSize(size: FontSize): void {
  document.documentElement.dataset.fontSize = size;
  try {
    window.localStorage.setItem(FONT_SIZE_STORAGE_KEY, size);
  } catch {
    // A private window. The size still applies for this session.
  }
}

export function FontSizeProvider() {
  const { profile } = useAuth();
  const chosen = profile?.fontSize;

  useEffect(() => {
    if (chosen === undefined) return;
    applyFontSize(readFontSize(chosen));
  }, [chosen]);

  return null;
}

/** Runs before first paint, from the document head. See paletteScript. */
export const fontSizeScript = `(function(){try{var s=localStorage.getItem(${JSON.stringify(
  FONT_SIZE_STORAGE_KEY,
)});if(s){document.documentElement.setAttribute('data-font-size',s)}}catch(e){}})()`;
