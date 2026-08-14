"use client";

import { MomentOverlay } from "./moment-overlay";

export function BossVictoryOverlay({
  questTitle,
  onDone,
}: {
  questTitle: string;
  onDone: () => void;
}) {
  return (
    <MomentOverlay kicker="Boss Defeated" onDone={onDone}>
      <p className="max-w-sm text-2xl font-semibold text-accent drop-shadow-[0_0_32px_rgba(34,211,238,0.5)]">
        {questTitle}
      </p>
    </MomentOverlay>
  );
}
