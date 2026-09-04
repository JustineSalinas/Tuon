"use client";

import { useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion, useScroll, useSpring } from "motion/react";
import { Menu, X } from "lucide-react";

import { Wordmark } from "@/components/brand/logo";
import { useI18n } from "@/components/providers/i18n-provider";
import { Button } from "@/components/ui/button";

/** Anchors, with their names looked up per render. */
const LINKS = ["how", "local", "pricing", "faq"] as const;

/**
 * Landing header.
 *
 * The page is short, so the navigation stays quiet: anchors on desktop, a
 * sheet on mobile, and a hairline progress bar that answers "how much of this
 * is there" without a scrollbar — the thing a sticky translucent header
 * otherwise takes away.
 */
export function SiteHeader() {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const { scrollYProgress } = useScroll();
  // Springing the raw progress keeps the bar from twitching on a trackpad.
  const progress = useSpring(scrollYProgress, {
    stiffness: 180,
    damping: 30,
    restDelta: 0.001,
  });

  return (
    <header className="bg-background/80 sticky top-0 z-40 border-b backdrop-blur-md">
      {/* Three columns rather than a flex row, so the nav sits at the header's
          centre rather than wherever the wordmark's width happens to leave it.
          The two 1fr tracks are equal by definition, which is what makes the
          middle one actually centred; a flex row with `mx-auto` would centre it
          in the space LEFT OVER, and that moves whenever the buttons change. On
          phones the nav is hidden, the middle track collapses to nothing, and
          the same grid puts the wordmark left and the buttons right. */}
      <div className="mx-auto grid max-w-6xl grid-cols-[1fr_auto_1fr] items-center gap-4 px-4 py-3.5 md:px-8">
        <Link href="/" onClick={() => setOpen(false)} className="justify-self-start">
          <Wordmark />
        </Link>

        <nav className="hidden items-center gap-1 lg:flex">
          {LINKS.map((key) => (
            <a
              key={key}
              href={`#${key}`}
              className="text-muted-foreground hover:text-foreground hover:bg-accent/50 rounded-lg px-3 py-1.5 text-sm transition-colors"
            >
              {t.marketing.nav[key]}
            </a>
          ))}
        </nav>

        <div className="flex items-center justify-self-end gap-2">
          <Button
            variant="ghost"
            size="sm"
            className="hidden sm:inline-flex"
            render={<Link href="/login" />}
          >
            {t.marketing.nav.signIn}
          </Button>
          <Button size="sm" render={<Link href="/signup" />}>
            {t.marketing.nav.getStarted}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden"
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
            aria-label={open ? t.marketing.nav.closeMenu : t.marketing.nav.openMenu}
          >
            {open ? <X /> : <Menu />}
          </Button>
        </div>
      </div>

      <AnimatePresence>
        {open ? (
          <motion.nav
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
            // Opaque, not the header's translucent ground: page
            // content showing through a menu makes the links hard to read.
            className="bg-background overflow-hidden border-t lg:hidden"
          >
            <div className="mx-auto max-w-6xl px-4 py-2 md:px-8">
              {LINKS.map((key) => (
                <a
                  key={key}
                  href={`#${key}`}
                  onClick={() => setOpen(false)}
                  className="hover:bg-accent/50 block rounded-lg px-3 py-2.5 text-sm"
                >
                  {t.marketing.nav[key]}
                </a>
              ))}
              <Link
                href="/login"
                onClick={() => setOpen(false)}
                className="hover:bg-accent/50 block rounded-lg px-3 py-2.5 text-sm sm:hidden"
              >
                {t.marketing.nav.signIn}
              </Link>
            </div>
          </motion.nav>
        ) : null}
      </AnimatePresence>

      <motion.div
        className="bg-primary absolute inset-x-0 bottom-0 h-0.5 origin-left"
        style={{ scaleX: progress }}
        aria-hidden="true"
      />
    </header>
  );
}
