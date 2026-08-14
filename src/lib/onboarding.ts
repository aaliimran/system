// Self-rating -> starting Skill Level mapping — CLAUDE.md "Resolved Design Decisions #3".

export const CEFR_TIERS = ["A1", "A2", "B1", "B2", "C1", "C2"] as const;
export type CefrTier = (typeof CEFR_TIERS)[number];

const SELF_RATING_BASE_LEVEL: Record<number, number> = {
  1: 1,
  2: 5,
  3: 10,
  4: 15,
  5: 20,
};

const CEFR_LEVEL_NUDGE: Record<CefrTier, number> = {
  A1: 0,
  A2: 2,
  B1: 4,
  B2: 6,
  C1: 8,
  C2: 10,
};

export function startingSkillLevel(selfRating: number, cefr?: CefrTier | null): number {
  const base = SELF_RATING_BASE_LEVEL[selfRating] ?? 1;
  const nudge = cefr ? CEFR_LEVEL_NUDGE[cefr] : 0;
  return base + nudge;
}
