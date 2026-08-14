"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { setLifeHappenedFlag } from "./actions";
import { isRedirectError } from "@/lib/is-redirect-error";

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

export function LifeHappenedForm() {
  const [open, setOpen] = useState(false);
  const [startDate, setStartDate] = useState(today());
  const [endDate, setEndDate] = useState(today());
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        title="Mark a day or period as excluded — illness, exams, etc. No debuff, but no EXP either. Honest, not punitive."
        className="self-start text-xs text-muted underline decoration-dotted underline-offset-4 transition-colors hover:text-foreground"
      >
        Life happened?
      </button>
    );
  }

  function handleSubmit() {
    setError(null);
    startTransition(async () => {
      try {
        await setLifeHappenedFlag({ startDate, endDate, reason });
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
      <p className="text-sm text-foreground">Mark a day or range excused</p>
      <p className="mt-1 text-xs text-muted">
        No debuff, no missed marks — but no EXP either. Honest, not punitive.
      </p>

      <div className="mt-3 flex flex-col gap-3">
        <div className="flex gap-3">
          <div className="flex flex-1 flex-col gap-1.5">
            <label className="text-xs text-muted">From</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground"
            />
          </div>
          <div className="flex flex-1 flex-col gap-1.5">
            <label className="text-xs text-muted">To</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground"
            />
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-xs text-muted">Reason (optional)</label>
          <input
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="e.g. sick, exams"
            className="rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-accent/50"
          />
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
            disabled={pending}
            className="rounded-md bg-accent px-3 py-2 text-sm font-medium text-accent-foreground transition-all hover:brightness-110 active:scale-[0.98] disabled:opacity-50 disabled:active:scale-100"
          >
            {pending ? "Saving…" : "Mark excused"}
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
