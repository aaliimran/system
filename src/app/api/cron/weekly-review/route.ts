import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { composeWeeklyReview } from "@/lib/weekly-analyst";

// Vercel Cron Jobs send `Authorization: Bearer ${CRON_SECRET}` — see
// CLAUDE.md "Deployment" (Weekly Review on Sundays) and vercel.json.
export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createAdminClient();
  const { data: users, error } = await supabase.from("users").select("id");

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const results = [];
  for (const u of users ?? []) {
    try {
      const result = await composeWeeklyReview(supabase, u.id);
      results.push({ userId: u.id, ...result });
    } catch (e) {
      results.push({
        userId: u.id,
        error: e instanceof Error ? e.message : "Unknown error",
      });
    }
  }

  return NextResponse.json({ results });
}
