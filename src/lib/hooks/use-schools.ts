"use client";

import { useEffect, useState } from "react";

import { SCHOOL_SUGGESTIONS } from "@/lib/schools";

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

let cache: readonly string[] | null = null;
let inFlight: Promise<readonly string[]> | null = null;

function loadSchools(): Promise<readonly string[]> {
  if (cache) return Promise.resolve(cache);
  if (inFlight) return inFlight;

  inFlight = fetch("/schools.json")
    .then((response) => (response.ok ? response.json() : null))
    .then((data: unknown) => {
      // Trust nothing about the shape: this is a static file, but a proxy or a
      // captive portal can return an HTML error page with a 200.
      if (!Array.isArray(data) || !data.every((n) => typeof n === "string")) {
        return SCHOOL_SUGGESTIONS;
      }
      cache = data as readonly string[];
      return cache;
    })
    .catch(() => SCHOOL_SUGGESTIONS)
    .finally(() => {
      inFlight = null;
    });

  return inFlight;
}

/**
 * @param enabled fetch only once the field is actually in use. Passing false
 *                keeps the shortlist and costs nothing.
 */
export function useSchools(enabled: boolean): readonly string[] {
  const [schools, setSchools] = useState<readonly string[]>(
    cache ?? SCHOOL_SUGGESTIONS,
  );

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
