import type { StatCode } from "./skills-catalog";

export type SkillForStats = {
  level: number;
  linked_stats: { stat: StatCode; weight: number }[];
};

/**
 * STR/END/INT are skill-derived (decision #4): weighted average of linked
 * skills' levels. MIND/VIT are computed elsewhere, directly from
 * quest_logs / vitality_logs — never from this function.
 */
export function computeSkillDerivedStat(
  code: "STR" | "END" | "INT",
  skills: SkillForStats[],
): number {
  let weightedSum = 0;
  let totalWeight = 0;

  for (const skill of skills) {
    const link = skill.linked_stats.find((l) => l.stat === code);
    if (!link) continue;
    weightedSum += skill.level * link.weight;
    totalWeight += link.weight;
  }

  const value = totalWeight > 0 ? weightedSum / totalWeight : 0;
  return Math.round(value * 10) / 10;
}

/** Floating radar-chart ceiling — decision #5. Keeps the chart from saturating as the character grows. */
export function statCeiling(characterLevel: number): number {
  return 20 + characterLevel * 2;
}

export const STAT_LABELS: Record<StatCode, string> = {
  STR: "STR",
  END: "END",
  VIT: "VIT",
  MIND: "MIND",
  INT: "INT",
};
