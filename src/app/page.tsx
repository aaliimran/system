import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { characterLevelProgress } from "@/lib/leveling";
import { statCeiling } from "@/lib/stats";
import { syncComputedStats } from "@/lib/sync-stats";
import { syncCharacterLevel } from "@/lib/sync-character-level";
import { StatRadarChart } from "@/components/stat-radar-chart";
import { AppNav } from "@/components/app-nav";
import { QuestItem } from "@/components/quest-item";
import type { StatCode } from "@/lib/skills-catalog";

const STAT_ORDER: StatCode[] = ["STR", "END", "VIT", "MIND", "INT"];

export default async function Dashboard() {
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

  await syncComputedStats(supabase, user.id);
  const character = await syncCharacterLevel(supabase, user.id);

  const [{ data: stats }, { data: dailyQuests }, { data: fatigued }] =
    await Promise.all([
      supabase.from("stats").select("code, current_value"),
      supabase
        .from("quests")
        .select("id, title, base_exp, awarded_exp, status")
        .eq("status", "pending")
        .eq("type", "daily")
        .order("created_at", { ascending: true }),
      supabase.from("skills").select("id").eq("fatigue_active", true),
    ]);

  const statValues = new Map(
    (stats ?? []).map((s) => [s.code as StatCode, s.current_value as number]),
  );

  const ceiling = statCeiling(character.newLevel);
  const radarStats = STAT_ORDER.map((code) => ({
    code,
    value: statValues.get(code) ?? 0,
    ceiling,
  }));

  const { current, needed, percent } = characterLevelProgress(
    character.newLevel,
    character.totalExp,
  );

  const hasDebuff = (fatigued?.length ?? 0) > 0;

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-8 px-4 py-10">
      <AppNav active="/" />

      <div>
        <p className="font-mono text-xs uppercase tracking-[0.2em] text-muted">
          System
        </p>
        <p className="mt-1 font-mono text-5xl text-foreground">
          Lv {character.newLevel}
        </p>
        <div className="mt-3 h-1.5 w-56 overflow-hidden rounded-full bg-border">
          <div
            className="h-full rounded-full bg-foreground transition-all"
            style={{ width: `${percent}%` }}
          />
        </div>
        <p className="mt-1 font-mono text-xs text-muted">
          {current} / {needed} EXP
        </p>
      </div>

      {hasDebuff && (
        <div className="rounded-md border border-border bg-surface px-4 py-2 text-xs text-muted">
          Fatigue active on {fatigued!.length} skill
          {fatigued!.length > 1 ? "s" : ""} — complete a related quest to
          clear it.
        </div>
      )}

      <section className="rounded-lg border border-border bg-surface p-6">
        <div className="mx-auto aspect-square w-full max-w-[280px]">
          <StatRadarChart stats={radarStats} />
        </div>
      </section>

      <section className="grid grid-cols-2 gap-4">
        <div className="rounded-lg border border-border bg-surface p-4">
          <p className="text-xs text-muted">Streak</p>
          <p className="mt-1 font-mono text-2xl text-foreground">0</p>
        </div>
        <div className="rounded-lg border border-border bg-surface p-4">
          <p className="text-xs text-muted">Weekly focus</p>
          <p className="mt-1 text-sm text-foreground">Not set yet</p>
        </div>
      </section>

      <section>
        <h2 className="text-sm font-medium text-foreground">
          Today&apos;s quests
        </h2>
        <div className="mt-3 rounded-lg border border-border bg-surface p-4">
          {dailyQuests && dailyQuests.length > 0 ? (
            <div className="flex flex-col gap-2">
              {dailyQuests.map((q) => (
                <QuestItem key={q.id} quest={q} />
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted">
              No quests yet — the Daily Composer arrives later in the build.
            </p>
          )}
        </div>
      </section>
    </div>
  );
}
