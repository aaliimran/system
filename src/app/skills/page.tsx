import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { syncComputedStats } from "@/lib/sync-stats";
import { skillCumulativeExpForLevel, skillExpToNext } from "@/lib/leveling";
import { CATEGORY_LABELS, type SkillCategory } from "@/lib/skills-catalog";
import { AppNav } from "@/components/app-nav";
import { AddSkillForm } from "./add-skill-form";

const CATEGORY_ORDER: SkillCategory[] = [
  "PHYSICAL",
  "KNOWLEDGE_CRAFT",
  "PERSONAL_DEVELOPMENT",
];

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
      .select("id, category, name, level, current_exp, is_maintenance, fatigue_active")
      .order("name"),
    supabase.from("sub_skills").select("id, skill_id, name, level, current_exp"),
  ]);

  const subSkillsBySkill = new Map<string, typeof subSkills>();
  for (const sub of subSkills ?? []) {
    const list = subSkillsBySkill.get(sub.skill_id) ?? [];
    list.push(sub);
    subSkillsBySkill.set(sub.skill_id, list);
  }

  const skillsByCategory = new Map<SkillCategory, NonNullable<typeof skills>>();
  for (const category of CATEGORY_ORDER) skillsByCategory.set(category, []);
  for (const skill of skills ?? []) {
    skillsByCategory.get(skill.category as SkillCategory)?.push(skill);
  }

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-8 px-4 py-10">
      <AppNav active="/skills" />

      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-foreground">Skills</h1>
        <AddSkillForm />
      </div>

      {CATEGORY_ORDER.map((category) => {
        const categorySkills = skillsByCategory.get(category) ?? [];
        if (categorySkills.length === 0) return null;

        return (
          <section key={category}>
            <h2 className="text-sm font-medium text-muted">
              {CATEGORY_LABELS[category]}
            </h2>
            <div className="mt-3 flex flex-col gap-3">
              {categorySkills.map((skill) => {
                const { current, needed, percent } = levelProgress(
                  skill.level,
                  skill.current_exp,
                );
                const subs = subSkillsBySkill.get(skill.id) ?? [];

                return (
                  <div
                    key={skill.id}
                    className="rounded-lg border border-border bg-surface p-4"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-foreground">
                          {skill.name}
                        </span>
                        {skill.is_maintenance && (
                          <span className="rounded-full border border-border px-2 py-0.5 text-[10px] uppercase tracking-wide text-muted">
                            Maintenance
                          </span>
                        )}
                        {skill.fatigue_active && (
                          <span className="rounded-full border border-border px-2 py-0.5 text-[10px] uppercase tracking-wide text-muted opacity-60">
                            Fatigued
                          </span>
                        )}
                      </div>
                      <span className="font-mono text-sm text-foreground">
                        Lv {skill.level}
                      </span>
                    </div>
                    <div
                      className={`mt-2 h-1.5 w-full overflow-hidden rounded-full bg-border ${
                        skill.fatigue_active ? "opacity-50" : ""
                      }`}
                    >
                      <div
                        className="h-full rounded-full bg-foreground"
                        style={{ width: `${percent}%` }}
                      />
                    </div>
                    <p className="mt-1 font-mono text-[11px] text-muted">
                      {current} / {needed} EXP
                    </p>

                    {subs.length > 0 && (
                      <div className="mt-3 flex flex-col gap-2 border-t border-border pt-3">
                        {subs.map((sub) => (
                          <div
                            key={sub.id}
                            className="flex items-center justify-between pl-3 text-xs"
                          >
                            <span className="text-muted">{sub.name}</span>
                            <span className="font-mono text-muted">
                              Lv {sub.level}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        );
      })}
    </div>
  );
}
