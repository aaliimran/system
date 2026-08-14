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

/** Inverse of skillCumulativeExpForLevel — highest level reachable with `totalExp`. */
export function skillLevelFromExp(totalExp: number): number {
  let level = 1;
  while (skillCumulativeExpForLevel(level + 1) <= totalExp) level++;
  return level;
}

/** Streak multiplier — CLAUDE.md "Resolved Design Decisions #2". Caps at +50% around a 10-day streak. */
export function streakMultiplier(streakDays: number): number {
  return Math.min(1 + 0.05 * streakDays, 1.5);
}

/** Cumulative EXP needed to have already reached `level` (character curve). */
export function characterCumulativeExpForLevel(level: number): number {
  let total = 0;
  for (let l = 1; l < level; l++) total += characterExpToNext(l);
  return total;
}

/** Inverse of characterCumulativeExpForLevel — highest character level reachable with `totalExp`. */
export function characterLevelFromExp(totalExp: number): number {
  let level = 1;
  while (characterCumulativeExpForLevel(level + 1) <= totalExp) level++;
  return level;
}

/** Progress within the current character level, for the EXP bar. */
export function characterLevelProgress(level: number, totalExp: number) {
  const levelStart = characterCumulativeExpForLevel(level);
  const levelSpan = characterExpToNext(level);
  const current = Math.max(0, totalExp - levelStart);
  const percent = levelSpan > 0 ? Math.min(current / levelSpan, 1) * 100 : 0;
  return { current, needed: levelSpan, percent };
}
