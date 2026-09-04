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
 * The output keeps the two tiers APART — `{ hei, secondary }` — because which
 * list a name came from is the only signal available about which of two
 * schools sharing a name is the bigger institution, and the suggester needs it
 * to stop 7,136 high schools burying 2,333 universities. Beyond that it is
 * just sorted, deduplicated names: no ids, no addresses, no coordinates, since
 * the field stores what the student typed and the rest would be weight nobody
 * reads.
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

const secondaryNames = new Set();
const heiNames = new Set();
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
    if (name) secondaryNames.add(name);
  }
}

// ----------------------------------------------------------------- CHED
{
  const lines = readFileSync(chedPath, "utf8").split(/\r?\n/);
  const header = splitCsv(lines[0]).map((h) => h.trim().toUpperCase());
  const nameAt = header.indexOf("INSTITUTION NAME");
  if (nameAt < 0) throw new Error("CHED file is missing an INSTITUTION NAME column");

  for (const line of lines.slice(1)) {
    if (!line) continue;
    const name = tidy(splitCsv(line)[nameAt] ?? "");
    if (name) heiNames.add(name);
  }
}

/** Case-fold dedupe, keeping the first spelling seen, then sorted. */
function tidyList(set, exclude) {
  const seen = new Map();
  for (const name of set) {
    const key = name.toLowerCase();
    if (exclude?.has(key)) continue;
    if (!seen.has(key)) seen.set(key, name);
  }
  return [...seen.values()].sort((a, b) =>
    a.localeCompare(b, "en", { sensitivity: "base" }),
  );
}

// Higher education wins a name held by both. A handful of institutions run a
// secondary department under the same name, and the university is what
// somebody typing it almost always means.
const hei = tidyList(heiNames);
const heiKeys = new Set(hei.map((n) => n.toLowerCase()));
const secondary = tidyList(secondaryNames, heiKeys);

const json = JSON.stringify({ hei, secondary });
writeFileSync("public/schools.json", json);

console.log(`elementary rows dropped   ${dropped}`);
console.log(`higher education          ${hei.length}`);
console.log(`secondary schools         ${secondary.length}`);
console.log(`public/schools.json       ${(json.length / 1024).toFixed(0)} KB`);
