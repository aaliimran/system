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
      <p className="max-w-sm text-2xl font-semibold text-foreground drop-shadow-[0_0_24px_rgba(237,237,238,0.35)]">
        {questTitle}
      </p>
    </MomentOverlay>
  );
}
