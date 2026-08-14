"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { completeQuest } from "@/app/quests/actions";
import { isRedirectError } from "@/lib/is-redirect-error";

export type QuestItemData = {
  id: string;
  title: string;
  base_exp: number;
  status: string;
  awarded_exp: number | null;
};

export function QuestItem({ quest }: { quest: QuestItemData }) {
  const [pending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<string | null>(null);
  const [done, setDone] = useState(quest.status !== "pending");
  const router = useRouter();

  const readOnly = quest.status !== "pending";

  function handleComplete() {
    if (readOnly || done) return;
    startTransition(async () => {
      try {
        const result = await completeQuest(quest.id);
        setDone(true);
        setFeedback(
          `+${result.awardedExp} EXP${
            result.leveledUp ? ` — Level ${result.newLevel}!` : ""
          }`,
        );
        setTimeout(() => router.refresh(), 1100);
      } catch (e) {
        if (isRedirectError(e)) throw e;
        setFeedback(e instanceof Error ? e.message : "Something went wrong");
      }
    });
  }

  return (
    <div className="flex items-center justify-between rounded-md border border-border bg-background px-3 py-2">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={handleComplete}
          disabled={pending || readOnly || done}
          aria-label={`Complete ${quest.title}`}
          className={`h-5 w-5 shrink-0 rounded border transition-colors ${
            done
              ? "border-foreground bg-foreground"
              : "border-border hover:border-foreground/50"
          }`}
        />
        <span
          className={`text-sm ${done ? "text-muted line-through" : "text-foreground"}`}
        >
          {quest.title}
        </span>
      </div>
      <span
        className={`font-mono text-xs ${feedback ? "text-foreground" : "text-muted"}`}
      >
        {feedback ?? `+${quest.awarded_exp ?? quest.base_exp} EXP`}
      </span>
    </div>
  );
}
