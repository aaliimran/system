import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { signOut } from "./actions";

export default async function Home() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("users")
    .select("onboarding_completed_at, character_level")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile?.onboarding_completed_at) {
    redirect("/onboarding");
  }

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 px-4 text-center">
      <p className="font-mono text-xs uppercase tracking-[0.2em] text-muted">
        System
      </p>
      <p className="font-mono text-4xl text-foreground">
        Lv {profile.character_level}
      </p>
      <p className="max-w-sm text-sm text-muted">
        Character created. Dashboard arrives in Build Order step 3.
      </p>
      <form action={signOut}>
        <button
          type="submit"
          className="mt-4 rounded-md border border-border px-3 py-2 text-xs text-muted transition-colors hover:border-foreground/30 hover:text-foreground"
        >
          Sign out
        </button>
      </form>
    </div>
  );
}
