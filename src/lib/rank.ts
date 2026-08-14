// Rank titles layered on top of Character Level — CLAUDE.md "Resolved Design
// Decisions #11". Breakpoints widen as level increases, mirroring the
// character EXP curve, so rank-ups stay rare "big moments" rather than
// linear per-level feedback.

export const RANKS = ["E", "D", "C", "B", "A", "S"] as const;
export type Rank = (typeof RANKS)[number];

const RANK_FLOOR: Record<Rank, number> = {
  E: 1,
  D: 10,
  C: 20,
  B: 35,
  A: 55,
  S: 80,
};

export function rankForLevel(level: number): Rank {
  let current: Rank = "E";
  for (const rank of RANKS) {
    if (level >= RANK_FLOOR[rank]) current = rank;
  }
  return current;
}

/** Level at which the next rank up unlocks, or null if already at S. */
export function nextRankFloor(level: number): number | null {
  const currentRank = rankForLevel(level);
  const idx = RANKS.indexOf(currentRank);
  const next = RANKS[idx + 1];
  return next ? RANK_FLOOR[next] : null;
}
