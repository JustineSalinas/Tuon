/**
 * Downloads the raw US directories build-schools.mjs builds from, into
 * scripts/sources/ as local files — mirroring the PH pipeline's own rule
 * that the build step itself reads only local files, never the network, so
 * it cannot silently change because someone else edited a remote dataset.
 * This script is the one-time (or periodically re-run) exception that
 * creates those local files in the first place.
 *
 * Source: the Urban Institute's Education Data Portal
 * (educationdata.urban.org), which republishes two NCES surveys as a
 * paginated JSON API:
 *   - CCD directory (public K-12): school_level=3 (high), school_status=1
 *     (currently open), year 2022 — the most recent complete year available.
 *   - IPEDS directory (postsecondary): inst_status=1 (active), year 2022.
 *
 * No private K-12 directory is available through this API (NCES's Private
 * School Universe Survey is not one of its endpoints), so the US school
 * suggester is public high schools + all active postsecondary institutions
 * only, documented the same way the PH list documents dropping elementary.
 */
import { mkdirSync, writeFileSync } from "node:fs";

const YEAR = 2022;
const OUT_DIR = "scripts/sources";
mkdirSync(OUT_DIR, { recursive: true });

async function fetchAllPages(url) {
  const results = [];
  let next = url;
  while (next) {
    const response = await fetch(next, {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; tuon-build-script/1.0)" },
    });
    if (!response.ok) throw new Error(`${next} -> ${response.status}`);
    const body = await response.json();
    results.push(...body.results);
    next = body.next;
    console.log(`  ${results.length} / ${body.count}`);
  }
  return results;
}

console.log("Public high schools (CCD)...");
const schools = await fetchAllPages(
  `https://educationdata.urban.org/api/v1/schools/ccd/directory/${YEAR}/?school_level=3&school_status=1`,
);
writeFileSync(`${OUT_DIR}/us-ccd-highschools-${YEAR}.json`, JSON.stringify(schools));
console.log(`wrote ${schools.length} high schools`);

console.log("\nPostsecondary institutions (IPEDS)...");
const colleges = await fetchAllPages(
  `https://educationdata.urban.org/api/v1/college-university/ipeds/directory/${YEAR}/?inst_status=1`,
);
writeFileSync(`${OUT_DIR}/us-ipeds-colleges-${YEAR}.json`, JSON.stringify(colleges));
console.log(`wrote ${colleges.length} postsecondary institutions`);
