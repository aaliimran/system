"use client";

import { MomentOverlay } from "./moment-overlay";
import type { Rank } from "@/lib/rank";

export function RankUpOverlay({
  rank,
  onDone,
}: {
  rank: Rank;
  onDone: () => void;
}) {
  return (
    <MomentOverlay kicker="Rank Up" onDone={onDone}>
      <p className="font-mono text-9xl text-accent drop-shadow-[0_0_48px_rgba(34,211,238,0.65)]">
        {rank}
      </p>
      <p className="mt-1 font-mono text-xs uppercase tracking-[0.3em] text-muted">
        Rank {rank}
      </p>
    </MomentOverlay>
  );
}
