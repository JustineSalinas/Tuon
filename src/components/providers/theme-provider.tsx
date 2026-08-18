"use client";

import { ThemeProvider as NextThemesProvider } from "next-themes";
import type { ComponentProps } from "react";

/**
 * Enables the dark palette defined in globals.css. Without this, `.dark` is
 * never applied to <html> and the whole dark theme is dead code — and the
 * Toaster's useTheme() call has no provider to read from.
 */
export function ThemeProvider({
  children,
  ...props
}: ComponentProps<typeof NextThemesProvider>) {
  return <NextThemesProvider {...props}>{children}</NextThemesProvider>;
}
