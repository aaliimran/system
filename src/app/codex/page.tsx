import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AppNav } from "@/components/app-nav";

const TYPE_LABELS: Record<string, string> = {
  skill_level_up: "Skill",
  character_level_up: "Level",
  achievement_unlocked: "Achievement",
  boss_defeated: "Boss",
  personal_record: "PR",
};

export default async function CodexPage() {
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

  const { data: entries } = await supabase
    .from("codex_entries")
    .select("id, entry_type, title, occurred_at")
    .eq("user_id", user.id)
    .order("occurred_at", { ascending: false })
    .limit(100);

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-8 px-4 py-10">
      <AppNav active="/codex" />
      <div>
        <h1 className="text-xl font-semibold text-foreground">Codex</h1>
        <p className="mt-1 text-xs text-muted">
          An auto-generated chronicle of significant moments — not a journal.
        </p>
      </div>

      {!entries || entries.length === 0 ? (
        <p className="text-sm text-muted">Nothing recorded yet.</p>
      ) : (
        <div className="flex flex-col gap-2">
          {entries.map((e) => (
            <div
              key={e.id}
              className="flex items-center justify-between rounded-md border border-border bg-surface px-4 py-3"
            >
              <div className="flex items-center gap-3">
                <span className="rounded-full border border-border px-2 py-0.5 font-mono text-[10px] uppercase tracking-wide text-muted">
                  {TYPE_LABELS[e.entry_type] ?? e.entry_type}
                </span>
                <span className="text-sm text-foreground">{e.title}</span>
              </div>
              <span className="font-mono text-xs text-muted">
                {new Date(e.occurred_at).toLocaleDateString()}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
