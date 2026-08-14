"use client";

import { useState } from "react";
import { QuestItem, type QuestItemData } from "@/components/quest-item";
import { AddMilestoneForm } from "./add-milestone-form";

export function MainQuestCard({
  quest,
  milestones,
}: {
  quest: QuestItemData;
  milestones: QuestItemData[];
}) {
  const [showAdd, setShowAdd] = useState(false);
  const completedCount = milestones.filter((m) => m.status === "completed").length;
  const hasMilestones = milestones.length > 0;
  const percent = hasMilestones
    ? Math.round((completedCount / milestones.length) * 100)
    : 0;

  return (
    <div className="rounded-lg border border-border bg-surface p-4">
      <QuestItem quest={quest} />

      {hasMilestones && (
        <div className="mt-3">
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-border">
            <div
              key={percent}
              className="glow-pulse h-full rounded-full bg-accent"
              style={{ width: `${percent}%` }}
            />
          </div>
          <p className="mt-1 font-mono text-[11px] text-muted">
            {completedCount}/{milestones.length} milestones
          </p>
        </div>
      )}

      {hasMilestones && (
        <div className="mt-3 flex flex-col gap-2 border-t border-border pt-3">
          {milestones.map((m) => (
            <QuestItem key={m.id} quest={m} />
          ))}
        </div>
      )}

      <div className="mt-3">
        {showAdd ? (
          <AddMilestoneForm
            parentQuestId={quest.id}
            onDone={() => setShowAdd(false)}
          />
        ) : (
          <button
            type="button"
            onClick={() => setShowAdd(true)}
            className="text-xs text-muted underline decoration-dotted underline-offset-4 transition-colors hover:text-foreground"
          >
            + Add milestone
          </button>
        )}
      </div>
    </div>
  );
}
