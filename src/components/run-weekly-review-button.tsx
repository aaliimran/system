"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { runWeeklyReview } from "@/app/actions";
import { isRedirectError } from "@/lib/is-redirect-error";

export function RunWeeklyReviewButton() {
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const router = useRouter();

  function handleClick() {
    setMessage(null);
    startTransition(async () => {
      try {
        const result = await runWeeklyReview();
        if ("skipped" in result) {
          setMessage(result.skipped);
        } else {
          router.refresh();
        }
      } catch (e) {
        if (isRedirectError(e)) throw e;
        setMessage(e instanceof Error ? e.message : "Something went wrong");
      }
    });
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        type="button"
        onClick={handleClick}
        disabled={pending}
        className="text-xs text-muted underline decoration-dotted underline-offset-4 transition-colors hover:text-foreground disabled:opacity-50"
      >
        {pending ? "Analyzing…" : "Run weekly review"}
      </button>
      {message && <p className="text-xs text-muted">{message}</p>}
    </div>
  );
}
