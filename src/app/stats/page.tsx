import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AppNav } from "@/components/app-nav";
import { StatDetailCard } from "./stat-detail-card";
import { statCeiling } from "@/lib/stats";
import { syncCharacterLevel } from "@/lib/sync-character-level";
import type { StatCode } from "@/lib/skills-catalog";

const STAT_ORDER: StatCode[] = ["STR", "END", "VIT", "MIND", "INT"];

function daysAgoIso(days: number): string {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
}

export default async function StatsPage() {
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
  const ceiling = statCeiling(character.newLevel);

  const ninetyDaysAgo = daysAgoIso(90);

  const [{ data: stats }, { data: history }, { data: skills }] = await Promise.all([
    supabase.from("stats").select("code, current_value"),
    supabase
      .from("stat_history")
      .select("stat_code, value, recorded_at")
      .eq("user_id", user.id)
      .gte("recorded_at", ninetyDaysAgo)
      .order("recorded_at", { ascending: true }),
    supabase.from("skills").select("name, linked_stats"),
  ]);

  const currentByCode = new Map(
    (stats ?? []).map((s) => [s.code as StatCode, s.current_value as number]),
  );

  type HistoryRow = { stat_code: string; value: number; recorded_at: string };
  const historyByCode = new Map<StatCode, { date: string; value: number }[]>();
  for (const row of (history as HistoryRow[] | null) ?? []) {
    const list = historyByCode.get(row.stat_code as StatCode) ?? [];
    list.push({ date: row.recorded_at, value: row.value });
    historyByCode.set(row.stat_code as StatCode, list);
  }

  type SkillRow = { name: string; linked_stats: { stat: StatCode; weight: number }[] };
  const feedersByCode = new Map<StatCode, string[]>();
  for (const skill of (skills as SkillRow[] | null) ?? []) {
    for (const link of skill.linked_stats ?? []) {
      const list = feedersByCode.get(link.stat) ?? [];
      list.push(skill.name);
      feedersByCode.set(link.stat, list);
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-8 px-4 py-10">
      <AppNav active="/stats" />
      <h1 className="text-xl font-semibold text-foreground">Stats</h1>
      <div className="flex flex-col gap-6">
        {STAT_ORDER.map((code) => (
          <StatDetailCard
            key={code}
            code={code}
            currentValue={currentByCode.get(code) ?? 0}
            ceiling={ceiling}
            history={historyByCode.get(code) ?? []}
            feeders={feedersByCode.get(code) ?? []}
          />
        ))}
      </div>
    </div>
  );
}
