"use client";

import { useEffect, useState, type ReactNode } from "react";

/**
 * Full-screen moments in the app are rare and deliberate (Visual Direction:
 * "a full-screen overlay ONLY at Level Up / Rank Up moments — not
 * persistent"). Character Level Up and Boss quest completion both earn one;
 * skill level-ups and ordinary quests stay inline/small on purpose.
 */
export function MomentOverlay({
  kicker,
  children,
  onDone,
}: {
  kicker: string;
  children: ReactNode;
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
        className={`flex flex-col items-center gap-2 px-6 text-center transition-transform duration-300 ${
          visible ? "scale-100" : "scale-95"
        }`}
      >
        <p className="font-mono text-xs uppercase tracking-[0.4em] text-muted">
          {kicker}
        </p>
        {children}
      </div>
    </div>
  );
}
