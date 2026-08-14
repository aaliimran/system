"use client";

import { useMemo, useState } from "react";
import { QuestItem, type QuestItemData } from "@/components/quest-item";
import { AddQuestForm } from "./add-quest-form";
import { GenerateDailyButton } from "./generate-daily-button";
import { RequestChallengeButton } from "./request-challenge-button";
import { MainQuestCard } from "./main-quest-card";
import type { QuestType } from "./actions";

const TABS: { type: QuestType; label: string }[] = [
  { type: "daily", label: "Daily" },
  { type: "weekly", label: "Weekly" },
  { type: "main", label: "Main" },
  { type: "challenge", label: "Challenge" },
  { type: "boss", label: "Boss" },
];

export type QuestRow = QuestItemData & { parent_quest_id: string | null };

export function QuestsTabs({
  quests,
  skills,
}: {
  quests: QuestRow[];
  skills: { id: string; name: string }[];
}) {
  const [active, setActive] = useState<QuestType>("daily");
  const filtered = quests.filter((q) => q.type === active);
  const pending = filtered.filter((q) => q.status === "pending");
  const completed = filtered.filter((q) => q.status !== "pending");

  const milestonesByParent = useMemo(() => {
    const map = new Map<string, QuestRow[]>();
    for (const q of quests) {
      if (q.type === "milestone" && q.parent_quest_id) {
        const list = map.get(q.parent_quest_id) ?? [];
        list.push(q);
        map.set(q.parent_quest_id, list);
      }
    }
    return map;
  }, [quests]);

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
                ? "border-b-2 border-accent text-accent"
                : "text-muted hover:text-foreground"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="mt-4 flex flex-col gap-4">
        {active === "daily" && <GenerateDailyButton />}
        {active === "challenge" && <RequestChallengeButton />}
        <AddQuestForm key={active} defaultType={active} skills={skills} />

        {active === "main" ? (
          filtered.length === 0 ? (
            <p className="text-sm text-muted">No main quests yet.</p>
          ) : (
            <div className="flex flex-col gap-4">
              {[...pending, ...completed].map((q) => (
                <MainQuestCard
                  key={q.id}
                  quest={q}
                  milestones={milestonesByParent.get(q.id) ?? []}
                />
              ))}
            </div>
          )
        ) : pending.length === 0 && completed.length === 0 ? (
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
