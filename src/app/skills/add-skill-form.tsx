"use client";

import { useState, useTransition } from "react";
import { CATEGORY_LABELS, type SkillCategory, type StatCode } from "@/lib/skills-catalog";
import { isRedirectError } from "@/lib/is-redirect-error";
import { createSkill } from "./actions";

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

export function AddSkillForm() {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [category, setCategory] = useState<SkillCategory>("PERSONAL_DEVELOPMENT");
  const [stat, setStat] = useState<"STR" | "END" | "INT">("INT");
  const [selfRating, setSelfRating] = useState(1);
  const [isMaintenance, setIsMaintenance] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-md border border-border px-3 py-2 text-sm text-muted transition-colors hover:border-foreground/30 hover:text-foreground"
      >
        + Add skill
      </button>
    );
  }

  function handleSubmit() {
    setError(null);
    startTransition(async () => {
      try {
        await createSkill({ name, category, stat, isMaintenance, selfRating });
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
          <label className="text-xs text-muted">Name</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-foreground/40"
            placeholder="e.g. Guitar"
          />
        </div>

        <div className="flex gap-3">
          <div className="flex min-w-0 flex-1 flex-col gap-1.5">
            <label className="text-xs text-muted">Category</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value as SkillCategory)}
              className="rounded-md border border-border bg-background px-2 py-2 text-sm text-foreground"
            >
              {CATEGORY_OPTIONS.map((c) => (
                <option key={c} value={c}>
                  {CATEGORY_LABELS[c]}
                </option>
              ))}
            </select>
          </div>
          <div className="flex min-w-0 flex-1 flex-col gap-1.5">
            <label className="text-xs text-muted">Feeds stat</label>
            <select
              value={stat}
              onChange={(e) => setStat(e.target.value as "STR" | "END" | "INT")}
              className="rounded-md border border-border bg-background px-2 py-2 text-sm text-foreground"
            >
              {STAT_OPTIONS.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-xs text-muted">
            Honest starting point (1 = true beginner, 5 = advanced)
          </label>
          <div className="flex gap-1">
            {[1, 2, 3, 4, 5].map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => setSelfRating(n)}
                className={`h-7 w-7 rounded font-mono text-xs transition-colors ${
                  selfRating === n
                    ? "bg-foreground text-background"
                    : "bg-background text-muted hover:text-foreground"
                }`}
              >
                {n}
              </button>
            ))}
          </div>
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
            onClick={handleSubmit}
            disabled={pending || !name.trim()}
            className="rounded-md bg-foreground px-3 py-2 text-sm font-medium text-background transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            {pending ? "Adding…" : "Add skill"}
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
