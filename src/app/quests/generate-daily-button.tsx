"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { generateDailyQuests } from "./actions";
import { isRedirectError } from "@/lib/is-redirect-error";

export function GenerateDailyButton() {
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const router = useRouter();

  function handleClick() {
    setMessage(null);
    startTransition(async () => {
      try {
        const result = await generateDailyQuests();
        if ("skipped" in result) {
          setMessage(result.skipped);
        } else {
          setMessage(`Generated ${result.created} quest${result.created > 1 ? "s" : ""}`);
          router.refresh();
        }
      } catch (e) {
        if (isRedirectError(e)) throw e;
        setMessage(e instanceof Error ? e.message : "Something went wrong");
      }
    });
  }

  return (
    <div className="flex flex-col gap-1">
      <button
        type="button"
        onClick={handleClick}
        disabled={pending}
        className="self-start rounded-md border border-border px-3 py-2 text-sm text-muted transition-colors hover:border-foreground/30 hover:text-foreground disabled:opacity-50"
      >
        {pending ? "Composing…" : "Generate today's quests"}
      </button>
      {message && <p className="text-xs text-muted">{message}</p>}
    </div>
  );
}
