"use client";

import { useEffect, useState } from "react";

/**
 * The one full-screen moment in the app — reserved for Character Level Up
 * only (Visual Direction: "a full-screen overlay ONLY at Level Up / Rank Up
 * moments — not persistent"). Skill level-ups stay inline/small on purpose.
 */
export function LevelUpOverlay({
  level,
  onDone,
}: {
  level: number;
  onDone: () => void;
}) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const show = requestAnimationFrame(() => setVisible(true));
    const dismiss = setTimeout(() => {
      setVisible(false);
      setTimeout(onDone, 300);
    }, 2200);
    return () => {
      cancelAnimationFrame(show);
      clearTimeout(dismiss);
    };
  }, [onDone]);

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center bg-background/90 backdrop-blur-sm transition-opacity duration-300 ${
        visible ? "opacity-100" : "opacity-0"
      }`}
      onClick={() => {
        setVisible(false);
        setTimeout(onDone, 300);
      }}
    >
      <div
        className={`flex flex-col items-center gap-2 transition-transform duration-300 ${
          visible ? "scale-100" : "scale-95"
        }`}
      >
        <p className="font-mono text-xs uppercase tracking-[0.4em] text-muted">
          Level Up
        </p>
        <p className="font-mono text-8xl text-foreground drop-shadow-[0_0_24px_rgba(237,237,238,0.35)]">
          {level}
        </p>
      </div>
    </div>
  );
}
