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
        });
        setTitle("");
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
          className="flex-1 rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-foreground/40"
        />
        <button
          type="button"
          onClick={handleSubmit}
          disabled={pending || !title.trim()}
          className="rounded-md bg-foreground px-3 py-2 text-sm font-medium text-background transition-opacity hover:opacity-90 disabled:opacity-50"
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
