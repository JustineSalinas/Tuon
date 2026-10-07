"use client";

import { motion, useReducedMotion } from "motion/react";

import { TuonMark } from "@/components/brand/logo";

/**
 * The full-screen branded wait, replacing a bare spinner anywhere the app
 * has genuinely nothing to show yet: the auth/profile settle on first load
 * of `/app`, and route-level suspense boundaries under it.
 *
 * The mark breathes rather than spins. A spinning logo reads as "working";
 * a slow scale-and-fade reads as "waiting", which is the honest state here,
 * since nothing is actually in progress but a read that has not resolved.
 * `prefers-reduced-motion` gets a static mark at mid-opacity instead of the
 * animation, same as the rest of the brand's motion (`paper-creature.tsx`).
 */
export function Preloader({ label = "Loading" }: { label?: string }) {
  const reduceMotion = useReducedMotion();

  return (
    <div className="bg-background grid min-h-dvh place-items-center">
      <motion.div
        className="text-primary"
        initial={false}
        animate={
          reduceMotion
            ? { opacity: 0.6 }
            : { opacity: [0.35, 1, 0.35], scale: [0.94, 1, 0.94] }
        }
        transition={
          reduceMotion
            ? undefined
            : { duration: 1.8, repeat: Infinity, ease: "easeInOut" }
        }
      >
        <TuonMark className="size-9" />
      </motion.div>
      <span className="sr-only">{label}</span>
    </div>
  );
}
