"use client";

import { useEffect, useState } from "react";

import { SHORTLIST_POOL, type SchoolPool } from "@/lib/schools";

/**
 * The full school index, fetched the first time someone needs it.
 *
 * 9,465 institutions is 335 KB, about 65 KB over the wire. That is small for a
 * desktop and not small for a student on prepaid mobile data in the middle of
 * signing up — so nobody pays for it until they put a cursor in the school
 * field, and nobody pays for it twice.
 *
 * Until it lands, and if it never lands, the curated shortlist stands in. That
 * is the important property: the field works with no network, works on a
 * failed fetch, and works while the index is still in flight. It is an
 * autocomplete over a free-text input, so the worst case is that a student
 * types their school in full — which is exactly what they did before this
 * existed.
 *
 * One module-level promise rather than per-component state: three components
 * can mount with this hook and there is still one request and one array in
 * memory.
 */

let cache: SchoolPool | null = null;
let inFlight: Promise<SchoolPool> | null = null;

/** Trust nothing about the shape: a captive portal returns HTML with a 200. */
function readPool(data: unknown): SchoolPool | null {
  if (!data || typeof data !== "object") return null;
  const { hei, secondary } = data as Record<string, unknown>;
  const ok = (list: unknown) =>
    Array.isArray(list) && list.every((n) => typeof n === "string");
  if (!ok(hei) || !ok(secondary)) return null;
  return { hei: hei as string[], secondary: secondary as string[] };
}

function loadSchools(): Promise<SchoolPool> {
  if (cache) return Promise.resolve(cache);
  if (inFlight) return inFlight;

  inFlight = fetch("/schools.json")
    .then((response) => (response.ok ? response.json() : null))
    .then((data: unknown) => {
      const pool = readPool(data);
      if (!pool) return SHORTLIST_POOL;
      cache = pool;
      return cache;
    })
    .catch(() => SHORTLIST_POOL)
    .finally(() => {
      inFlight = null;
    });

  return inFlight;
}

/**
 * @param enabled fetch only once the field is actually in use. Passing false
 *                keeps the shortlist and costs nothing.
 */
export function useSchools(enabled: boolean): SchoolPool {
  const [schools, setSchools] = useState<SchoolPool>(cache ?? SHORTLIST_POOL);

  useEffect(() => {
    if (!enabled || cache) return;
    let live = true;
    void loadSchools().then((loaded) => {
      if (live) setSchools(loaded);
    });
    return () => {
      live = false;
    };
  }, [enabled]);

  return schools;
}
