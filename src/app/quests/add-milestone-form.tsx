"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createQuest } from "./actions";
import { isRedirectError } from "@/lib/is-redirect-error";

// Milestone base EXP is fixed by decision #9, not user-editable.
const MILESTONE_BASE_EXP = 250;

export function AddMilestoneForm({
  parentQuestId,
  onDone,
}: {
  parentQuestId: string;
  onDone: () => void;
}) {
  const [title, setTitle] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  function handleSubmit() {
    setError(null);
    startTransition(async () => {
      try {
        await createQuest({
          type: "milestone",
          title,
          skillId: null,
          baseExp: MILESTONE_BASE_EXP,
          parentQuestId,
          dueDate: dueDate || null,
        });
        setTitle("");
        setDueDate("");
        onDone();
        router.refresh();
      } catch (e) {
        if (isRedirectError(e)) throw e;
        setError(e instanceof Error ? e.message : "Something went wrong");
      }
    });
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex gap-2">
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Milestone title"
          className="flex-1 rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-accent/50"
        />
        <input
          type="date"
          value={dueDate}
          onChange={(e) => setDueDate(e.target.value)}
          title="Due date (optional)"
          className="rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground"
        />
        <button
          type="button"
          onClick={handleSubmit}
          disabled={pending || !title.trim()}
          className="rounded-md bg-accent px-3 py-2 text-sm font-medium text-accent-foreground transition-all hover:brightness-110 active:scale-[0.98] disabled:opacity-50 disabled:active:scale-100"
        >
          {pending ? "Adding…" : "Add"}
        </button>
        <button
          type="button"
          onClick={onDone}
          className="rounded-md px-3 py-2 text-sm text-muted hover:text-foreground"
        >
          Cancel
        </button>
      </div>
      {error && (
        <p className="text-sm text-red-400" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
