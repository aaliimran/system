"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { completeQuest, type QuestType } from "@/app/quests/actions";
import { isRedirectError } from "@/lib/is-redirect-error";
import { LevelUpOverlay } from "./level-up-overlay";
import { BossVictoryOverlay } from "./boss-victory-overlay";

export type QuestItemData = {
  id: string;
  title: string;
  base_exp: number;
  status: string;
  awarded_exp: number | null;
  type: QuestType;
};

export function QuestItem({ quest }: { quest: QuestItemData }) {
  const [pending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<string | null>(null);
  const [done, setDone] = useState(quest.status === "completed");
  const [levelUp, setLevelUp] = useState<number | null>(null);
  const [bossVictory, setBossVictory] = useState(false);
  const pendingLevelUp = useRef<number | null>(null);
  const router = useRouter();

  const missed = quest.status === "missed";
  const excluded = quest.status === "excluded";
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
        if (quest.type === "boss") {
          pendingLevelUp.current =
            result.characterLeveledUp && result.newCharacterLevel
              ? result.newCharacterLevel
              : null;
          setBossVictory(true);
        } else if (result.characterLeveledUp && result.newCharacterLevel) {
          setLevelUp(result.newCharacterLevel);
        }
        setTimeout(() => router.refresh(), 1100);
      } catch (e) {
        if (isRedirectError(e)) throw e;
        setFeedback(e instanceof Error ? e.message : "Something went wrong");
      }
    });
  }

  return (
    <div
      className={`flex items-center justify-between rounded-md border border-border bg-background px-3 py-2 ${
        missed || excluded ? "opacity-60" : ""
      }`}
    >
      {bossVictory && (
        <BossVictoryOverlay
          questTitle={quest.title}
          onDone={() => {
            setBossVictory(false);
            if (pendingLevelUp.current !== null) {
              setLevelUp(pendingLevelUp.current);
              pendingLevelUp.current = null;
            }
          }}
        />
      )}
      {levelUp !== null && (
        <LevelUpOverlay level={levelUp} onDone={() => setLevelUp(null)} />
      )}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={handleComplete}
          disabled={pending || readOnly || done}
          aria-label={`Complete ${quest.title}`}
          className={`flex h-5 w-5 shrink-0 items-center justify-center rounded border font-mono text-[10px] transition-colors ${
            done
              ? "border-foreground bg-foreground"
              : missed
                ? "border-border text-muted"
                : "border-border hover:border-foreground/50"
          }`}
        >
          {missed && "×"}
        </button>
        <span
          className={`text-sm ${
            done || missed
              ? "text-muted line-through"
              : excluded
                ? "text-muted italic"
                : "text-foreground"
          }`}
        >
          {quest.title}
        </span>
      </div>
      <span
        className={`font-mono text-xs ${feedback ? "text-foreground" : "text-muted"}`}
      >
        {feedback ??
          (missed
            ? "Missed"
            : excluded
              ? "Excused"
              : `+${quest.awarded_exp ?? quest.base_exp} EXP`)}
      </span>
    </div>
  );
}
