"use client";

import { useEffect, useState } from "react";

import {
  schoolIndexPathFor,
  shortlistPoolFor,
  type SchoolPool,
} from "@/lib/schools";

/**
 * The full school index for a country, fetched the first time someone needs
 * it.
 *
 * ~9,000-30,000 institutions is a few hundred KB over the wire. That is small
 * for a desktop and not small for a student on prepaid mobile data in the
 * middle of signing up — so nobody pays for it until they put a cursor in the
 * school field, and nobody pays for it twice. A second country's index is a
 * second, independent cost: switching the country picker mid-onboarding must
 * not silently fetch a file the student never asked for.
 *
 * Until it lands, and if it never lands, the curated shortlist for that
 * country stands in — or an empty pool, for a country with no built index at
 * all. That is the important property: the field works with no network,
 * works on a failed fetch, and works while the index is still in flight. It
 * is an autocomplete over a free-text input, so the worst case is that a
 * student types their school in full — which is exactly what they did before
 * this existed, and what every unsupported country still does.
 *
 * One cache entry per country rather than one global promise: three
 * components mounting this hook for the same country still cost one request,
 * but a student who changes their country mid-onboarding gets the OTHER
 * country's index, not a stale one.
 */

const cache = new Map<string, SchoolPool>();
const inFlight = new Map<string, Promise<SchoolPool>>();

/** Trust nothing about the shape: a captive portal returns HTML with a 200. */
function readPool(data: unknown): SchoolPool | null {
  if (!data || typeof data !== "object") return null;
  const { hei, secondary } = data as Record<string, unknown>;
  const ok = (list: unknown) =>
    Array.isArray(list) && list.every((n) => typeof n === "string");
  if (!ok(hei) || !ok(secondary)) return null;
  return { hei: hei as string[], secondary: secondary as string[] };
}

function loadSchools(country: string, path: string, fallback: SchoolPool): Promise<SchoolPool> {
  const cached = cache.get(country);
  if (cached) return Promise.resolve(cached);
  const pending = inFlight.get(country);
  if (pending) return pending;

  const request = fetch(path)
    .then((response) => (response.ok ? response.json() : null))
    .then((data: unknown) => {
      const pool = readPool(data);
      if (!pool) return fallback;
      cache.set(country, pool);
      return pool;
    })
    .catch(() => fallback)
    .finally(() => {
      inFlight.delete(country);
    });

  inFlight.set(country, request);
  return request;
}

/**
 * @param enabled fetch only once the field is actually in use. Passing false
 *                keeps the shortlist and costs nothing.
 * @param country ISO alpha-2. A country with no built index resolves to an
 *                empty pool with no fetch attempted at all.
 */
export function useSchools(enabled: boolean, country: string | null | undefined): SchoolPool {
  const shortlist = shortlistPoolFor(country);
  const path = schoolIndexPathFor(country);
  const key = country ?? "";

  // Only ever holds a RESOLVED fetch, tagged with the country it resolved
  // for. A country switch before the fetch for the new one lands is handled
  // below by comparing `loaded.key` to the current `key` at render time —
  // never by resetting this in a second effect, which would just be
  // setState moved one line down instead of removed.
  const [loaded, setLoaded] = useState<{ key: string; pool: SchoolPool } | null>(null);

  useEffect(() => {
    if (!enabled || !path || cache.has(key)) return;
    let live = true;
    void loadSchools(key, path, shortlist).then((pool) => {
      if (live) setLoaded({ key, pool });
    });
    return () => {
      live = false;
    };
    // `shortlist` is derived from `country` each render, not its own input.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, key, path]);

  return cache.get(key) ?? (loaded?.key === key ? loaded.pool : shortlist);
}
