import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AppNav } from "@/components/app-nav";
import { QuestsTabs } from "./quests-tabs";

export default async function QuestsPage() {
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

  const [{ data: quests }, { data: skills }] = await Promise.all([
    supabase
      .from("quests")
      .select("id, type, title, base_exp, awarded_exp, status")
      .order("created_at", { ascending: true }),
    supabase.from("skills").select("id, name").order("name"),
  ]);

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-8 px-4 py-10">
      <AppNav active="/quests" />
      <h1 className="text-xl font-semibold text-foreground">Quests</h1>
      <QuestsTabs quests={quests ?? []} skills={skills ?? []} />
    </div>
  );
}
