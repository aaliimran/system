"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { updateSkill, deleteSkill } from "./actions";
import { isRedirectError } from "@/lib/is-redirect-error";
import { CATEGORY_LABELS, type SkillCategory, type StatCode } from "@/lib/skills-catalog";

const CATEGORY_OPTIONS: SkillCategory[] = [
  "PHYSICAL",
  "KNOWLEDGE_CRAFT",
  "PERSONAL_DEVELOPMENT",
];

const STAT_OPTIONS: { value: Extract<StatCode, "STR" | "END" | "INT">; label: string }[] = [
  { value: "STR", label: "STR — strength" },
  { value: "END", label: "END — endurance" },
  { value: "INT", label: "INT — intelligence" },
];

export type SkillCardData = {
  id: string;
  category: SkillCategory;
  name: string;
  level: number;
  current_exp: number;
  is_maintenance: boolean;
  fatigue_active: boolean;
  linked_stats: { stat: StatCode; weight: number }[];
};

export function SkillCard({
  skill,
  subs,
  progress,
}: {
  skill: SkillCardData;
  subs: { id: string; name: string; level: number }[];
  progress: { current: number; needed: number; percent: number };
}) {
  const primaryStat =
    skill.linked_stats.find((l) => l.stat === "STR" || l.stat === "END" || l.stat === "INT")
      ?.stat ?? "INT";

  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(skill.name);
  const [category, setCategory] = useState<SkillCategory>(skill.category);
  const [stat, setStat] = useState<Extract<StatCode, "STR" | "END" | "INT">>(
    primaryStat as Extract<StatCode, "STR" | "END" | "INT">,
  );
  const [isMaintenance, setIsMaintenance] = useState(skill.is_maintenance);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  function handleSave() {
    setError(null);
    startTransition(async () => {
      try {
        await updateSkill(skill.id, { name, category, stat, isMaintenance });
        setEditing(false);
        router.refresh();
      } catch (e) {
        if (isRedirectError(e)) throw e;
        setError(e instanceof Error ? e.message : "Something went wrong");
      }
    });
  }

  function handleDelete() {
    if (
      !confirm(
        `Delete "${skill.name}"? This permanently removes its level and EXP history.`,
      )
    ) {
      return;
    }
    startTransition(async () => {
      try {
        await deleteSkill(skill.id);
        router.refresh();
      } catch (e) {
        if (isRedirectError(e)) throw e;
        setError(e instanceof Error ? e.message : "Something went wrong");
      }
    });
  }

  if (editing) {
    return (
      <div className="rounded-lg border border-border bg-surface p-4">
        <div className="flex flex-col gap-3">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-accent/50"
          />
          <div className="flex gap-3">
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value as SkillCategory)}
              className="min-w-0 flex-1 rounded-md border border-border bg-background px-2 py-2 text-sm text-foreground"
            >
              {CATEGORY_OPTIONS.map((c) => (
                <option key={c} value={c}>
                  {CATEGORY_LABELS[c]}
                </option>
              ))}
            </select>
            <select
              value={stat}
              onChange={(e) => setStat(e.target.value as Extract<StatCode, "STR" | "END" | "INT">)}
              className="min-w-0 flex-1 rounded-md border border-border bg-background px-2 py-2 text-sm text-foreground"
            >
              {STAT_OPTIONS.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
          </div>
          <label className="flex items-center gap-2 text-xs text-muted">
            <input
              type="checkbox"
              checked={isMaintenance}
              onChange={(e) => setIsMaintenance(e.target.checked)}
            />
            Maintenance mode (not actively leveled)
          </label>
          {error && (
            <p className="text-sm text-red-400" role="alert">
              {error}
            </p>
          )}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleSave}
              disabled={pending || !name.trim()}
              className="rounded-md bg-accent px-3 py-2 text-sm font-medium text-accent-foreground transition-all hover:brightness-110 active:scale-[0.98] disabled:opacity-50 disabled:active:scale-100"
            >
              {pending ? "Saving…" : "Save"}
            </button>
            <button
              type="button"
              onClick={() => setEditing(false)}
              className="rounded-md px-3 py-2 text-sm text-muted hover:text-foreground"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-border bg-surface p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-sm text-foreground">{skill.name}</span>
          {skill.is_maintenance && (
            <span
              className="rounded-full border border-border px-2 py-0.5 text-[10px] uppercase tracking-wide text-muted"
              title="Maintenance skills don't get actively leveled — quests can still reference them, but they're not a growth focus right now."
            >
              Maintenance
            </span>
          )}
          {skill.fatigue_active && (
            <span
              className="rounded-full border border-border px-2 py-0.5 text-[10px] uppercase tracking-wide text-muted opacity-60"
              title="You missed a quest tied to this skill — no level lost, just −20% EXP until you complete one for it again."
            >
              Fatigued
            </span>
          )}
        </div>
        <div className="flex items-center gap-3">
          <span className="font-mono text-sm text-foreground">Lv {skill.level}</span>
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
        </div>
      </div>
      <div
        className={`mt-2 h-1.5 w-full overflow-hidden rounded-full bg-border ${
          skill.fatigue_active ? "opacity-50" : ""
        }`}
      >
        <div
          key={progress.percent}
          className="glow-pulse h-full rounded-full bg-accent"
          style={{ width: `${progress.percent}%` }}
        />
      </div>
      <p className="mt-1 font-mono text-[11px] text-muted">
        {progress.current} / {progress.needed} EXP
      </p>

      {subs.length > 0 && (
        <div className="mt-3 flex flex-col gap-2 border-t border-border pt-3">
          {subs.map((sub) => (
            <div key={sub.id} className="flex items-center justify-between pl-3 text-xs">
              <span className="text-muted">{sub.name}</span>
              <span className="font-mono text-muted">Lv {sub.level}</span>
            </div>
          ))}
        </div>
      )}

      {error && (
        <p className="mt-2 text-sm text-red-400" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
