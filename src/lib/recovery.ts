import type { SupabaseClient } from "@supabase/supabase-js";

function dateOnly(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/**
 * Marks pending daily quests from before today as missed (with a Fatigue
 * debuff on the linked skill — decision #6) or excluded, if the quest's
 * day falls inside a "Life happened" flag range. Never touches skill level
 * or EXP — the Fatigue debuff and life_happened both stay non-punitive per
 * CLAUDE.md "Failure / Recovery System".
 */
export async function processMissedQuests(
  supabase: SupabaseClient,
  userId: string,
) {
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const [{ data: stale }, { data: flags }] = await Promise.all([
    supabase
      .from("quests")
      .select("id, skill_id, created_at")
      .eq("user_id", userId)
      .eq("type", "daily")
      .eq("status", "pending")
      .lt("created_at", todayStart.toISOString()),
    supabase
      .from("life_happened_flags")
      .select("start_date, end_date")
      .eq("user_id", userId),
  ]);

  if (!stale || stale.length === 0) return;

  const flagRanges = flags ?? [];
  const isFlagged = (day: string) =>
    flagRanges.some((f) => day >= f.start_date && day <= f.end_date);

  for (const quest of stale) {
    const questDay = dateOnly(new Date(quest.created_at as string));
    const excluded = isFlagged(questDay);

    await supabase
      .from("quests")
      .update({ status: excluded ? "excluded" : "missed" })
      .eq("id", quest.id);

    await supabase.from("quest_logs").insert({
      user_id: userId,
      quest_id: quest.id,
      event: excluded ? "excluded" : "missed",
      exp_awarded: 0,
      log_date: questDay,
    });

    if (!excluded && quest.skill_id) {
      await supabase
        .from("skills")
        .update({ fatigue_active: true })
        .eq("id", quest.skill_id);
    }
  }
}

/**
 * Days since the user's last completed quest. Used to detect Re-entry mode
 * (decision #7: 3+ full inactive days). Returns null for a user with no
 * completion history yet (e.g. fresh off onboarding) — re-entry mode only
 * makes sense for someone returning after a gap.
 */
export async function getInactiveDaysCount(
  supabase: SupabaseClient,
  userId: string,
): Promise<number | null> {
  const { data } = await supabase
    .from("quest_logs")
    .select("log_date")
    .eq("user_id", userId)
    .eq("event", "completed")
    .order("log_date", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!data) return null;

  const lastCompleted = new Date(data.log_date as string);
  const today = new Date(dateOnly(new Date()));
  const diffMs = today.getTime() - lastCompleted.getTime();
  return Math.floor(diffMs / (24 * 60 * 60 * 1000));
}

/**
 * The skill with the user's highest historical quest-completion rate —
 * the "guaranteed early win" re-entry mode draws from (decision #7).
 */
export async function getHighestCompletionRateSkill(
  supabase: SupabaseClient,
  userId: string,
): Promise<{ id: string; name: string } | null> {
  const { data: logs } = await supabase
    .from("quest_logs")
    .select("event, quests(skill_id, skills(id, name))")
    .eq("user_id", userId)
    .in("event", ["completed", "missed"]);

  type LogRow = {
    event: string;
    quests: { skill_id: string | null; skills: { id: string; name: string } | null } | null;
  };

  const bySkill = new Map<string, { name: string; completed: number; total: number }>();

  for (const log of (logs as LogRow[] | null) ?? []) {
    const skill = log.quests?.skills;
    if (!skill) continue;
    const entry = bySkill.get(skill.id) ?? { name: skill.name, completed: 0, total: 0 };
    entry.total += 1;
    if (log.event === "completed") entry.completed += 1;
    bySkill.set(skill.id, entry);
  }

  let best: { id: string; name: string; rate: number } | null = null;
  for (const [id, s] of bySkill) {
    const rate = s.completed / s.total;
    if (!best || rate > best.rate) best = { id, name: s.name, rate };
  }

  return best ? { id: best.id, name: best.name } : null;
}
