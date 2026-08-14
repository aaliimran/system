"use server";

import { createClient } from "@/lib/supabase/server";
import { skillLevelFromExp } from "@/lib/leveling";
import { syncComputedStats } from "@/lib/sync-stats";
import { syncCharacterLevel } from "@/lib/sync-character-level";
import { composeDailyQuests } from "@/lib/daily-composer";
import { checkAchievements } from "@/lib/achievements";

export type QuestType =
  | "daily"
  | "weekly"
  | "main"
  | "milestone"
  | "challenge"
  | "boss";

export type CreateQuestInput = {
  type: QuestType;
  title: string;
  skillId: string | null;
  baseExp: number;
  parentQuestId?: string | null;
  dueDate?: string | null;
};

export async function createQuest(input: CreateQuestInput) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("Not signed in");
  }

  const title = input.title.trim();
  if (!title) {
    throw new Error("Quest title is required");
  }

  const { error } = await supabase.from("quests").insert({
    user_id: user.id,
    type: input.type,
    title,
    skill_id: input.skillId,
    base_exp: Math.max(0, Math.round(input.baseExp)),
    parent_quest_id: input.parentQuestId ?? null,
    due_date: input.dueDate ?? null,
  });

  if (error) {
    throw new Error(error.message);
  }
}

// PR/breakthrough bonus — CLAUDE.md "XP System": +50% of the action's normal EXP.
const PR_EXP_MULTIPLIER = 1.5;

export async function completeQuest(questId: string, isPr = false) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("Not signed in");
  }

  const { data: quest, error: questError } = await supabase
    .from("quests")
    .select("id, status, base_exp, skill_id")
    .eq("id", questId)
    .single();

  if (questError || !quest) {
    throw new Error("Quest not found");
  }
  if (quest.status !== "pending") {
    throw new Error("Quest is not pending");
  }

  const awardedExp = isPr
    ? Math.round(quest.base_exp * PR_EXP_MULTIPLIER)
    : quest.base_exp;
  const now = new Date().toISOString();

  const { error: updateError } = await supabase
    .from("quests")
    .update({
      status: "completed",
      completed_at: now,
      awarded_exp: awardedExp,
      is_pr: isPr,
    })
    .eq("id", questId);

  if (updateError) throw new Error(updateError.message);

  const { error: logError } = await supabase.from("quest_logs").insert({
    user_id: user.id,
    quest_id: questId,
    event: "completed",
    exp_awarded: awardedExp,
    log_date: now.slice(0, 10),
  });

  if (logError) throw new Error(logError.message);

  let leveledUp = false;
  let newLevel: number | null = null;

  if (quest.skill_id) {
    const { data: skill } = await supabase
      .from("skills")
      .select("name, category, level, current_exp")
      .eq("id", quest.skill_id)
      .single();

    if (skill) {
      const updatedExp = skill.current_exp + awardedExp;
      const updatedLevel = skillLevelFromExp(updatedExp);
      leveledUp = updatedLevel > skill.level;
      newLevel = updatedLevel;

      await supabase
        .from("skills")
        .update({
          current_exp: updatedExp,
          level: updatedLevel,
          fatigue_active: false,
        })
        .eq("id", quest.skill_id);

      if (leveledUp) {
        await supabase.from("codex_entries").insert({
          user_id: user.id,
          entry_type: "skill_level_up",
          title: `${skill.name} reached Lv ${updatedLevel}`,
          metadata: { skill_id: quest.skill_id, category: skill.category, level: updatedLevel },
        });
      }
    }

    await syncComputedStats(supabase, user.id);
  }

  const character = await syncCharacterLevel(supabase, user.id);
  const newAchievements = await checkAchievements(supabase, user.id);

  return {
    awardedExp,
    leveledUp,
    newLevel,
    characterLeveledUp: character.leveledUp,
    newCharacterLevel: character.newLevel,
    newAchievements,
  };
}

export async function generateDailyQuests() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("Not signed in");
  }

  return composeDailyQuests(supabase, user.id);
}

export type SetLifeHappenedInput = {
  startDate: string;
  endDate: string;
  reason: string;
};

export async function setLifeHappenedFlag(input: SetLifeHappenedInput) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("Not signed in");
  }

  if (!input.startDate || !input.endDate) {
    throw new Error("Start and end date are required");
  }
  if (input.endDate < input.startDate) {
    throw new Error("End date must be on or after the start date");
  }

  const { error } = await supabase.from("life_happened_flags").insert({
    user_id: user.id,
    start_date: input.startDate,
    end_date: input.endDate,
    reason: input.reason.trim() || null,
  });

  if (error) throw new Error(error.message);
}

// Challenge base EXP is a bonus over the daily base (decision #9 sets Daily
// at 20; Challenge isn't explicitly listed there, so it's treated as a 1.5x
// stretch bonus over that baseline).
const CHALLENGE_BASE_EXP = 30;

const CHALLENGE_TEMPLATES = [
  (skill: string) => `Push past today: extra session of ${skill}`,
  (skill: string) => `Bonus round: go further with ${skill} than you planned`,
  (skill: string) => `Stretch quest: raise the bar in ${skill}`,
];

export async function requestChallenge() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("Not signed in");
  }

  const { data: skills } = await supabase
    .from("skills")
    .select("id, name, level")
    .eq("user_id", user.id)
    .eq("is_maintenance", false)
    .order("level", { ascending: false })
    .limit(1);

  const skill = skills?.[0];
  if (!skill) {
    throw new Error("No active skill to build a challenge around yet");
  }

  const template =
    CHALLENGE_TEMPLATES[Math.floor(Math.random() * CHALLENGE_TEMPLATES.length)];

  const { error } = await supabase.from("quests").insert({
    user_id: user.id,
    type: "challenge",
    title: template(skill.name),
    skill_id: skill.id,
    base_exp: CHALLENGE_BASE_EXP,
    source: "manual",
  });

  if (error) throw new Error(error.message);
}
