import type { SupabaseClient } from "@supabase/supabase-js";
import { createAnthropicClient } from "./anthropic";
import { getIntensityOption } from "./intensity";
import {
  processMissedQuests,
  getInactiveDaysCount,
  getHighestCompletionRateSkill,
} from "./recovery";

// Re-entry mode threshold and quest count — decision #7.
const REENTRY_INACTIVE_DAYS = 3;
const REENTRY_QUEST_COUNT = 2;

// Daily base EXP before the intensity multiplier — decision #9 sets the
// base, decision #8 sets the ×0.8/1.0/1.2 multiplier. Content (title,
// skill) is AI-decided; the EXP value never is.
const DAILY_BASE_EXP = 20;

const QUEST_LIST_SCHEMA = {
  type: "object",
  properties: {
    quests: {
      type: "array",
      items: {
        type: "object",
        properties: {
          title: {
            type: "string",
            description:
              "Short, concrete daily quest title completable in one sitting, e.g. '20 min Korean reading'. Never vague like 'work on cybersecurity'.",
          },
          skill_name: {
            type: ["string", "null"],
            description:
              "Exact name of one skill from the provided list this quest trains, or null for a general/recovery quest.",
          },
        },
        required: ["title", "skill_name"],
        additionalProperties: false,
      },
    },
  },
  required: ["quests"],
  additionalProperties: false,
};

type ComposedQuest = { title: string; skill_name: string | null };

export type ComposeResult = { created: number } | { skipped: string };

export async function composeDailyQuests(
  supabase: SupabaseClient,
  userId: string,
): Promise<ComposeResult> {
  await processMissedQuests(supabase, userId);

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const { data: existing } = await supabase
    .from("quests")
    .select("id")
    .eq("user_id", userId)
    .eq("type", "daily")
    .eq("source", "composer")
    .gte("created_at", todayStart.toISOString())
    .limit(1);

  if (existing && existing.length > 0) {
    return { skipped: "Today's quests already generated" };
  }

  const fourteenDaysAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 10);

  const [{ data: user }, { data: skills }, { data: recentLogs }, { data: weeklyReview }] =
    await Promise.all([
      supabase.from("users").select("intensity").eq("id", userId).single(),
      supabase
        .from("skills")
        .select("id, name, category, level, is_maintenance")
        .eq("user_id", userId),
      supabase
        .from("quest_logs")
        .select("log_date, event, quests(title, skill_id)")
        .eq("user_id", userId)
        .gte("log_date", fourteenDaysAgo)
        .order("log_date", { ascending: false }),
      supabase
        .from("weekly_reviews")
        .select("recommended_focus")
        .eq("user_id", userId)
        .eq("accepted", true)
        .order("week_start", { ascending: false })
        .limit(1)
        .maybeSingle(),
    ]);

  const intensityOption = getIntensityOption(user?.intensity ?? "balanced");
  const intensity = intensityOption.value;
  const questBaseExp = Math.round(DAILY_BASE_EXP * intensityOption.expMultiplier);

  const inactiveDays = await getInactiveDaysCount(supabase, userId);
  const reentry = inactiveDays !== null && inactiveDays >= REENTRY_INACTIVE_DAYS;
  const easyWinSkill = reentry
    ? await getHighestCompletionRateSkill(supabase, userId)
    : null;

  const questCount = reentry ? REENTRY_QUEST_COUNT : intensityOption.questCount;
  const aiQuestCount = easyWinSkill ? questCount - 1 : questCount;

  const activeSkills = (skills ?? []).filter((s) => !s.is_maintenance);
  const skillsById = new Map((skills ?? []).map((s) => [s.id, s]));
  const skillIdByName = new Map(
    (skills ?? []).map((s) => [s.name.toLowerCase(), s.id]),
  );

  const skillsList = activeSkills
    .map((s) => `- ${s.name} (${s.category}, Lv ${s.level})`)
    .join("\n");

  type LogRow = {
    log_date: string;
    event: string;
    quests: { title: string; skill_id: string | null } | null;
  };
  const activitySummary =
    ((recentLogs as LogRow[] | null) ?? [])
      .map((l) => {
        const skillName = l.quests?.skill_id
          ? (skillsById.get(l.quests.skill_id)?.name ?? "unlinked skill")
          : "unlinked";
        return `${l.log_date}: ${l.event} — ${l.quests?.title ?? "quest"} (${skillName})`;
      })
      .join("\n") || "No activity logged in the last 14 days.";

  const weeklyFocus = weeklyReview?.recommended_focus ?? null;

  const system = reentry
    ? `You are the Daily Composer for a personal RPG-style life-progression app. The user is returning after ${inactiveDays} days away — this is a re-entry day, not a normal one.
Rules:
- Generate exactly ${aiQuestCount} quest${aiQuestCount === 1 ? "" : "s"}.
- Make it genuinely easy and welcoming — the lowest realistic bar for that skill. The goal is a quick win, not a real workout.
- Nothing overwhelming, nothing that implies they should have kept the streak. No guilt, no "let's get back on track" framing.
- skill_name must exactly match one of the provided skill names, or be null for a general/recovery quest.`
    : `You are the Daily Composer for a personal RPG-style life-progression app. Generate today's Daily Quests for the user from their skills and recent activity trend.
Rules:
- Generate exactly ${aiQuestCount} quests.
- Each quest must be short, concrete, and completable in one sitting.
- Prefer skills that have gone quiet recently over ones already worked hard this week — variety matters.
- skill_name must exactly match one of the provided skill names, or be null for a general/recovery quest.${
        weeklyFocus
          ? `\n- At least one quest must target this week's focus: "${weeklyFocus}".`
          : ""
      }`;

  const userPrompt = `Intensity: ${intensity}

User's skills:
${skillsList || "No skills yet."}

Activity over the last 14 days:
${activitySummary}`;

  let composedQuests: ComposedQuest[] = [];

  if (aiQuestCount > 0) {
    const anthropic = createAnthropicClient();
    const response = await anthropic.messages.create({
      model: "claude-opus-5",
      max_tokens: 1024,
      output_config: {
        effort: "low",
        format: { type: "json_schema", schema: QUEST_LIST_SCHEMA },
      },
      system,
      messages: [{ role: "user", content: userPrompt }],
    });

    if (response.stop_reason === "refusal") {
      throw new Error("Daily Composer request was declined");
    }

    const textBlock = response.content.find((b) => b.type === "text");
    if (!textBlock || textBlock.type !== "text") {
      throw new Error("Daily Composer returned no text output");
    }

    const parsed = JSON.parse(textBlock.text) as { quests: ComposedQuest[] };
    composedQuests = (parsed.quests ?? []).slice(0, aiQuestCount);
  }

  if (easyWinSkill) {
    composedQuests.push({
      title: `Just show up: a few easy minutes of ${easyWinSkill.name}`,
      skill_name: easyWinSkill.name,
    });
  }

  if (composedQuests.length === 0) {
    return { skipped: "Composer returned no quests" };
  }

  const rows = composedQuests.map((q) => ({
    user_id: userId,
    type: "daily" as const,
    title: q.title,
    skill_id: q.skill_name
      ? (skillIdByName.get(q.skill_name.toLowerCase()) ?? null)
      : null,
    base_exp: questBaseExp,
    source: "composer" as const,
  }));

  const { error } = await supabase.from("quests").insert(rows);
  if (error) throw new Error(error.message);

  return { created: rows.length };
}
