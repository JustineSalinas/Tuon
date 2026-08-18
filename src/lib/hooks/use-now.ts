"use client";

import { useEffect, useState } from "react";

/**
 * A timestamp captured at mount, optionally refreshed on an interval.
 *
 * Reading `Date.now()` inside a `useMemo` is impure: the memo would never
 * recompute as time passes, and the React Compiler is free to cache it. Taking
 * the clock as state instead makes "what is due right now" an explicit
 * dependency. Freezing it per render pass is also what we want behaviourally —
 * the due list should not shift underneath a student mid-session.
 */
export function useNow(refreshMs?: number): number {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!refreshMs) return;
    const id = setInterval(() => setNow(Date.now()), refreshMs);
    return () => clearInterval(id);
  }, [refreshMs]);

  return now;
}
