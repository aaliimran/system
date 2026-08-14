import type { SupabaseClient } from "@supabase/supabase-js";
import { computeSkillDerivedStat, type SkillForStats } from "./stats";

const SKILL_DERIVED_CODES = ["STR", "END", "INT"] as const;

/**
 * Recomputes STR/END/INT from the user's current skills and persists them
 * (Build Order step 4 "level calculation"). MIND/VIT stay untouched here —
 * they're derived from quest_logs / vitality_logs, wired in a later step.
 * Only writes a stat_history row when the value actually changed, so history
 * stays meaningful instead of accumulating one row per page view.
 */
export async function syncComputedStats(
  supabase: SupabaseClient,
  userId: string,
) {
  const [{ data: skills }, { data: existingStats }] = await Promise.all([
    supabase
      .from("skills")
      .select("level, linked_stats")
      .eq("user_id", userId),
    supabase.from("stats").select("code, current_value").eq("user_id", userId),
  ]);

  const existingByCode = new Map<string, number>(
    (existingStats ?? []).map((s) => [s.code, s.current_value]),
  );

  const now = new Date().toISOString();
  const upsertRows: { user_id: string; code: string; current_value: number; updated_at: string }[] = [];
  const historyRows: { user_id: string; stat_code: string; value: number }[] = [];

  for (const code of SKILL_DERIVED_CODES) {
    const value = computeSkillDerivedStat(
      code,
      (skills ?? []) as SkillForStats[],
    );
    upsertRows.push({ user_id: userId, code, current_value: value, updated_at: now });
    if (existingByCode.get(code) !== value) {
      historyRows.push({ user_id: userId, stat_code: code, value });
    }
  }

  await supabase.from("stats").upsert(upsertRows, { onConflict: "user_id,code" });
  if (historyRows.length) {
    await supabase.from("stat_history").insert(historyRows);
  }
}
