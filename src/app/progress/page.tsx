import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AppNav } from "@/components/app-nav";
import { StatHistoryChart } from "@/components/stat-history-chart";
import { characterLevelFromExp } from "@/lib/leveling";
import { rankForLevel } from "@/lib/rank";
import { syncCharacterLevel } from "@/lib/sync-character-level";
import type { StatCode } from "@/lib/skills-catalog";

const STAT_ORDER: StatCode[] = ["STR", "END", "VIT", "MIND", "INT"];

const TIMELINE_LABELS: Record<string, string> = {
  character_level_up: "Level",
  rank_up: "Rank",
};

export default async function ProgressPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("users")
    .select("onboarding_completed_at")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile?.onboarding_completed_at) {
    redirect("/onboarding");
  }

  const character = await syncCharacterLevel(supabase, user.id);

  const [{ data: timeline }, { data: expHistory }, { data: stats }, { data: statHistory }] =
    await Promise.all([
      supabase
        .from("codex_entries")
        .select("id, entry_type, title, occurred_at")
        .eq("user_id", user.id)
        .in("entry_type", ["character_level_up", "rank_up"])
        .order("occurred_at", { ascending: false }),
      supabase
        .from("character_exp_history")
        .select("value, recorded_at")
        .eq("user_id", user.id)
        .order("recorded_at", { ascending: true }),
      supabase.from("stats").select("code, current_value").eq("user_id", user.id),
      supabase
        .from("stat_history")
        .select("stat_code, value, recorded_at")
        .eq("user_id", user.id)
        .order("recorded_at", { ascending: true }),
    ]);

  const expPoints = (expHistory ?? []).map((h) => ({
    date: h.recorded_at as string,
    value: h.value as number,
  }));

  const currentByCode = new Map(
    (stats ?? []).map((s) => [s.code as StatCode, s.current_value as number]),
  );

  const earliestByCode = new Map<StatCode, number>();
  for (const row of statHistory ?? []) {
    const code = row.stat_code as StatCode;
    if (!earliestByCode.has(code)) {
      earliestByCode.set(code, Math.round((row.value as number) * 10) / 10);
    }
  }

  const thenLevel = expPoints.length
    ? characterLevelFromExp(expPoints[0].value)
    : character.newLevel;
  const thenRank = rankForLevel(thenLevel);

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-8 px-4 py-10">
      <AppNav active="/progress" />
      <h1 className="text-xl font-semibold text-foreground">Progress</h1>

      <section className="rounded-lg border border-border bg-surface p-4">
        <h2 className="text-sm font-medium text-foreground">EXP over time</h2>
        <div className="mt-4">
          <StatHistoryChart points={expPoints} />
        </div>
      </section>

      <section className="rounded-lg border border-border bg-surface p-4">
        <h2 className="text-sm font-medium text-foreground">Then vs now</h2>
        <div className="mt-3 flex flex-col gap-2">
          <div className="flex items-center justify-between rounded-md border border-border px-3 py-2">
            <span className="text-xs text-muted">Level · Rank</span>
            <span className="font-mono text-sm text-foreground">
              {thenLevel} · {thenRank}
              <span className="mx-2 text-muted">→</span>
              <span className="text-accent">
                {character.newLevel} · {rankForLevel(character.newLevel)}
              </span>
            </span>
          </div>
          {STAT_ORDER.map((code) => {
            const now = currentByCode.get(code) ?? 0;
            const then = earliestByCode.get(code) ?? now;
            return (
              <div
                key={code}
                className="flex items-center justify-between rounded-md border border-border px-3 py-2"
              >
                <span className="text-xs text-muted">{code}</span>
                <span className="font-mono text-sm text-foreground">
                  {then}
                  <span className="mx-2 text-muted">→</span>
                  <span className="text-accent">{now}</span>
                </span>
              </div>
            );
          })}
        </div>
      </section>

      <section>
        <h2 className="text-sm font-medium text-foreground">
          Level Up / Rank Up timeline
        </h2>
        {!timeline || timeline.length === 0 ? (
          <p className="mt-3 text-sm text-muted">Nothing recorded yet.</p>
        ) : (
          <div className="relative mt-4 flex flex-col gap-4 border-l border-border pl-5">
            {timeline.map((e) => {
              const isRank = e.entry_type === "rank_up";
              return (
                <div key={e.id} className="relative">
                  <span
                    className={`absolute -left-[25px] top-1 h-2.5 w-2.5 rounded-full ${
                      isRank ? "glow-pulse bg-accent" : "bg-border"
                    }`}
                  />
                  <div className="flex items-center gap-2">
                    <span
                      className={`rounded-full border px-2 py-0.5 font-mono text-[10px] uppercase tracking-wide ${
                        isRank
                          ? "border-accent/40 text-accent"
                          : "border-border text-muted"
                      }`}
                    >
                      {TIMELINE_LABELS[e.entry_type] ?? e.entry_type}
                    </span>
                    <span
                      className={`text-sm ${isRank ? "text-accent" : "text-foreground"}`}
                    >
                      {e.title}
                    </span>
                  </div>
                  <p className="mt-0.5 font-mono text-[10px] text-muted">
                    {new Date(e.occurred_at).toLocaleDateString()}
                  </p>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
