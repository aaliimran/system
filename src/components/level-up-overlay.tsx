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
      <p className="font-mono text-8xl text-foreground drop-shadow-[0_0_24px_rgba(237,237,238,0.35)]">
        {level}
      </p>
    </MomentOverlay>
  );
}
