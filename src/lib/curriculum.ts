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
  {
    value: "board_review",
    label: "Board or licensure review",
    hint: "Reviewing for a PRC exam or the Bar",
  },
];

/**
 * PRC licensure exams and the Bar. Single-select like a degree program: you
 * review for one at a time. Free text covers the rest — PRC administers
 * dozens more than it is useful to list.
 */
export const BOARD_EXAMS = [
  "Nursing (NLE)",
  "Licensure Exam for Teachers (LET)",
  "Certified Public Accountant (CPALE)",
  "Criminology (CLE)",
  "Civil Engineering",
  "Mechanical Engineering",
  "Electrical Engineering",
  "Electronics Engineering",
  "Medical Technology (MTLE)",
  "Midwifery",
  "Pharmacy",
  "Physical Therapy",
  "Psychometrician",
  "Social Work",
  "Nutrition and Dietetics",
  "Radiologic Technology",
  "Agriculture",
  "Architecture",
  "Master Plumber",
  "Real Estate Broker",
  "Customs Broker",
  "Marine Deck Officer",
  "Marine Engineer Officer",
  "Physician (PLE)",
  "Dentistry",
  "Veterinary Medicine",
  "Bar Examination",
] as const;

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
  {
    value: "tvl_he",
    label: "TVL — Home Economics",
    full: "Tech-Voc Livelihood: Home Economics",
    hint: "Cookery, baking, caregiving, tourism",
  },
  {
    value: "tvl_ict",
    label: "TVL — ICT",
    full: "Tech-Voc Livelihood: Information and Communications Technology",
    hint: "Programming, computer servicing, animation",
  },
  {
    value: "tvl_ia",
    label: "TVL — Industrial Arts",
    full: "Tech-Voc Livelihood: Industrial Arts",
    hint: "EIM, welding, automotive, plumbing",
  },
  {
    value: "tvl_afa",
    label: "TVL — Agri-Fishery",
    full: "Tech-Voc Livelihood: Agri-Fishery Arts",
    hint: "Crops, animals, aquaculture, food processing",
  },
  {
    value: "sports",
    label: "Sports",
    full: "Sports Track",
    hint: "Coaching, officiating, fitness, first aid",
  },
  {
    value: "arts",
    label: "Arts and Design",
    full: "Arts and Design Track",
    hint: "Media, visual, literary, dance, music, theatre",
  },
];

/**
 * Which DepEd track each strand sits under, for grouping the picker.
 * Sports and Arts and Design are tracks with no strands beneath them.
 */
export const STRAND_TRACKS: { track: string; strands: Strand[] }[] = [
  { track: "Academic", strands: ["stem", "abm", "humss", "gas"] },
  { track: "Tech-Voc Livelihood", strands: ["tvl_he", "tvl_ict", "tvl_ia", "tvl_afa"] },
  { track: "Sports and Arts", strands: ["sports", "arts"] },
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

  // TVL specialisations vary a lot by school — these are the common NC II
  // qualifications, and the picker still takes free text for the rest.
  tvl_he: [
    "Cookery",
    "Bread and Pastry Production",
    "Food and Beverage Services",
    "Housekeeping",
    "Tourism Promotion Services",
    "Caregiving",
    "Dressmaking",
    "Beauty Care and Nail Care",
  ],
  tvl_ict: [
    "Computer Systems Servicing",
    "Computer Programming",
    "Animation",
    "Illustration",
    "Technical Drafting",
    "Contact Center Services",
    "Empowerment Technologies",
  ],
  tvl_ia: [
    "Electrical Installation and Maintenance",
    "Shielded Metal Arc Welding",
    "Automotive Servicing",
    "Electronics Products Assembly and Servicing",
    "Refrigeration and Air-Conditioning Servicing",
    "Carpentry",
    "Masonry",
    "Plumbing",
  ],
  tvl_afa: [
    "Agricultural Crops Production",
    "Animal Production",
    "Organic Agriculture Production",
    "Aquaculture",
    "Fish Capture",
    "Food Processing",
    "Horticulture",
  ],

  sports: [
    "Safety and First Aid",
    "Human Movement",
    "Fundamentals of Coaching",
    "Sports Officiating and Activity Management",
    "Fitness Testing and Basic Exercise Programming",
    "Psychosocial Aspects of Sports and Exercise",
    "Fitness Education",
  ],
  arts: [
    "Creative Industries I: Arts and Design Appreciation and Production",
    "Creative Industries II: Performing Arts",
    "Physical and Personal Development in the Arts",
    "Developing Filipino Identity in the Arts",
    "Integrating the Elements and Principles of Organization in the Arts",
    "Leadership and Management in Different Arts Fields",
    "Apprenticeship and Exploration of Different Arts Fields",
  ],
};

/** Shared by every TVL strand, whatever the specialisation. */
export const TVL_COMMON_SUBJECTS = [
  "Entrepreneurship",
  "Practical Research 1",
  "Practical Research 2",
  "Work Immersion",
] as const;

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
    // Every TVL strand carries these on top of its specialisation.
    ...(strand.startsWith("tvl_")
      ? [
          {
            label: "Also in every TVL strand",
            description: undefined,
            subjects: TVL_COMMON_SUBJECTS,
          },
        ]
      : []),
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

/** True when the picker should offer licensure exams rather than programs. */
export function isBoardReview(level: EducationLevel | null): boolean {
  return level === "board_review";
}

export function educationLevelLabel(level: EducationLevel | null): string {
  return EDUCATION_LEVELS.find((l) => l.value === level)?.label ?? "Student";
}

export function strandLabel(strand: Strand | null): string | null {
  return STRANDS.find((s) => s.value === strand)?.label ?? null;
}
