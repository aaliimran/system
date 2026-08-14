"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { composeWeeklyReview } from "@/lib/weekly-analyst";

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}

export async function runWeeklyReview() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new Error("Not signed in");

  return composeWeeklyReview(supabase, user.id);
}

export async function acceptWeeklyReview(reviewId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new Error("Not signed in");

  const { error } = await supabase
    .from("weekly_reviews")
    .update({ accepted: true })
    .eq("id", reviewId)
    .eq("user_id", user.id);

  if (error) throw new Error(error.message);
}
