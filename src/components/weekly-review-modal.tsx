"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { acceptWeeklyReview } from "@/app/actions";
import { isRedirectError } from "@/lib/is-redirect-error";

export type WeeklyReviewData = {
  id: string;
  week_start: string;
  week_end: string;
  stat_deltas: Record<string, number>;
  detected_issue: string | null;
  recommended_focus: string | null;
};

export function WeeklyReviewModal({ review }: { review: WeeklyReviewData }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  function handleAccept() {
    setError(null);
    startTransition(async () => {
      try {
        await acceptWeeklyReview(review.id);
        router.refresh();
      } catch (e) {
        if (isRedirectError(e)) throw e;
        setError(e instanceof Error ? e.message : "Something went wrong");
      }
    });
  }

  const deltaEntries = Object.entries(review.stat_deltas);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/90 px-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-lg border border-border bg-surface p-6">
        <p className="font-mono text-xs uppercase tracking-[0.2em] text-muted">
          Weekly Review
        </p>
        <h2 className="mt-1 text-lg font-semibold text-foreground">
          {review.week_start} – {review.week_end}
        </h2>

        <div className="mt-5 grid grid-cols-5 gap-2">
          {deltaEntries.map(([code, delta]) => (
            <div
              key={code}
              className="flex flex-col items-center rounded-md border border-border py-2"
            >
              <span className="text-[10px] uppercase tracking-wide text-muted">
                {code}
              </span>
              <span
                className={`font-mono text-sm ${
                  delta > 0
                    ? "text-foreground"
                    : delta < 0
                      ? "text-muted"
                      : "text-muted"
                }`}
              >
                {delta > 0 ? "+" : ""}
                {delta}
              </span>
            </div>
          ))}
        </div>

        {review.detected_issue && (
          <div className="mt-5">
            <p className="text-xs text-muted">Detected</p>
            <p className="mt-1 text-sm text-foreground">
              {review.detected_issue}
            </p>
          </div>
        )}

        {review.recommended_focus && (
          <div className="mt-4">
            <p className="text-xs text-muted">Recommended focus</p>
            <p className="mt-1 text-sm text-foreground">
              {review.recommended_focus}
            </p>
          </div>
        )}

        {error && (
          <p className="mt-4 text-sm text-red-400" role="alert">
            {error}
          </p>
        )}

        <button
          type="button"
          onClick={handleAccept}
          disabled={pending}
          className="mt-6 w-full rounded-md bg-accent px-4 py-3 text-sm font-medium text-accent-foreground transition-all hover:brightness-110 active:scale-[0.98] disabled:opacity-50 disabled:active:scale-100"
        >
          {pending ? "Accepting…" : "Accept new directive"}
        </button>
      </div>
    </div>
  );
}
