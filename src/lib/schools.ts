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
 * Suggestions matching what has been typed so far.
 *
 * Matches on any word boundary rather than only the start of the string, so
 * "Santo Tomas" and "UST"-style partial recall both land somewhere useful —
 * a student searching "tomas" should not have to know their school files
 * under U.
 */
export function suggestSchools(
  query: string,
  pool: readonly string[] = SCHOOL_SUGGESTIONS,
  limit = 6,
): string[] {
  const q = query.trim().toLowerCase();
  if (q.length < 2) return [];

  const starts: string[] = [];
  const contains: string[] = [];

  for (const school of pool) {
    const lower = school.toLowerCase();
    if (lower === q) continue; // already typed exactly; nothing to offer
    if (lower.startsWith(q)) starts.push(school);
    else if (lower.includes(q)) contains.push(school);
    // Only a full page of prefix matches can end the scan early. Breaking on
    // `contains` too would stop before finding better matches further down,
    // which over nine thousand rows is the difference between "Batangas
    // State" finding the university and finding a barangay high school.
    if (starts.length >= limit) break;
  }

  return [...starts, ...contains].slice(0, limit);
}

/** Collapses whitespace and trims; the stored form. */
export function normaliseSchool(value: string): string {
  return value.trim().replace(/\s+/g, " ").slice(0, MAX_SCHOOL_LENGTH);
}
