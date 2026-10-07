/**
 * Builds `public/schools-us.json` from the files `fetch-us-schools-source.mjs`
 * downloads into `scripts/sources/` — the US counterpart of
 * `build-schools.mjs`, same two-tier shape and the same reason for it: which
 * list a name came from is the only signal available about which of two
 * schools sharing a name is the bigger institution.
 *
 *   node scripts/build-us-schools.mjs
 *
 * No private K-12 directory is folded in — see `fetch-us-schools-source.mjs`
 * for why — so "secondary" here is public high schools only, the US
 * counterpart of dropping elementary from the PH list: a deliberate, named
 * gap rather than a silent one.
 */
import { existsSync, readFileSync, writeFileSync } from "node:fs";

const SCHOOLS_PATH = "scripts/sources/us-ccd-highschools-2022.json";
const COLLEGES_PATH = "scripts/sources/us-ipeds-colleges-2022.json";

for (const path of [SCHOOLS_PATH, COLLEGES_PATH]) {
  if (!existsSync(path)) {
    console.error(`missing ${path} — run \`node scripts/fetch-us-schools-source.mjs\` first.`);
    process.exit(1);
  }
}

/** Collapses whitespace. These are proper nouns; nothing else is touched. */
function tidy(value) {
  return String(value ?? "").replace(/\s+/g, " ").trim();
}

/** Case-fold dedupe, keeping the first spelling seen, then sorted. */
function tidyList(names, exclude) {
  const seen = new Map();
  for (const raw of names) {
    const name = tidy(raw);
    if (!name) continue;
    const key = name.toLowerCase();
    if (exclude?.has(key)) continue;
    if (!seen.has(key)) seen.set(key, name);
  }
  return [...seen.values()].sort((a, b) =>
    a.localeCompare(b, "en", { sensitivity: "base" }),
  );
}

const schoolRows = JSON.parse(readFileSync(SCHOOLS_PATH, "utf8"));
const collegeRows = JSON.parse(readFileSync(COLLEGES_PATH, "utf8"));

const secondaryNames = schoolRows.map((row) => row.school_name);
const heiNames = collegeRows.map((row) => row.inst_name);

// Higher education wins a name held by both, same rule the PH build uses.
const hei = tidyList(heiNames);
const heiKeys = new Set(hei.map((n) => n.toLowerCase()));
const secondary = tidyList(secondaryNames, heiKeys);

const json = JSON.stringify({ hei, secondary });
writeFileSync("public/schools-us.json", json);

console.log(`higher education          ${hei.length}`);
console.log(`public high schools       ${secondary.length}`);
console.log(`public/schools-us.json    ${(json.length / 1024).toFixed(0)} KB`);
