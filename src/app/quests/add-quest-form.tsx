"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createQuest, type QuestType } from "./actions";
import { isRedirectError } from "@/lib/is-redirect-error";

// Base EXP by quest type — CLAUDE.md "Resolved Design Decisions #9".
const DEFAULT_EXP: Record<QuestType, number> = {
  daily: 20,
  weekly: 100,
  main: 0,
  milestone: 250,
  challenge: 20,
  boss: 500,
};

export function AddQuestForm({
  defaultType,
  skills,
}: {
  defaultType: QuestType;
  skills: { id: string; name: string }[];
}) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [skillId, setSkillId] = useState<string>("");
  const [baseExp, setBaseExp] = useState(DEFAULT_EXP[defaultType]);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="self-start rounded-md border border-border px-3 py-2 text-sm text-muted transition-colors hover:border-foreground/30 hover:text-foreground"
      >
        + Add {defaultType} quest
      </button>
    );
  }

  function handleSubmit() {
    setError(null);
    startTransition(async () => {
      try {
        await createQuest({
          type: defaultType,
          title,
          skillId: skillId || null,
          baseExp,
        });
        setTitle("");
        setSkillId("");
        setOpen(false);
        router.refresh();
      } catch (e) {
        if (isRedirectError(e)) throw e;
        setError(e instanceof Error ? e.message : "Something went wrong");
      }
    });
  }

  return (
    <div className="rounded-lg border border-border bg-surface p-4">
      <div className="flex flex-col gap-3">
        <div className="flex flex-col gap-1.5">
          <label className="text-xs text-muted">Title</label>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-foreground/40"
            placeholder="e.g. 30 min Korean practice"
          />
        </div>

        <div className="flex gap-3">
          <div className="flex flex-1 flex-col gap-1.5">
            <label className="text-xs text-muted">
              Skill (EXP only counts if linked)
            </label>
            <select
              value={skillId}
              onChange={(e) => setSkillId(e.target.value)}
              className="rounded-md border border-border bg-background px-2 py-2 text-sm text-foreground"
            >
              <option value="">None</option>
              {skills.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>
          <div className="flex w-28 flex-col gap-1.5">
            <label className="text-xs text-muted">Base EXP</label>
            <input
              type="number"
              min={0}
              value={baseExp}
              onChange={(e) => setBaseExp(Number(e.target.value))}
              className="rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-foreground/40"
            />
          </div>
        </div>

        {error && (
          <p className="text-sm text-red-400" role="alert">
            {error}
          </p>
        )}

        <div className="flex gap-2">
          <button
            type="button"
            onClick={handleSubmit}
            disabled={pending || !title.trim()}
            className="rounded-md bg-foreground px-3 py-2 text-sm font-medium text-background transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            {pending ? "Adding…" : "Add quest"}
          </button>
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="rounded-md px-3 py-2 text-sm text-muted hover:text-foreground"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
