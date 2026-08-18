"use client";

import { useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion, useScroll, useSpring } from "motion/react";
import { Menu, X } from "lucide-react";

import { Wordmark } from "@/components/brand/logo";
import { Button } from "@/components/ui/button";

const LINKS = [
  { href: "#how", label: "How it works" },
  { href: "#try", label: "See it work" },
  { href: "#local", label: "Built for here" },
  { href: "#pricing", label: "Pricing" },
  { href: "#faq", label: "FAQ" },
];

/**
 * Landing header.
 *
 * The page is short, so the navigation stays quiet: anchors on desktop, a
 * sheet on mobile, and a hairline progress bar that answers "how much of this
 * is there" without a scrollbar — the thing a sticky translucent header
 * otherwise takes away.
 */
export function SiteHeader() {
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
      <div className="mx-auto flex max-w-6xl items-center gap-4 px-4 py-3.5 md:px-8">
        <Link href="/" onClick={() => setOpen(false)}>
          <Wordmark />
        </Link>

        <nav className="ml-6 hidden items-center gap-1 lg:flex">
          {LINKS.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="text-muted-foreground hover:text-foreground hover:bg-accent/50 rounded-lg px-3 py-1.5 text-sm transition-colors"
            >
              {link.label}
            </a>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            className="hidden sm:inline-flex"
            render={<Link href="/login" />}
          >
            Sign in
          </Button>
          <Button size="sm" render={<Link href="/signup" />}>
            Get started
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden"
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
            aria-label={open ? "Close menu" : "Open menu"}
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
              {LINKS.map((link) => (
                <a
                  key={link.href}
                  href={link.href}
                  onClick={() => setOpen(false)}
                  className="hover:bg-accent/50 block rounded-lg px-3 py-2.5 text-sm"
                >
                  {link.label}
                </a>
              ))}
              <Link
                href="/login"
                onClick={() => setOpen(false)}
                className="hover:bg-accent/50 block rounded-lg px-3 py-2.5 text-sm sm:hidden"
              >
                Sign in
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
