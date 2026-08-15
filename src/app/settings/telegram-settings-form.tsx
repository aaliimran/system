"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { detectAndLinkTelegram, unlinkTelegram } from "./actions";
import { isRedirectError } from "@/lib/is-redirect-error";

export function TelegramSettingsForm({ linked }: { linked: boolean }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const router = useRouter();

  function handleDetect() {
    setError(null);
    setSuccess(false);
    startTransition(async () => {
      try {
        await detectAndLinkTelegram();
        setSuccess(true);
        router.refresh();
      } catch (e) {
        if (isRedirectError(e)) throw e;
        setError(e instanceof Error ? e.message : "Something went wrong");
      }
    });
  }

  function handleUnlink() {
    setError(null);
    setSuccess(false);
    startTransition(async () => {
      try {
        await unlinkTelegram();
        router.refresh();
      } catch (e) {
        if (isRedirectError(e)) throw e;
        setError(e instanceof Error ? e.message : "Something went wrong");
      }
    });
  }

  return (
    <section>
      <h2 className="text-sm font-medium text-foreground">Telegram notifications</h2>
      <p className="mt-1 text-xs text-muted">
        Nudges you if today&apos;s quests are still open by evening, and when
        your Weekly Review is ready — no need to keep the app open.
      </p>

      {linked ? (
        <div className="mt-3 flex items-center gap-3">
          <span className="rounded-full border border-accent/40 px-2 py-0.5 text-xs text-accent">
            Linked
          </span>
          <button
            type="button"
            onClick={handleUnlink}
            disabled={pending}
            className="text-xs text-muted transition-colors hover:text-red-400 disabled:opacity-50"
          >
            Unlink
          </button>
        </div>
      ) : (
        <div className="mt-3 flex flex-col gap-3">
          <ol className="list-inside list-decimal text-xs text-muted">
            <li>Open your bot in Telegram and send it any message.</li>
            <li>Click detect below — it links the chat that just messaged it.</li>
          </ol>
          <button
            type="button"
            onClick={handleDetect}
            disabled={pending}
            className="self-start rounded-md bg-accent px-3 py-2 text-sm font-medium text-accent-foreground transition-all hover:brightness-110 active:scale-[0.98] disabled:opacity-50 disabled:active:scale-100"
          >
            {pending ? "Detecting…" : "Detect chat ID"}
          </button>
        </div>
      )}

      {success && (
        <p className="mt-3 text-xs text-muted">Linked — check Telegram for a confirmation message.</p>
      )}
      {error && (
        <p className="mt-3 text-sm text-red-400" role="alert">
          {error}
        </p>
      )}
    </section>
  );
}
