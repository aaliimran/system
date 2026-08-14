// EXP curve formulas — CLAUDE.md "Resolved Design Decisions #1".

export function skillExpToNext(level: number): number {
  return Math.round(50 * Math.pow(level, 1.3));
}

export function characterExpToNext(level: number): number {
  return Math.round(100 * Math.pow(level, 1.5));
}

/** Cumulative EXP needed to have already reached `level` (i.e. sum of costs for levels 1..level-1). */
export function skillCumulativeExpForLevel(level: number): number {
  let total = 0;
  for (let l = 1; l < level; l++) total += skillExpToNext(l);
  return total;
}

/** Streak multiplier — CLAUDE.md "Resolved Design Decisions #2". Caps at +50% around a 10-day streak. */
export function streakMultiplier(streakDays: number): number {
  return Math.min(1 + 0.05 * streakDays, 1.5);
}
