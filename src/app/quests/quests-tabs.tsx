"use client";

import { useState } from "react";
import { QuestItem, type QuestItemData } from "@/components/quest-item";
import { AddQuestForm } from "./add-quest-form";
import { GenerateDailyButton } from "./generate-daily-button";
import type { QuestType } from "./actions";

const TABS: { type: QuestType; label: string }[] = [
  { type: "daily", label: "Daily" },
  { type: "weekly", label: "Weekly" },
  { type: "main", label: "Main" },
  { type: "challenge", label: "Challenge" },
  { type: "boss", label: "Boss" },
];

export function QuestsTabs({
  quests,
  skills,
}: {
  quests: (QuestItemData & { type: QuestType })[];
  skills: { id: string; name: string }[];
}) {
  const [active, setActive] = useState<QuestType>("daily");
  const filtered = quests.filter((q) => q.type === active);
  const pending = filtered.filter((q) => q.status === "pending");
  const completed = filtered.filter((q) => q.status !== "pending");

  return (
    <div>
      <div className="flex gap-1 border-b border-border">
        {TABS.map((tab) => (
          <button
            key={tab.type}
            type="button"
            onClick={() => setActive(tab.type)}
            className={`px-3 py-2 text-sm transition-colors ${
              active === tab.type
                ? "border-b-2 border-foreground text-foreground"
                : "text-muted hover:text-foreground"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="mt-4 flex flex-col gap-4">
        {active === "daily" && <GenerateDailyButton />}
        <AddQuestForm key={active} defaultType={active} skills={skills} />

        {pending.length === 0 && completed.length === 0 ? (
          <p className="text-sm text-muted">No {active} quests yet.</p>
        ) : (
          <div className="flex flex-col gap-2">
            {[...pending, ...completed].map((q) => (
              <QuestItem key={q.id} quest={q} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
