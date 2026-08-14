import type { SupabaseClient } from "@supabase/supabase-js";
import { createAnthropicClient } from "./anthropic";
import { statCeiling } from "./stats";
import { syncComputedStats } from "./sync-stats";
import { syncCharacterLevel } from "./sync-character-level";
import { syncMindStat } from "./sync-mind-stat";
import type { StatCode } from "./skills-catalog";

const STAT_CODES: StatCode[] = ["STR", "END", "VIT", "MIND", "INT"];

const REVIEW_SCHEMA = {
  type: "object",
  properties: {
    detected_issue: {
      type: "string",
      description:
        "One concise sentence naming the most notable imbalance or plateau this week — or a genuine positive observation if nothing stands out. Specific, not generic.",
    },
    recommended_focus: {
      type: "string",
      description:
        "One skill or theme to prioritize next week, phrased as a short directive, e.g. 'Give Cryptography two sessions this week.'",
    },
  },
  required: ["detected_issue", "recommended_focus"],
  additionalProperties: false,
};

function dateOnly(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export type WeeklyReviewResult =
  | { created: true; weekStart: string }
  | { skipped: string };

export async function composeWeeklyReview(
  supabase: SupabaseClient,
  userId: string,
): Promise<WeeklyReviewResult> {
  const weekEnd = new Date();
  weekEnd.setDate(weekEnd.getDate() - 1);
  const weekStart = new Date(weekEnd);
  weekStart.setDate(weekStart.getDate() - 6);
  const weekStartStr = dateOnly(weekStart);
  const weekEndStr = dateOnly(weekEnd);

  const { data: existing } = await supabase
    .from("weekly_reviews")
    .select("id")
    .eq("user_id", userId)
    .eq("week_start", weekStartStr)
    .maybeSingle();

  if (existing) {
    return { skipped: "This week's review already exists" };
  }

  await syncComputedStats(supabase, userId);
  const character = await syncCharacterLevel(supabase, userId);
  const ceiling = statCeiling(character.newLevel);
  await syncMindStat(supabase, userId, ceiling);

  const { data: currentStats } = await supabase
    .from("stats")
    .select("code, current_value")
    .eq("user_id", userId);

  const currentByCode = new Map(
    (currentStats ?? []).map((s) => [s.code as StatCode, s.current_value as number]),
  );

  const baselineByCode = new Map<StatCode, number>();
  for (const code of STAT_CODES) {
    const { data: baseline } = await supabase
      .from("stat_history")
      .select("value")
      .eq("user_id", userId)
      .eq("stat_code", code)
      .lte("recorded_at", weekStart.toISOString())
      .order("recorded_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    baselineByCode.set(code, baseline?.value ?? 0);
  }

  const statDeltas: Record<string, number> = {};
  for (const code of STAT_CODES) {
    const current = currentByCode.get(code) ?? 0;
    const baseline = baselineByCode.get(code) ?? 0;
    statDeltas[code] = Math.round((current - baseline) * 10) / 10;
  }

  const { data: weekLogs } = await supabase
    .from("quest_logs")
    .select("event, exp_awarded, quests(title, skill_id, skills(name))")
    .eq("user_id", userId)
    .gte("log_date", weekStartStr)
    .lte("log_date", weekEndStr);

  type LogRow = {
    event: string;
    exp_awarded: number;
    quests: { title: string; skills: { name: string } | null } | null;
  };
  const rows = (weekLogs as LogRow[] | null) ?? [];
  const completed = rows.filter((r) => r.event === "completed").length;
  const missed = rows.filter((r) => r.event === "missed").length;
  const completionRate =
    completed + missed > 0
      ? Math.round((completed / (completed + missed)) * 100)
      : null;

  const expBySkill = new Map<string, number>();
  for (const r of rows) {
    if (r.event !== "completed") continue;
    const skillName = r.quests?.skills?.name ?? "unlinked";
    expBySkill.set(skillName, (expBySkill.get(skillName) ?? 0) + r.exp_awarded);
  }
  const skillActivity =
    [...expBySkill.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([name, exp]) => `${name}: ${exp} EXP`)
      .join("\n") || "No completed quests this week.";

  const system = `You are the Weekly Analyst for a personal RPG-style life-progression app. Analyze this user's past 7 days and produce one detected issue and one recommended focus for next week.
Rules:
- detected_issue should name a real, specific pattern (imbalance between stats, a skill going quiet, a plateau) — or a genuine positive if the week was solid. Never generic filler.
- recommended_focus must be concrete and actionable for next week, ideally naming a specific skill.
- Keep both to one sentence each.`;

  const userPrompt = `Stat deltas this week (current value change, on the same scale as the radar chart):
${STAT_CODES.map((c) => `${c}: ${statDeltas[c] >= 0 ? "+" : ""}${statDeltas[c]}`).join("\n")}

Quest completion rate this week: ${completionRate === null ? "no data" : `${completionRate}%`}

EXP earned by skill this week:
${skillActivity}`;

  const anthropic = createAnthropicClient();
  const response = await anthropic.messages.create({
    model: "claude-opus-5",
    max_tokens: 1024,
    output_config: {
      effort: "low",
      format: { type: "json_schema", schema: REVIEW_SCHEMA },
    },
    system,
    messages: [{ role: "user", content: userPrompt }],
  });

  if (response.stop_reason === "refusal") {
    throw new Error("Weekly Analyst request was declined");
  }

  const textBlock = response.content.find((b) => b.type === "text");
  if (!textBlock || textBlock.type !== "text") {
    throw new Error("Weekly Analyst returned no text output");
  }

  const parsed = JSON.parse(textBlock.text) as {
    detected_issue: string;
    recommended_focus: string;
  };

  const { error } = await supabase.from("weekly_reviews").insert({
    user_id: userId,
    week_start: weekStartStr,
    week_end: weekEndStr,
    stat_deltas: statDeltas,
    detected_issue: parsed.detected_issue,
    recommended_focus: parsed.recommended_focus,
    accepted: false,
  });

  if (error) throw new Error(error.message);

  return { created: true, weekStart: weekStartStr };
}
