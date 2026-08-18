"use client";

import { useEffect } from "react";
import Lenis from "lenis";

/**
 * Momentum scrolling for the marketing page only.
 *
 * Deliberately not applied to the app: on the review and quiz screens, input
 * latency matters far more than scroll feel, and hijacking the scroll there
 * would fight the student mid-session.
 */
export function SmoothScroll({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    const prefersReducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    if (prefersReducedMotion) return;

    const lenis = new Lenis({
      duration: 1.05,
      easing: (t: number) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      // Touch devices already have good native momentum; overriding it makes
      // the page feel laggy on mid-range Android handsets.
      smoothWheel: true,
    });

    let frame = 0;
    function raf(time: number) {
      lenis.raf(time);
      frame = requestAnimationFrame(raf);
    }
    frame = requestAnimationFrame(raf);

    return () => {
      cancelAnimationFrame(frame);
      lenis.destroy();
    };
  }, []);

  return <>{children}</>;
}
