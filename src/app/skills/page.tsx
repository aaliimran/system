import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { syncComputedStats } from "@/lib/sync-stats";
import { skillCumulativeExpForLevel, skillExpToNext } from "@/lib/leveling";
import { CATEGORY_LABELS, type SkillCategory } from "@/lib/skills-catalog";
import { AppNav } from "@/components/app-nav";
import { AddSkillForm } from "./add-skill-form";
import { SkillCard, type SkillCardData } from "./skill-card";

const CATEGORY_ORDER: SkillCategory[] = [
  "PHYSICAL",
  "KNOWLEDGE_CRAFT",
  "PERSONAL_DEVELOPMENT",
];

const CATEGORY_DOT: Record<SkillCategory, string> = {
  PHYSICAL: "bg-amber-500/70",
  KNOWLEDGE_CRAFT: "bg-accent",
  PERSONAL_DEVELOPMENT: "bg-violet-400/70",
};

function levelProgress(level: number, currentExp: number) {
  const levelStart = skillCumulativeExpForLevel(level);
  const levelSpan = skillExpToNext(level);
  const current = Math.max(0, currentExp - levelStart);
  const percent = levelSpan > 0 ? Math.min(current / levelSpan, 1) * 100 : 0;
  return { current, needed: levelSpan, percent };
}

export default async function SkillsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("users")
    .select("onboarding_completed_at")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile?.onboarding_completed_at) {
    redirect("/onboarding");
  }

  await syncComputedStats(supabase, user.id);

  const [{ data: skills }, { data: subSkills }] = await Promise.all([
    supabase
      .from("skills")
      .select(
        "id, category, name, level, current_exp, is_maintenance, fatigue_active, linked_stats",
      )
      .order("name"),
    supabase.from("sub_skills").select("id, skill_id, name, level, current_exp"),
  ]);

  const subSkillsBySkill = new Map<string, typeof subSkills>();
  for (const sub of subSkills ?? []) {
    const list = subSkillsBySkill.get(sub.skill_id) ?? [];
    list.push(sub);
    subSkillsBySkill.set(sub.skill_id, list);
  }

  const skillsByCategory = new Map<SkillCategory, SkillCardData[]>();
  for (const category of CATEGORY_ORDER) skillsByCategory.set(category, []);
  for (const skill of (skills ?? []) as SkillCardData[]) {
    skillsByCategory.get(skill.category)?.push(skill);
  }

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-8 px-4 py-10">
      <AppNav active="/skills" />

      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-foreground">Skills</h1>
        <AddSkillForm />
      </div>

      {(skills?.length ?? 0) === 0 && (
        <p className="text-sm text-muted">
          No skills yet — add your first one above to start tracking progress.
        </p>
      )}

      {CATEGORY_ORDER.map((category) => {
        const categorySkills = skillsByCategory.get(category) ?? [];
        if (categorySkills.length === 0) return null;

        return (
          <section key={category}>
            <h2 className="flex items-center gap-2 text-sm font-medium text-muted">
              <span className={`h-1.5 w-1.5 rounded-full ${CATEGORY_DOT[category]}`} />
              {CATEGORY_LABELS[category]}
            </h2>
            <div className="mt-3 flex flex-col gap-3">
              {categorySkills.map((skill) => (
                <SkillCard
                  key={skill.id}
                  skill={skill}
                  subs={subSkillsBySkill.get(skill.id) ?? []}
                  progress={levelProgress(skill.level, skill.current_exp)}
                />
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}
