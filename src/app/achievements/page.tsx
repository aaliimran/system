import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { checkAchievements } from "@/lib/achievements";
import { AppNav } from "@/components/app-nav";

export default async function AchievementsPage() {
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

  await checkAchievements(supabase, user.id);

  const [{ data: catalog }, { data: unlocked }] = await Promise.all([
    supabase.from("achievements_catalog").select("key, name, description"),
    supabase
      .from("achievements_unlocked")
      .select("achievement_key, unlocked_at")
      .eq("user_id", user.id),
  ]);

  const unlockedByKey = new Map(
    (unlocked ?? []).map((u) => [u.achievement_key as string, u.unlocked_at as string]),
  );

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-8 px-4 py-10">
      <AppNav active="/achievements" />
      <h1 className="text-xl font-semibold text-foreground">Achievements</h1>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        {(catalog ?? []).map((a) => {
          const unlockedAt = unlockedByKey.get(a.key);
          const isUnlocked = !!unlockedAt;

          return (
            <div
              key={a.key}
              className={`rounded-lg border p-4 transition-colors ${
                isUnlocked
                  ? "border-accent/30 bg-surface hover:border-accent/50"
                  : "border-border/50 opacity-50"
              }`}
              style={
                isUnlocked
                  ? { boxShadow: "0 0 12px -4px rgba(34,211,238,0.25)" }
                  : undefined
              }
            >
              {isUnlocked ? (
                <>
                  <p className="text-sm font-medium text-accent">{a.name}</p>
                  <p className="mt-1 text-xs text-muted">{a.description}</p>
                  <p className="mt-2 font-mono text-[10px] text-muted">
                    {new Date(unlockedAt!).toLocaleDateString()}
                  </p>
                </>
              ) : (
                <>
                  <p className="text-sm font-medium text-muted">???</p>
                  <p className="mt-1 text-xs text-muted">Hidden achievement</p>
                </>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
