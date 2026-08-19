/**
 * School suggestions for onboarding.
 *
 * This list is deliberately NOT authoritative. There are well over ten
 * thousand secondary and tertiary institutions in the Philippines, most of
 * them public high schools with no national name recognition, and a fixed
 * dropdown would quietly tell the average student that their school does not
 * count. So the field is free text; these only make the common cases faster
 * to type, and the typed value is always what gets saved.
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
export function suggestSchools(query: string, limit = 6): string[] {
  const q = query.trim().toLowerCase();
  if (q.length < 2) return [];

  const starts: string[] = [];
  const contains: string[] = [];

  for (const school of SCHOOL_SUGGESTIONS) {
    const lower = school.toLowerCase();
    if (lower === q) continue; // already typed exactly; nothing to offer
    if (lower.startsWith(q)) starts.push(school);
    else if (lower.includes(q)) contains.push(school);
    if (starts.length >= limit) break;
  }

  return [...starts, ...contains].slice(0, limit);
}

/** Collapses whitespace and trims; the stored form. */
export function normaliseSchool(value: string): string {
  return value.trim().replace(/\s+/g, " ").slice(0, MAX_SCHOOL_LENGTH);
}
