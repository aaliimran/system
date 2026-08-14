// Default skill tree — CLAUDE.md "Skills" section, with stat linkage from
// "Resolved Design Decisions #4". This seeds the skills table at onboarding;
// the user can add more skills later (skills are user-editable beyond this list).

export type StatCode = "STR" | "END" | "VIT" | "MIND" | "INT";
export type SkillCategory = "PHYSICAL" | "KNOWLEDGE_CRAFT" | "PERSONAL_DEVELOPMENT";

export type LinkedStat = { stat: StatCode; weight: number };

export type CatalogSkill = {
  key: string;
  name: string;
  category: SkillCategory;
  linkedStats: LinkedStat[];
  isMaintenance?: boolean;
  /** Skill offers a CEFR-tier objective question during onboarding (decision #3 example). */
  cefr?: boolean;
  subSkills?: string[];
};

export const SKILLS_CATALOG: CatalogSkill[] = [
  {
    key: "strength_training",
    name: "Strength Training",
    category: "PHYSICAL",
    linkedStats: [{ stat: "STR", weight: 1.0 }],
  },
  {
    key: "cardio",
    name: "Cardio",
    category: "PHYSICAL",
    linkedStats: [{ stat: "END", weight: 1.0 }],
  },
  {
    key: "flexibility_mobility",
    name: "Flexibility & Mobility",
    category: "PHYSICAL",
    linkedStats: [{ stat: "END", weight: 0.3 }],
  },
  {
    key: "martial_arts",
    name: "Martial Arts (Taekwondo)",
    category: "PHYSICAL",
    linkedStats: [
      { stat: "STR", weight: 0.5 },
      { stat: "END", weight: 0.5 },
    ],
  },
  {
    key: "cybersecurity",
    name: "Cybersecurity",
    category: "KNOWLEDGE_CRAFT",
    linkedStats: [{ stat: "INT", weight: 1.0 }],
    subSkills: ["Web Security", "Cryptography", "Reverse Engineering"],
  },
  {
    key: "programming",
    name: "Programming",
    category: "KNOWLEDGE_CRAFT",
    linkedStats: [{ stat: "INT", weight: 1.0 }],
  },
  {
    key: "korean",
    name: "Korean",
    category: "KNOWLEDGE_CRAFT",
    linkedStats: [{ stat: "INT", weight: 1.0 }],
    cefr: true,
  },
  {
    key: "english",
    name: "English",
    category: "KNOWLEDGE_CRAFT",
    linkedStats: [{ stat: "INT", weight: 1.0 }],
    isMaintenance: true,
    cefr: true,
  },
  {
    key: "turkish",
    name: "Turkish",
    category: "KNOWLEDGE_CRAFT",
    linkedStats: [{ stat: "INT", weight: 1.0 }],
    isMaintenance: true,
    cefr: true,
  },
  {
    key: "mathematics",
    name: "Mathematics",
    category: "KNOWLEDGE_CRAFT",
    linkedStats: [{ stat: "INT", weight: 1.0 }],
  },
  {
    key: "reading",
    name: "Reading",
    category: "PERSONAL_DEVELOPMENT",
    linkedStats: [{ stat: "INT", weight: 1.0 }],
  },
  {
    key: "public_speaking",
    name: "Public Speaking",
    category: "PERSONAL_DEVELOPMENT",
    linkedStats: [{ stat: "INT", weight: 1.0 }],
  },
  {
    key: "video_editing",
    name: "Video Editing",
    category: "PERSONAL_DEVELOPMENT",
    linkedStats: [{ stat: "INT", weight: 1.0 }],
  },
  {
    key: "business",
    name: "Business/Entrepreneurship",
    category: "PERSONAL_DEVELOPMENT",
    linkedStats: [{ stat: "INT", weight: 1.0 }],
  },
];

export const CATEGORY_LABELS: Record<SkillCategory, string> = {
  PHYSICAL: "Physical",
  KNOWLEDGE_CRAFT: "Knowledge & Craft",
  PERSONAL_DEVELOPMENT: "Personal Development",
};
