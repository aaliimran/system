"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { INTENSITY_OPTIONS, type Intensity } from "@/lib/intensity";
import { updateIntensity } from "./actions";
import { isRedirectError } from "@/lib/is-redirect-error";

export function IntensityForm({ current }: { current: Intensity }) {
  const [selected, setSelected] = useState<Intensity>(current);
  const [pending, startTransition] = useTransition();
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  function handleSelect(value: Intensity) {
    setSelected(value);
    setSaved(false);
    setError(null);
    startTransition(async () => {
      try {
        await updateIntensity(value);
        setSaved(true);
        router.refresh();
      } catch (e) {
        if (isRedirectError(e)) throw e;
        setError(e instanceof Error ? e.message : "Something went wrong");
      }
    });
  }

  return (
    <section>
      <h2 className="text-sm font-medium text-foreground">System intensity</h2>
      <p className="mt-1 text-xs text-muted">
        Changes apply to the next Daily Composer run.
      </p>
      <div className="mt-3 grid grid-cols-3 gap-2">
        {INTENSITY_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            type="button"
            onClick={() => handleSelect(opt.value)}
            disabled={pending}
            className={`rounded-md border px-3 py-3 text-left transition-colors disabled:opacity-50 ${
              selected === opt.value
                ? "border-accent bg-accent/10"
                : "border-border hover:border-accent/30"
            }`}
          >
            <div className="text-sm font-medium text-foreground">
              {opt.label}
            </div>
            <div className="mt-1 font-mono text-xs text-muted">{opt.hint}</div>
          </button>
        ))}
      </div>
      {saved && !pending && (
        <p className="mt-3 text-xs text-muted">Saved.</p>
      )}
      {error && (
        <p className="mt-3 text-sm text-red-400" role="alert">
          {error}
        </p>
      )}
    </section>
  );
}
