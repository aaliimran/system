"use client";

import { MomentOverlay } from "./moment-overlay";

export function LevelUpOverlay({
  level,
  onDone,
}: {
  level: number;
  onDone: () => void;
}) {
  return (
    <MomentOverlay kicker="Level Up" onDone={onDone}>
      <p className="font-mono text-8xl text-accent drop-shadow-[0_0_32px_rgba(34,211,238,0.5)]">
        {level}
      </p>
    </MomentOverlay>
  );
}
