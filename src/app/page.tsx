import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { characterLevelProgress } from "@/lib/leveling";
import { statCeiling } from "@/lib/stats";
import { syncComputedStats } from "@/lib/sync-stats";
import { syncCharacterLevel } from "@/lib/sync-character-level";
import { rankForLevel } from "@/lib/rank";
import { syncMindStat } from "@/lib/sync-mind-stat";
import { processMissedQuests } from "@/lib/recovery";
import { checkAchievements } from "@/lib/achievements";
import { StatRadarChart } from "@/components/stat-radar-chart";
import { AppNav } from "@/components/app-nav";
import { QuestItem } from "@/components/quest-item";
import { WeeklyReviewModal } from "@/components/weekly-review-modal";
import { RunWeeklyReviewButton } from "@/components/run-weekly-review-button";
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

  await processMissedQuests(supabase, user.id);
  await checkAchievements(supabase, user.id);
  await syncComputedStats(supabase, user.id);
  const character = await syncCharacterLevel(supabase, user.id);
  const mind = await syncMindStat(
    supabase,
    user.id,
    statCeiling(character.newLevel),
  );

  const [{ data: stats }, { data: dailyQuests }, { data: fatigued }, { data: pendingReview }, { data: acceptedReview }] =
    await Promise.all([
      supabase.from("stats").select("code, current_value"),
      supabase
        .from("quests")
        .select("id, title, base_exp, awarded_exp, status, type")
        .eq("status", "pending")
        .eq("type", "daily")
        .order("created_at", { ascending: true }),
      supabase.from("skills").select("id").eq("fatigue_active", true),
      supabase
        .from("weekly_reviews")
        .select("id, week_start, week_end, stat_deltas, detected_issue, recommended_focus")
        .eq("user_id", user.id)
        .eq("accepted", false)
        .order("week_start", { ascending: false })
        .limit(1)
        .maybeSingle(),
      supabase
        .from("weekly_reviews")
        .select("recommended_focus")
        .eq("user_id", user.id)
        .eq("accepted", true)
        .order("week_start", { ascending: false })
        .limit(1)
        .maybeSingle(),
    ]);

  const statValues = new Map(
    (stats ?? []).map((s) => [s.code as StatCode, s.current_value as number]),
  );
  statValues.set("MIND", mind.value);

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
      {pendingReview && <WeeklyReviewModal review={pendingReview} />}
      <AppNav active="/" />

      <div>
        <div className="flex items-center gap-3">
          <p className="font-mono text-xs uppercase tracking-[0.2em] text-muted">
            System
          </p>
          <span className="rounded border border-accent/40 px-1.5 py-0.5 font-mono text-[10px] text-accent">
            Rank {rankForLevel(character.newLevel)}
          </span>
        </div>
        <p className="mt-1 font-mono text-5xl text-accent">
          Lv {character.newLevel}
        </p>
        <div className="mt-3 h-1.5 w-56 overflow-hidden rounded-full bg-border">
          <div
            key={percent}
            className="glow-pulse h-full rounded-full bg-accent transition-all"
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
          <p className="mt-1 font-mono text-2xl text-accent">
            {mind.streak}
          </p>
        </div>
        <div className="rounded-lg border border-border bg-surface p-4">
          <p className="text-xs text-muted">Weekly focus</p>
          <p className="mt-1 text-sm text-foreground">
            {acceptedReview?.recommended_focus ?? "Not set yet"}
          </p>
        </div>
      </section>

      {!pendingReview && (
        <div className="flex justify-end">
          <RunWeeklyReviewButton />
        </div>
      )}

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
              No quests yet today — generate or add some on the Quests page.
            </p>
          )}
        </div>
      </section>
    </div>
  );
}
