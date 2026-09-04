/**
 * Builds `public/schools.json` — every school a Tuón student might attend.
 *
 * Run with two locally-downloaded source files rather than fetching at build
 * time. Both sources are third-party mirrors of government data, and a build
 * that silently changes because someone else edited a repo is not a build:
 *
 *   node scripts/build-schools.mjs <deped.tsv> <ched.csv>
 *
 *   deped.tsv  OSMaPaaralan, the cleaned DepEd masterlist
 *              https://github.com/OSMPH/deped_schools_db (data/2019)
 *   ched.csv   CHED's list of recognised higher education institutions
 *              https://github.com/Kakashimoto14/ched-api (institutions.csv)
 *
 * ELEMENTARY SCHOOLS ARE DROPPED, deliberately. Tuón is for Senior High,
 * college and board reviewers; nobody using it is in Grade 3, and including
 * 36,000 primary schools would triple the download to make the right answer
 * harder to find. ISCED 2 and 3 are lower and upper secondary — upper
 * secondary IS Senior High — so those stay, and so does every HEI.
 *
 * The output is a flat array of names, sorted, deduplicated case-insensitively.
 * No ids, no addresses, no coordinates: the field stores what the student
 * typed, and everything else would be weight nobody reads.
 */

import { readFileSync, writeFileSync } from "node:fs";

const [, , depedPath, chedPath] = process.argv;
if (!depedPath || !chedPath) {
  console.error("usage: node scripts/build-schools.mjs <deped.tsv> <ched.csv>");
  process.exit(1);
}

/** Splits one CSV line, honouring quoted fields containing commas. */
function splitCsv(line) {
  const out = [];
  let field = "";
  let quoted = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (quoted) {
      if (ch === '"' && line[i + 1] === '"') {
        field += '"';
        i++;
      } else if (ch === '"') quoted = false;
      else field += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === ",") {
      out.push(field);
      field = "";
    } else field += ch;
  }
  out.push(field);
  return out;
}

/**
 * Collapses whitespace and unwraps CSV quoting. Nothing else — these are
 * proper nouns and every other character in them is somebody's school.
 *
 * The unwrap is needed on the TAB-separated file too: a handful of its name
 * fields are CSV-quoted anyway, around nicknames — Benigno "Ninoy" S. Aquino
 * High School — and splitting on tabs leaves the wrapper on. Four names, and
 * all four sorted above every real school because a quote precedes "A".
 */
function tidy(value) {
  let out = value.replace(/\s+/g, " ").trim();
  if (out.startsWith('"') && out.endsWith('"') && out.length > 1) {
    out = out.slice(1, -1);
  }
  return out.replace(/""/g, '"').trim();
}

const names = new Set();
let dropped = 0;

// ---------------------------------------------------------------- DepEd
{
  const lines = readFileSync(depedPath, "utf8").split(/\r?\n/);
  const header = lines[0].split("\t");
  const nameAt = header.indexOf("name");
  const levelAt = header.indexOf("isced:level");
  if (nameAt < 0 || levelAt < 0) throw new Error("DepEd file is missing expected columns");

  for (const line of lines.slice(1)) {
    if (!line) continue;
    const cells = line.split("\t");
    const level = cells[levelAt];
    // "0-1" is preschool plus elementary and "1" is elementary; neither is a
    // school any Tuón user attends.
    if (level !== "2" && level !== "3" && level !== "2-3") {
      dropped++;
      continue;
    }
    const name = tidy(cells[nameAt] ?? "");
    if (name) names.add(name);
  }
}
const afterDeped = names.size;

// ----------------------------------------------------------------- CHED
{
  const lines = readFileSync(chedPath, "utf8").split(/\r?\n/);
  const header = splitCsv(lines[0]).map((h) => h.trim().toUpperCase());
  const nameAt = header.indexOf("INSTITUTION NAME");
  if (nameAt < 0) throw new Error("CHED file is missing an INSTITUTION NAME column");

  for (const line of lines.slice(1)) {
    if (!line) continue;
    const name = tidy(splitCsv(line)[nameAt] ?? "");
    if (name) names.add(name);
  }
}

// Dedupe case-insensitively, keeping the first spelling seen.
const seen = new Map();
for (const name of names) {
  const key = name.toLowerCase();
  if (!seen.has(key)) seen.set(key, name);
}

const sorted = [...seen.values()].sort((a, b) =>
  a.localeCompare(b, "en", { sensitivity: "base" }),
);

writeFileSync("public/schools.json", JSON.stringify(sorted));

console.log(`elementary rows dropped   ${dropped}`);
console.log(`secondary schools         ${afterDeped}`);
console.log(`+ higher education        ${names.size - afterDeped}`);
console.log(`after case-fold dedupe    ${sorted.length}`);
console.log(`public/schools.json       ${(JSON.stringify(sorted).length / 1024).toFixed(0)} KB`);
