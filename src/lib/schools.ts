/**
 * Schools, for the one field that asks where a student actually studies.
 *
 * The field is still FREE TEXT and always was: a dropdown that cannot spell
 * your school tells you your school does not count, and no list of a country's
 * schools is ever complete or current. What has changed is the size of the
 * help — for the two countries with a built index (currently PH and US), the
 * suggester searches a full secondary/higher-education list fetched from
 * `public/schools-{country}.json`, built per country from that country's own
 * government data (`scripts/build-schools.mjs` for PH, `build-us-schools.mjs`
 * for US). Everywhere else, the field is exactly what it always was: free
 * text alone, no suggestions — a missing index is a silent, honest gap, not
 * an error.
 *
 * The lists below survive as the INSTANT pools, one per supported country.
 * Each is in the bundle, so the first keystroke answers with no network at
 * all, and for the institutions most students attend that is the entire
 * interaction — the full index is only fetched if these do not have the
 * answer. See `shortlistPoolFor` and `schoolIndexPathFor` for how a country
 * resolves to one of these, or to neither.
 *
 * Ordering is roughly by how many students an institution enrols, not by
 * prestige — the goal is fewer keystrokes, not a ranking.
 */

export const PH_SCHOOL_SUGGESTIONS = [
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

/**
 * The US instant pool: large state-flagship and well-known private
 * universities, plus a handful of the biggest public school districts.
 * Unlike the Philippines, no single US high school is nationally
 * recognisable enough to earn a spot here — the district is the thing a
 * student would actually type and search for, same as PH students search for
 * a university system rather than one specific campus.
 */
export const US_SCHOOL_SUGGESTIONS = [
  // Large public university systems and flagships
  "University of California, Los Angeles",
  "University of California, Berkeley",
  "University of Texas at Austin",
  "Texas A&M University",
  "Arizona State University",
  "Ohio State University",
  "Pennsylvania State University",
  "University of Florida",
  "Florida International University",
  "University of Central Florida",
  "University of Michigan",
  "Michigan State University",
  "University of Washington",
  "University of Illinois Urbana-Champaign",
  "Rutgers University",
  "University of Georgia",
  "Georgia State University",
  "Indiana University Bloomington",
  "University of Wisconsin-Madison",
  "University of Minnesota",
  "University of North Carolina at Chapel Hill",
  "North Carolina State University",
  "University of Virginia",
  "Virginia Tech",
  "University of Maryland",
  "University of Arizona",
  "San Diego State University",
  "California State University, Long Beach",
  "University of Hawaii at Manoa",

  // Large private institutions
  "New York University",
  "Columbia University",
  "Harvard University",
  "Stanford University",
  "Massachusetts Institute of Technology",
  "University of Southern California",
  "Boston University",
  "Northeastern University",
  "University of Chicago",
  "Cornell University",
  "Yale University",
  "Princeton University",

  // Large public school districts — the unit a K-12 student actually
  // searches for, same role the university system plays above.
  "New York City Department of Education",
  "Los Angeles Unified School District",
  "Chicago Public Schools",
  "Miami-Dade County Public Schools",
  "Clark County School District",
  "Houston Independent School District",
] as const;

/** Longest school name we will store. Generous — some are very long. */
export const MAX_SCHOOL_LENGTH = 120;

/**
 * The two tiers, kept apart on purpose.
 *
 * Not a cosmetic split: it is the only signal available about which of two
 * schools sharing a name is the bigger institution. For the Philippines
 * there are 7,136 secondary schools and 2,333 higher education institutions,
 * and a search for a distinctive name almost always means the one there are
 * fewer of.
 */
export interface SchoolPool {
  readonly hei: readonly string[];
  readonly secondary: readonly string[];
}

/** The curated PH shortlist, as a pool. All of these are higher education. */
export const PH_SHORTLIST_POOL: SchoolPool = {
  hei: PH_SCHOOL_SUGGESTIONS,
  secondary: [],
};

/** The curated US shortlist, as a pool. All of these are higher education or
    a district standing in for its schools — see US_SCHOOL_SUGGESTIONS. */
export const US_SHORTLIST_POOL: SchoolPool = {
  hei: US_SCHOOL_SUGGESTIONS,
  secondary: [],
};

const EMPTY_POOL: SchoolPool = { hei: [], secondary: [] };

/** Countries with a built school index — see `scripts/build-schools.mjs`. */
export type SchoolAutocompleteCountry = "PH" | "US";

export function isSchoolAutocompleteCountry(
  country: string | null | undefined,
): country is SchoolAutocompleteCountry {
  return country === "PH" || country === "US";
}

/** The bundled instant pool for a country, or an empty pool for anywhere
    without a built index — the field still works, it just offers nothing
    until the student has typed the whole name themselves. */
export function shortlistPoolFor(country: string | null | undefined): SchoolPool {
  if (country === "PH") return PH_SHORTLIST_POOL;
  if (country === "US") return US_SHORTLIST_POOL;
  return EMPTY_POOL;
}

/** Where the full index for a country is served from, or null if there is
    none to fetch. */
export function schoolIndexPathFor(country: string | null | undefined): string | null {
  if (country === "PH") return "/schools-ph.json";
  if (country === "US") return "/schools-us.json";
  return null;
}

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
 *
 * A comma does NOT introduce a campus suffix, even though a hyphen, en dash
 * or open paren does: no PH name uses one this way, and plenty of US names
 * use a comma as part of the institution's actual name rather than a
 * separator — "University of California, Los Angeles" has to answer to UCLA,
 * not UC, which is what splitting on the comma first used to produce.
 */
export function acronymOf(name: string): string {
  const base = name.split(/[-–(]/)[0];
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
export function suggestSchools(query: string, pool: SchoolPool, limit = 6): string[] {
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
