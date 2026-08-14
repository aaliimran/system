"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { completeQuest, updateQuest, deleteQuest, type QuestType } from "@/app/quests/actions";
import { isRedirectError } from "@/lib/is-redirect-error";
import { LevelUpOverlay } from "./level-up-overlay";
import { BossVictoryOverlay } from "./boss-victory-overlay";
import { RankUpOverlay } from "./rank-up-overlay";
import type { Rank } from "@/lib/rank";

type CharacterMoment =
  | { type: "rank"; rank: Rank }
  | { type: "level"; level: number };

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
  const [isPr, setIsPr] = useState(false);
  const [levelUp, setLevelUp] = useState<number | null>(null);
  const [rankUp, setRankUp] = useState<Rank | null>(null);
  const [bossVictory, setBossVictory] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(quest.title);
  const [editExp, setEditExp] = useState(quest.base_exp);
  const [error, setError] = useState<string | null>(null);
  const pendingMoment = useRef<CharacterMoment | null>(null);
  const router = useRouter();

  const missed = quest.status === "missed";
  const excluded = quest.status === "excluded";
  const readOnly = quest.status !== "pending";
  const editable = !readOnly && !done;

  function handleComplete() {
    if (readOnly || done) return;
    startTransition(async () => {
      try {
        const result = await completeQuest(quest.id, isPr);
        setDone(true);
        setFeedback(
          `+${result.awardedExp} EXP${
            result.leveledUp ? ` — Level ${result.newLevel}!` : ""
          }${
            result.newAchievements.length
              ? ` · Unlocked: ${result.newAchievements.join(", ")}`
              : ""
          }`,
        );
        const moment: CharacterMoment | null =
          result.rankedUp && result.newRank
            ? { type: "rank", rank: result.newRank }
            : result.characterLeveledUp && result.newCharacterLevel
              ? { type: "level", level: result.newCharacterLevel }
              : null;

        if (quest.type === "boss") {
          pendingMoment.current = moment;
          setBossVictory(true);
        } else if (moment?.type === "rank") {
          setRankUp(moment.rank);
        } else if (moment?.type === "level") {
          setLevelUp(moment.level);
        }
        setTimeout(() => router.refresh(), 1100);
      } catch (e) {
        if (isRedirectError(e)) throw e;
        setFeedback(e instanceof Error ? e.message : "Something went wrong");
      }
    });
  }

  function handleSaveEdit() {
    setError(null);
    startTransition(async () => {
      try {
        await updateQuest(quest.id, { title: editTitle, baseExp: editExp });
        setEditing(false);
        router.refresh();
      } catch (e) {
        if (isRedirectError(e)) throw e;
        setError(e instanceof Error ? e.message : "Something went wrong");
      }
    });
  }

  function handleDelete() {
    if (!confirm(`Delete "${quest.title}"?`)) return;
    startTransition(async () => {
      try {
        await deleteQuest(quest.id);
        router.refresh();
      } catch (e) {
        if (isRedirectError(e)) throw e;
        setError(e instanceof Error ? e.message : "Something went wrong");
      }
    });
  }

  if (editing) {
    return (
      <div className="rounded-md border border-border bg-background px-3 py-2">
        <div className="flex flex-col gap-2">
          <input
            value={editTitle}
            onChange={(e) => setEditTitle(e.target.value)}
            className="rounded-md border border-border bg-surface px-3 py-2 text-sm text-foreground outline-none focus:border-accent/50"
          />
          <div className="flex items-center gap-2">
            <input
              type="number"
              min={0}
              value={editExp}
              onChange={(e) => setEditExp(Number(e.target.value))}
              className="w-20 rounded-md border border-border bg-surface px-2 py-1.5 text-sm text-foreground"
            />
            <span className="text-xs text-muted">EXP</span>
            <div className="ml-auto flex gap-2">
              <button
                type="button"
                onClick={handleSaveEdit}
                disabled={pending || !editTitle.trim()}
                className="rounded-md bg-accent px-3 py-1.5 text-xs font-medium text-accent-foreground transition-all hover:brightness-110 active:scale-[0.98] disabled:opacity-50 disabled:active:scale-100"
              >
                {pending ? "Saving…" : "Save"}
              </button>
              <button
                type="button"
                onClick={() => setEditing(false)}
                className="rounded-md px-3 py-1.5 text-xs text-muted hover:text-foreground"
              >
                Cancel
              </button>
            </div>
          </div>
          {error && (
            <p className="text-sm text-red-400" role="alert">
              {error}
            </p>
          )}
        </div>
      </div>
    );
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
            const moment = pendingMoment.current;
            pendingMoment.current = null;
            if (moment?.type === "rank") setRankUp(moment.rank);
            else if (moment?.type === "level") setLevelUp(moment.level);
          }}
        />
      )}
      {rankUp !== null && (
        <RankUpOverlay rank={rankUp} onDone={() => setRankUp(null)} />
      )}
      {rankUp === null && levelUp !== null && (
        <LevelUpOverlay level={levelUp} onDone={() => setLevelUp(null)} />
      )}
      <div className="flex min-w-0 items-center gap-3">
        <button
          type="button"
          onClick={handleComplete}
          disabled={pending || readOnly || done}
          aria-label={`Complete ${quest.title}`}
          className={`flex h-5 w-5 shrink-0 items-center justify-center rounded border font-mono text-[10px] transition-colors ${
            done
              ? "border-accent bg-accent"
              : missed
                ? "border-border text-muted"
                : "border-border hover:border-accent/50"
          }`}
        >
          {missed && "×"}
        </button>
        <span
          className={`truncate text-sm ${
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
      <div className="flex shrink-0 items-center gap-3">
        {editable && (
          <>
            <label
              className="flex items-center gap-1.5 text-xs text-muted"
              title="Personal Record — mark a real breakthrough for +50% bonus EXP on this quest."
            >
              <input
                type="checkbox"
                checked={isPr}
                onChange={(e) => setIsPr(e.target.checked)}
                className="h-3.5 w-3.5"
              />
              PR
            </label>
            <button
              type="button"
              onClick={() => setEditing(true)}
              className="text-xs text-muted transition-colors hover:text-foreground"
            >
              Edit
            </button>
            <button
              type="button"
              onClick={handleDelete}
              disabled={pending}
              className="text-xs text-muted transition-colors hover:text-red-400 disabled:opacity-50"
            >
              Delete
            </button>
          </>
        )}
        <span
          className={`font-mono text-xs ${feedback ? "text-accent" : "text-muted"}`}
        >
          {feedback ??
            (missed
              ? "Missed"
              : excluded
                ? "Excused"
                : `+${quest.awarded_exp ?? quest.base_exp} EXP`)}
        </span>
      </div>
    </div>
  );
}
