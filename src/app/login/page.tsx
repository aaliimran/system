import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { LoginForm } from "./login-form";

export default async function LoginPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    redirect("/");
  }

  return (
    <div className="flex flex-1 items-center justify-center px-4">
      <div className="w-full max-w-sm rounded-lg border border-border bg-surface p-8">
        <p className="font-mono text-xs uppercase tracking-[0.2em] text-muted">
          System
        </p>
        <h1 className="mt-2 text-xl font-semibold text-foreground">
          Sign in
        </h1>
        <LoginForm />
      </div>
    </div>
  );
}
