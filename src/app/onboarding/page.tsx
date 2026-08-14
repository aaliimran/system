import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { OnboardingForm } from "./onboarding-form";

export default async function OnboardingPage() {
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

  return (
    <div className="flex flex-1 justify-center px-4 py-12">
      <div className="w-full max-w-2xl">
        <p className="font-mono text-xs uppercase tracking-[0.2em] text-muted">
          Character Creation
        </p>
        <h1 className="mt-2 text-2xl font-semibold text-foreground">
          Before Level 1
        </h1>
        <p className="mt-2 max-w-lg text-sm text-muted">
          Rate where you honestly stand today in each skill. This sets your
          real starting level — Level 1 will not pretend you know nothing.
        </p>
        <OnboardingForm />
      </div>
    </div>
  );
}
