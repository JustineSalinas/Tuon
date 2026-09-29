"use client";

import { useI18n } from "@/components/providers/i18n-provider";

/**
 * A way past the nav for someone who cannot see it.
 *
 * Every authenticated screen carries a persistent sidebar, and the landing
 * page carries a header with four anchor links — both real content a mouse
 * user skips past by looking, that a keyboard user had to Tab through in
 * full, on every single page. WCAG 2.4.1 (Bypass Blocks).
 *
 * `sr-only` until it is the thing actually focused, at which point
 * `focus:not-sr-only` pulls it on screen — invisible until it is useful,
 * never invisible while it is. Has to be the first focusable element in the
 * tree, so it belongs immediately inside whichever root renders the page's
 * `<main id="main-content">`, before the nav that follows it.
 */
export function SkipLink() {
  const { t } = useI18n();

  return (
    <a
      href="#main-content"
      className="bg-primary text-primary-foreground focus-visible:ring-ring sr-only rounded-lg px-4 py-2 text-sm font-medium focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50 focus-visible:ring-2 focus-visible:outline-none"
    >
      {t.common.skipToContent}
    </a>
  );
}
