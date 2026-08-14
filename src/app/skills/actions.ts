"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { startingSkillLevel } from "@/lib/onboarding";
import { skillCumulativeExpForLevel } from "@/lib/leveling";
import { syncComputedStats } from "@/lib/sync-stats";
import type { SkillCategory, StatCode } from "@/lib/skills-catalog";

export type CreateSkillInput = {
  name: string;
  category: SkillCategory;
  stat: Extract<StatCode, "STR" | "END" | "INT">;
  isMaintenance: boolean;
  selfRating: number;
};

export async function createSkill(input: CreateSkillInput) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const name = input.name.trim();
  if (!name) {
    throw new Error("Skill name is required");
  }

  const level = startingSkillLevel(input.selfRating);

  const { error } = await supabase.from("skills").insert({
    user_id: user.id,
    category: input.category,
    name,
    linked_stats: [{ stat: input.stat, weight: 1.0 }],
    level,
    current_exp: skillCumulativeExpForLevel(level),
    is_maintenance: input.isMaintenance,
  });

  if (error) {
    throw new Error(error.message);
  }

  await syncComputedStats(supabase, user.id);
  redirect("/skills");
}
