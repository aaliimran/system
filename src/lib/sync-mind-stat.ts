import type { SupabaseClient } from "@supabase/supabase-js";

const MIND_LOOKBACK_DAYS = 30;
const STREAK_CAP_DAYS = 14;

function dateOnly(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/**
 * MIND is not skill-derived (decision #4) — computed directly from
 * quest_logs: % completion + streak length. Same self-correcting
 * sync-on-read pattern as sync-stats.ts / sync-character-level.ts.
 */
export async function syncMindStat(
  supabase: SupabaseClient,
  userId: string,
  ceiling: number,
): Promise<{ value: number; streak: number }> {
  const since = dateOnly(
    new Date(Date.now() - MIND_LOOKBACK_DAYS * 24 * 60 * 60 * 1000),
  );

  const { data: logs } = await supabase
    .from("quest_logs")
    .select("event, log_date")
    .eq("user_id", userId)
    .gte("log_date", since)
    .in("event", ["completed", "missed"]);

  const rows = logs ?? [];
  const completed = rows.filter((l) => l.event === "completed").length;
  const missed = rows.filter((l) => l.event === "missed").length;
  const completionRate =
    completed + missed > 0 ? completed / (completed + missed) : 0;

  const completedDates = new Set(
    rows.filter((l) => l.event === "completed").map((l) => l.log_date as string),
  );

  let streak = 0;
  const cursor = new Date();
  if (completedDates.has(dateOnly(cursor))) streak++;
  cursor.setDate(cursor.getDate() - 1);
  while (completedDates.has(dateOnly(cursor))) {
    streak++;
    cursor.setDate(cursor.getDate() - 1);
  }

  const streakFactor = Math.min(streak / STREAK_CAP_DAYS, 1);
  const value = Math.round(ceiling * (0.7 * completionRate + 0.3 * streakFactor));

  const { data: existing } = await supabase
    .from("stats")
    .select("current_value")
    .eq("user_id", userId)
    .eq("code", "MIND")
    .maybeSingle();

  await supabase.from("stats").upsert(
    {
      user_id: userId,
      code: "MIND",
      current_value: value,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id,code" },
  );

  if (!existing || existing.current_value !== value) {
    await supabase.from("stat_history").insert({
      user_id: userId,
      stat_code: "MIND",
      value,
    });
  }

  return { value, streak };
}
