"use client";

import { useState } from "react";
import { StatHistoryChart, type StatHistoryPoint } from "@/components/stat-history-chart";
import type { StatCode } from "@/lib/skills-catalog";

const NOT_SKILL_DERIVED_NOTE: Partial<Record<StatCode, string>> = {
  MIND: "Derived directly from quest completion rate and streak length — not tied to specific skills.",
  VIT: "Derived from daily sleep/recovery check-ins — not yet logged in this build, so this stays at 0 for now.",
};

function daysAgo(days: number): Date {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000);
}

export function StatDetailCard({
  code,
  currentValue,
  ceiling,
  history,
  feeders,
}: {
  code: StatCode;
  currentValue: number;
  ceiling: number;
  history: StatHistoryPoint[];
  feeders: string[];
}) {
  const [range, setRange] = useState<30 | 90>(30);
  const cutoff = daysAgo(range);
  const filtered = history.filter((h) => new Date(h.date) >= cutoff);

  const note =
    NOT_SKILL_DERIVED_NOTE[code] ??
    (feeders.length > 0
      ? `Fed by: ${feeders.join(", ")}`
      : "No skills feed this stat yet.");

  return (
    <div className="rounded-lg border border-border bg-surface p-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="font-mono text-xs uppercase tracking-wider text-muted">
            {code}
          </p>
          <p className="mt-1 font-mono text-2xl text-foreground">
            {currentValue} <span className="text-sm text-muted">/ {ceiling}</span>
          </p>
        </div>
        <div className="flex gap-1">
          {([30, 90] as const).map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => setRange(r)}
              className={`rounded px-2 py-1 font-mono text-xs transition-colors ${
                range === r
                  ? "bg-foreground text-background"
                  : "text-muted hover:text-foreground"
              }`}
            >
              {r}d
            </button>
          ))}
        </div>
      </div>

      <div className="mt-4">
        <StatHistoryChart points={filtered} />
      </div>

      <div className="mt-3 border-t border-border pt-3">
        <p className="text-xs text-muted">{note}</p>
      </div>
    </div>
  );
}
