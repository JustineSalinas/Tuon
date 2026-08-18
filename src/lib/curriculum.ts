import type { EducationLevel, Strand } from "./types";

/**
 * Philippine Senior High School (K-12) subjects and college degree programs.
 *
 * These lists are a *helpful default*, not an exhaustive registry — SHS
 * offerings vary school to school, so every picker also accepts free text.
 */

export const EDUCATION_LEVELS: {
  value: EducationLevel;
  label: string;
  hint: string;
}[] = [
  { value: "grade_11", label: "Grade 11", hint: "Senior High School" },
  { value: "grade_12", label: "Grade 12", hint: "Senior High School" },
  { value: "college", label: "College", hint: "Undergraduate" },
];

export const STRANDS: {
  value: Strand;
  label: string;
  full: string;
  hint: string;
}[] = [
  {
    value: "stem",
    label: "STEM",
    full: "Science, Technology, Engineering and Mathematics",
    hint: "Chem, bio, physics, calculus",
  },
  {
    value: "abm",
    label: "ABM",
    full: "Accountancy, Business and Management",
    hint: "Business math, finance, management",
  },
  {
    value: "humss",
    label: "HUMSS",
    full: "Humanities and Social Sciences",
    hint: "Politics, social science, writing",
  },
  {
    value: "gas",
    label: "GAS",
    full: "General Academic Strand",
    hint: "Humanities, economics, social science",
  },
];

/** Taken by every SHS student regardless of strand. */
export const CORE_SUBJECTS = [
  "General Mathematics",
  "Earth and Life Science",
  "Physical Science",
  "21st Century Literature",
  "Oral Communication",
  "Understanding Culture, Society and Politics",
  "Reading and Writing",
] as const;

export const STRAND_SUBJECTS: Record<Strand, string[]> = {
  stem: [
    "General Chemistry 1",
    "General Chemistry 2",
    "General Biology 1",
    "General Biology 2",
    "General Physics 1",
    "General Physics 2",
    "Pre-Calculus",
    "Basic Calculus",
  ],
  abm: [
    "Fundamentals of ABM",
    "Business Math",
    "Business Finance",
    "Organization and Management",
  ],
  humss: [
    "Creative Writing",
    "Philippine Politics and Governance",
    "Disciplines and Ideas in the Social Sciences",
    "Community Engagement",
  ],
  gas: ["Humanities", "Applied Economics", "Social Science"],
};

/** College entrance exams — relevant to Grade 11-12 students. */
export const EXAM_PREP_SUBJECTS = [
  "UPCAT Prep",
  "ACET Prep",
  "DCAT Prep",
] as const;

/**
 * Degree programs. In Philippine usage "course" means the program/major
 * (e.g. "BS Nursing"), not an individual subject — so this is single-select.
 * Individual subjects get entered free-text per note instead.
 */
export const COLLEGE_PROGRAMS = [
  "BS Computer Science",
  "BS Information Technology",
  "BS Nursing",
  "BS Accountancy",
  "BS Business Administration",
  "BS Psychology",
  "BS Civil Engineering",
  "BS Electrical Engineering",
  "BS Mechanical Engineering",
  "BS Industrial Engineering",
  "BS Architecture",
  "BS Biology",
  "BS Pharmacy",
  "BS Criminology",
  "BS Tourism Management",
  "BS Hospitality Management",
  "BS Marketing Management",
  "AB Communication",
  "AB Political Science",
  "Bachelor of Elementary Education",
  "Bachelor of Secondary Education",
  "BS Medical Technology",
  "BS Physical Therapy",
  "BS Multimedia Arts",
] as const;

export interface SubjectGroup {
  label: string;
  description?: string;
  subjects: readonly string[];
}

/** Subject groups shown to a Grade 11-12 student for a given strand. */
export function getSubjectGroups(strand: Strand): SubjectGroup[] {
  const strandMeta = STRANDS.find((s) => s.value === strand);
  return [
    {
      label: "Core subjects",
      description: "Taken by every strand",
      subjects: CORE_SUBJECTS,
    },
    {
      label: `${strandMeta?.label ?? "Strand"} subjects`,
      description: strandMeta?.full,
      subjects: STRAND_SUBJECTS[strand],
    },
    {
      label: "Entrance exam prep",
      description: "Optional",
      subjects: EXAM_PREP_SUBJECTS,
    },
  ];
}

export function isSeniorHigh(level: EducationLevel | null): boolean {
  return level === "grade_11" || level === "grade_12";
}

export function educationLevelLabel(level: EducationLevel | null): string {
  return EDUCATION_LEVELS.find((l) => l.value === level)?.label ?? "Student";
}

export function strandLabel(strand: Strand | null): string | null {
  return STRANDS.find((s) => s.value === strand)?.label ?? null;
}
