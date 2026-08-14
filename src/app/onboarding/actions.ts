"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { SKILLS_CATALOG } from "@/lib/skills-catalog";
import { startingSkillLevel, type CefrTier } from "@/lib/onboarding";
import { skillCumulativeExpForLevel } from "@/lib/leveling";

export type OnboardingSkillAnswer = {
  key: string;
  selfRating: number;
  cefr?: CefrTier;
  note?: string;
};

export type OnboardingPayload = {
  intensity: "soft" | "balanced" | "hard";
  skills: OnboardingSkillAnswer[];
};

const STAT_CODES = ["STR", "END", "VIT", "MIND", "INT"] as const;

export async function submitOnboarding(payload: OnboardingPayload) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: existing } = await supabase
    .from("users")
    .select("onboarding_completed_at")
    .eq("id", user.id)
    .maybeSingle();

  if (existing?.onboarding_completed_at) {
    redirect("/");
  }

  await supabase
    .from("users")
    .upsert({ id: user.id, intensity: payload.intensity }, { onConflict: "id" });

  const answersByKey = new Map(payload.skills.map((a) => [a.key, a]));

  const skillRows = SKILLS_CATALOG.map((catalogSkill) => {
    const answer = answersByKey.get(catalogSkill.key);
    const selfRating = answer?.selfRating ?? 1;
    const cefr = catalogSkill.cefr ? answer?.cefr : undefined;
    const level = startingSkillLevel(selfRating, cefr);
    return {
      user_id: user.id,
      category: catalogSkill.category,
      name: catalogSkill.name,
      linked_stats: catalogSkill.linkedStats.map((l) => ({
        stat: l.stat,
        weight: l.weight,
      })),
      level,
      current_exp: skillCumulativeExpForLevel(level),
      is_maintenance: catalogSkill.isMaintenance ?? false,
    };
  });

  const { data: insertedSkills, error: skillsError } = await supabase
    .from("skills")
    .insert(skillRows)
    .select("id, name");

  if (skillsError || !insertedSkills) {
    throw new Error(skillsError?.message ?? "Failed to create skills");
  }

  const skillIdByName = new Map(insertedSkills.map((s) => [s.name, s.id]));

  const onboardingAnswerRows = SKILLS_CATALOG.map((catalogSkill) => {
    const answer = answersByKey.get(catalogSkill.key);
    return {
      user_id: user.id,
      skill_id: skillIdByName.get(catalogSkill.name) ?? null,
      question_key: "self_rating",
      self_rating: answer?.selfRating ?? 1,
      objective_answer: {
        cefr: catalogSkill.cefr ? (answer?.cefr ?? null) : null,
        note: answer?.note ?? null,
      },
    };
  });

  const subSkillRows = SKILLS_CATALOG.flatMap((catalogSkill) =>
    (catalogSkill.subSkills ?? []).map((name) => ({
      user_id: user.id,
      skill_id: skillIdByName.get(catalogSkill.name) ?? null,
      name,
      level: 1,
      current_exp: 0,
    })),
  );

  const statRows = STAT_CODES.map((code) => ({
    user_id: user.id,
    code,
    current_value: 0,
  }));

  const [answersResult, subSkillsResult, statsResult] = await Promise.all([
    supabase.from("onboarding_answers").insert(onboardingAnswerRows),
    subSkillRows.length
      ? supabase.from("sub_skills").insert(subSkillRows)
      : Promise.resolve({ error: null }),
    supabase.from("stats").insert(statRows),
  ]);

  if (answersResult.error) throw new Error(answersResult.error.message);
  if (subSkillsResult.error) throw new Error(subSkillsResult.error.message);
  if (statsResult.error) throw new Error(statsResult.error.message);

  const { error: completeError } = await supabase
    .from("users")
    .update({ onboarding_completed_at: new Date().toISOString() })
    .eq("id", user.id);

  if (completeError) throw new Error(completeError.message);

  redirect("/");
}
