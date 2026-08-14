"use server";

import { createClient } from "@/lib/supabase/server";
import { skillLevelFromExp } from "@/lib/leveling";
import { syncComputedStats } from "@/lib/sync-stats";
import { syncCharacterLevel } from "@/lib/sync-character-level";
import { composeDailyQuests } from "@/lib/daily-composer";

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
  });

  if (error) {
    throw new Error(error.message);
  }
}

export async function completeQuest(questId: string) {
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

  const awardedExp = quest.base_exp;
  const now = new Date().toISOString();

  const { error: updateError } = await supabase
    .from("quests")
    .update({ status: "completed", completed_at: now, awarded_exp: awardedExp })
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
      .select("level, current_exp")
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
    }

    await syncComputedStats(supabase, user.id);
  }

  const character = await syncCharacterLevel(supabase, user.id);

  return {
    awardedExp,
    leveledUp,
    newLevel,
    characterLeveledUp: character.leveledUp,
    newCharacterLevel: character.newLevel,
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
