"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { requestChallenge } from "./actions";
import { isRedirectError } from "@/lib/is-redirect-error";

export function RequestChallengeButton() {
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const router = useRouter();

  function handleClick() {
    setMessage(null);
    startTransition(async () => {
      try {
        await requestChallenge();
        router.refresh();
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
        className="self-start rounded-md border border-border px-3 py-2 text-sm text-muted transition-colors hover:border-accent/40 hover:text-foreground disabled:opacity-50"
      >
        {pending ? "Requesting…" : "Request a Challenge"}
      </button>
      {message && <p className="text-xs text-muted">{message}</p>}
    </div>
  );
}
