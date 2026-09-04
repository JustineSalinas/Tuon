/**
 * Schools, for the one field that asks where a student actually studies.
 *
 * The field is still FREE TEXT and always was: a dropdown that cannot spell
 * your school tells you your school does not count, and no list of a country's
 * schools is ever complete or current. What has changed is the size of the
 * help — the suggester now searches 9,465 secondary schools and higher
 * education institutions from `public/schools.json`, built by
 * `scripts/build-schools.mjs` from the DepEd masterlist and CHED's list of
 * recognised HEIs.
 *
 * The list below survives as the INSTANT pool. It is in the bundle, so the
 * first keystroke answers with no network at all, and for the institutions
 * most students attend that is the entire interaction — the 335 KB index is
 * only fetched if these do not have the answer.
 *
 * Ordering is roughly by how many students an institution enrols, not by
 * prestige — the goal is fewer keystrokes, not a ranking.
 */

export const SCHOOL_SUGGESTIONS = [
  // Large public university systems
  "University of the Philippines",
  "Polytechnic University of the Philippines",
  "Mindanao State University",
  "Technological University of the Philippines",
  "Rizal Technological University",
  "Batangas State University",
  "Cebu Technological University",
  "Bulacan State University",
  "Pangasinan State University",
  "Central Luzon State University",
  "Bicol University",
  "Western Mindanao State University",
  "University of Southeastern Philippines",
  "Cavite State University",
  "Nueva Ecija University of Science and Technology",

  // City and provincial universities
  "Universidad de Manila",
  "Pamantasan ng Lungsod ng Maynila",
  "Quezon City University",
  "University of Makati",
  "Cebu Normal University",

  // Large private institutions
  "University of Santo Tomas",
  "Far Eastern University",
  "University of the East",
  "National University",
  "Adamson University",
  "Mapúa University",
  "De La Salle University",
  "Ateneo de Manila University",
  "University of San Carlos",
  "Silliman University",
  "Xavier University – Ateneo de Cagayan",
  "Ateneo de Davao University",
  "University of San Jose–Recoletos",
  "Saint Louis University",
  "Centro Escolar University",
  "Lyceum of the Philippines University",
  "San Beda University",
  "Mariano Marcos State University",
  "Holy Angel University",
  "Angeles University Foundation",
  "University of Mindanao",
  "Southwestern University PHINMA",
  "Our Lady of Fatima University",
  "AMA University",
  "STI College",
  "Informatics College",
] as const;

/** Longest school name we will store. Generous — some are very long. */
export const MAX_SCHOOL_LENGTH = 120;

/**
 * The two tiers, kept apart on purpose.
 *
 * Not a cosmetic split: it is the only signal available about which of two
 * schools sharing a name is the bigger institution. There are 7,136 secondary
 * schools and 2,333 higher education institutions, and a search for a
 * distinctive name almost always means the one there are fewer of.
 */
export interface SchoolPool {
  readonly hei: readonly string[];
  readonly secondary: readonly string[];
}

/** The curated shortlist, as a pool. All of these are higher education. */
export const SHORTLIST_POOL: SchoolPool = {
  hei: SCHOOL_SUGGESTIONS,
  secondary: [],
};

/**
 * Words that are never part of how anyone abbreviates a school.
 *
 * "University of San Agustin" is USA, not UOSA, and "Colegio de San Juan de
 * Letran" is CSJL. Dropping these is what makes the initials match what a
 * student actually types.
 */
const SKIPPED = new Set(["of", "the", "and", "de", "del", "des", "for", "in", "at"]);

/**
 * The initials a school is known by.
 *
 * Taken from the part BEFORE any campus suffix, because a campus is not part
 * of the name anyone abbreviates: "West Visayas State University-Main" has to
 * answer to WVSU, and taking initials from the whole string would make it
 * WVSUM and match nothing anyone types.
 */
export function acronymOf(name: string): string {
  const base = name.split(/[-–,(]/)[0];
  return base
    .split(/[^A-Za-zñÑ]+/)
    .filter((word) => word && !SKIPPED.has(word.toLowerCase()))
    .map((word) => word[0]!.toLowerCase())
    .join("");
}

/**
 * How many of the six slots higher education may take before secondary gets a
 * turn.
 *
 * Half, rather than all: whichever tier the student meant, the other one is
 * still on screen. Letting higher education take the lot fixed "san agustin"
 * and broke "iloilo", where the colleges would have pushed Iloilo National
 * High School off a list a Senior High student was reading.
 */
const HEI_RESERVE = 3;

/**
 * Shortest first, within a set of names that all already match.
 *
 * A stand-in for coverage — the share of the name the query accounts for —
 * which for a fixed query is the same ordering and cheaper to compute. It is
 * the difference between "san agustin" reaching the University of San Agustin
 * and stopping at two Colegios and an institute of technology, and it puts the
 * main campus above its branches for free.
 */
function byCoverage(a: string, b: string): number {
  return a.length - b.length || a.localeCompare(b);
}

/** Prefix matches first, then anything containing the query. */
function rank(pool: readonly string[], q: string): string[] {
  const starts: string[] = [];
  const contains: string[] = [];
  for (const school of pool) {
    const lower = school.toLowerCase();
    if (lower === q) continue; // already typed exactly; nothing to offer
    if (lower.startsWith(q)) starts.push(school);
    else if (lower.includes(q)) contains.push(school);
  }
  return [...starts.sort(byCoverage), ...contains.sort(byCoverage)];
}

/**
 * Suggestions matching what has been typed so far.
 *
 * Order is: schools whose initials ARE the query, then higher education, then
 * secondary, with the two tiers interleaved so neither can crowd the other
 * out. Within a tier, names that start with the query beat names that merely
 * contain it — a student typing "tomas" should not have to know their school
 * files under U.
 */
export function suggestSchools(
  query: string,
  pool: SchoolPool = SHORTLIST_POOL,
  limit = 6,
): string[] {
  const q = query.trim().toLowerCase();
  if (q.length < 2) return [];

  const picked: string[] = [];
  const add = (name: string) => {
    if (picked.length < limit && !picked.includes(name)) picked.push(name);
  };

  // Initials first. Someone who typed CPU knows exactly what they meant, and
  // no substring match deserves to sit above that.
  for (const tier of [pool.hei, pool.secondary]) {
    tier
      .filter((school) => acronymOf(school) === q)
      .sort(byCoverage)
      .forEach(add);
  }

  const hei = rank(pool.hei, q);
  const secondary = rank(pool.secondary, q);

  hei.slice(0, HEI_RESERVE).forEach(add);
  secondary.forEach(add);
  hei.forEach(add);

  return picked;
}

/** Collapses whitespace and trims; the stored form. */
export function normaliseSchool(value: string): string {
  return value.trim().replace(/\s+/g, " ").slice(0, MAX_SCHOOL_LENGTH);
}
