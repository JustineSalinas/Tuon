"use client";

import { useEffect } from "react";

/**
 * Registers the app-shell service worker.
 *
 * Registered from the app shell rather than the marketing page on purpose: a
 * visitor reading the landing page has no use for an offline cache, and asking
 * their browser for storage before they have an account is presumptuous.
 *
 * Registration failure is swallowed. Private browsing, some enterprise
 * policies and a handful of in-app webviews refuse service workers outright,
 * and none of that should surface to a student as an error — they simply do
 * not get offline review.
 */
export function ServiceWorkerRegistration() {
  useEffect(() => {
    if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) {
      return;
    }
    // Dev builds change on every keystroke; a cached shell there is only ever
    // confusing.
    if (process.env.NODE_ENV !== "production") return;

    const register = () => {
      navigator.serviceWorker.register("/sw.js").catch(() => {
        // Nothing to do and nothing worth telling the student.
      });
    };

    // Wait for load so registration never competes with the first render.
    if (document.readyState === "complete") register();
    else window.addEventListener("load", register, { once: true });

    return () => window.removeEventListener("load", register);
  }, []);

  return null;
}
