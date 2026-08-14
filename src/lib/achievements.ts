import type { SupabaseClient } from "@supabase/supabase-js";

function dateOnly(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/** Comeback — decision #10: return after >=3 inactive days, then 100% completion for 3 days. */
async function checkComeback(
  supabase: SupabaseClient,
  userId: string,
): Promise<boolean> {
  const { data: logs } = await supabase
    .from("quest_logs")
    .select("log_date, event")
    .eq("user_id", userId)
    .in("event", ["completed", "missed"]);

  const rows = logs ?? [];
  const completedDates = new Set(
    rows.filter((r) => r.event === "completed").map((r) => r.log_date as string),
  );
  const missedDates = new Set(
    rows.filter((r) => r.event === "missed").map((r) => r.log_date as string),
  );
  if (completedDates.size === 0) return false;

  const today = dateOnly(new Date());

  for (const day of completedDates) {
    const d = new Date(day);
    let priorInactive = true;
    for (let i = 1; i <= 3; i++) {
      const p = new Date(d);
      p.setDate(p.getDate() - i);
      if (completedDates.has(dateOnly(p))) {
        priorInactive = false;
        break;
      }
    }
    if (!priorInactive) continue;

    let windowOk = true;
    for (let i = 0; i < 3; i++) {
      const w = new Date(d);
      w.setDate(w.getDate() + i);
      const ws = dateOnly(w);
      if (ws > today) {
        windowOk = false;
        break;
      }
      if (!completedDates.has(ws) || missedDates.has(ws)) {
        windowOk = false;
        break;
      }
    }
    if (windowOk) return true;
  }

  return false;
}

/** Polymath — decision #10: level-ups in 3+ categories within a rolling 7-day window. */
async function checkPolymath(
  supabase: SupabaseClient,
  userId: string,
): Promise<boolean> {
  const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const { data } = await supabase
    .from("codex_entries")
    .select("metadata")
    .eq("user_id", userId)
    .eq("entry_type", "skill_level_up")
    .gte("occurred_at", since);

  type Meta = { category?: string };
  const categories = new Set(
    (data ?? [])
      .map((d) => (d.metadata as Meta | null)?.category)
      .filter((c): c is string => !!c),
  );
  return categories.size >= 3;
}

/** Plateau Breaker — decision #10: a PR in a skill with zero PRs in the preceding 21 days. */
async function checkPlateauBreaker(
  supabase: SupabaseClient,
  userId: string,
): Promise<boolean> {
  const { data } = await supabase
    .from("quest_logs")
    .select("log_date, quests(skill_id, is_pr)")
    .eq("user_id", userId)
    .eq("event", "completed");

  type Row = {
    log_date: string;
    quests: { skill_id: string | null; is_pr: boolean } | null;
  };
  const rows = ((data as Row[] | null) ?? []).filter(
    (r) => r.quests?.is_pr && r.quests?.skill_id,
  );

  for (const row of rows) {
    const skillId = row.quests!.skill_id;
    const day = new Date(row.log_date);
    const windowStart = new Date(day);
    windowStart.setDate(windowStart.getDate() - 21);

    const hasEarlierPr = rows.some(
      (r) =>
        r !== row &&
        r.quests!.skill_id === skillId &&
        new Date(r.log_date) >= windowStart &&
        new Date(r.log_date) < day,
    );
    if (!hasEarlierPr) return true;
  }

  return false;
}

/** Night Before — decision #10: all daily quests done the day before a flagged milestone due date. */
async function checkNightBefore(
  supabase: SupabaseClient,
  userId: string,
): Promise<boolean> {
  const { data: milestones } = await supabase
    .from("quests")
    .select("due_date")
    .eq("user_id", userId)
    .eq("type", "milestone")
    .not("due_date", "is", null);

  for (const m of milestones ?? []) {
    const due = new Date(m.due_date as string);
    const dayBefore = new Date(due);
    dayBefore.setDate(dayBefore.getDate() - 1);
    const dayBeforeStart = dateOnly(dayBefore);
    const dayBeforeEnd = new Date(dayBefore);
    dayBeforeEnd.setDate(dayBeforeEnd.getDate() + 1);

    const { data: dayQuests } = await supabase
      .from("quests")
      .select("status")
      .eq("user_id", userId)
      .eq("type", "daily")
      .gte("created_at", `${dayBeforeStart}T00:00:00.000Z`)
      .lt("created_at", `${dateOnly(dayBeforeEnd)}T00:00:00.000Z`);

    const rows = dayQuests ?? [];
    if (rows.length > 0 && rows.every((q) => q.status === "completed")) {
      return true;
    }
  }

  return false;
}

const CHECKS: { key: string; run: (s: SupabaseClient, u: string) => Promise<boolean> }[] = [
  { key: "comeback", run: checkComeback },
  { key: "polymath", run: checkPolymath },
  { key: "plateau_breaker", run: checkPlateauBreaker },
  { key: "night_before", run: checkNightBefore },
];

/** Evaluates all catalog achievements, unlocks any newly earned ones, returns their display names. */
export async function checkAchievements(
  supabase: SupabaseClient,
  userId: string,
): Promise<string[]> {
  const { data: unlocked } = await supabase
    .from("achievements_unlocked")
    .select("achievement_key")
    .eq("user_id", userId);
  const unlockedKeys = new Set((unlocked ?? []).map((u) => u.achievement_key as string));

  const newlyUnlockedKeys: string[] = [];

  for (const { key, run } of CHECKS) {
    if (unlockedKeys.has(key)) continue;
    if (await run(supabase, userId)) {
      const { error } = await supabase
        .from("achievements_unlocked")
        .insert({ user_id: userId, achievement_key: key });
      if (!error) newlyUnlockedKeys.push(key);
    }
  }

  if (newlyUnlockedKeys.length === 0) return [];

  const { data: names } = await supabase
    .from("achievements_catalog")
    .select("key, name")
    .in("key", newlyUnlockedKeys);

  const nameList = (names ?? []).map((n) => n.name as string);

  await supabase.from("codex_entries").insert(
    (names ?? []).map((n) => ({
      user_id: userId,
      entry_type: "achievement_unlocked",
      title: `Achievement unlocked: ${n.name}`,
      metadata: { achievement_key: n.key },
    })),
  );

  return nameList;
}
