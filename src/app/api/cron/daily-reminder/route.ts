import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendTelegramMessage } from "@/lib/telegram";

// Vercel Cron Jobs send `Authorization: Bearer ${CRON_SECRET}`. Runs once in
// the evening (UTC — no per-user timezone stored yet) and nudges anyone with
// Telegram linked who hasn't completed a quest today but still has one open.
export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createAdminClient();
  const today = new Date().toISOString().slice(0, 10);

  const { data: users, error } = await supabase
    .from("users")
    .select("id")
    .not("telegram_chat_id", "is", null);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const results = [];
  for (const u of users ?? []) {
    try {
      const [{ data: completedToday }, { data: pendingDaily }, { data: profile }] =
        await Promise.all([
          supabase
            .from("quest_logs")
            .select("id")
            .eq("user_id", u.id)
            .eq("event", "completed")
            .eq("log_date", today)
            .limit(1),
          supabase
            .from("quests")
            .select("id")
            .eq("user_id", u.id)
            .eq("type", "daily")
            .eq("status", "pending")
            .gte("created_at", `${today}T00:00:00Z`)
            .limit(1),
          supabase.from("users").select("telegram_chat_id").eq("id", u.id).single(),
        ]);

      const shouldNudge =
        (completedToday?.length ?? 0) === 0 &&
        (pendingDaily?.length ?? 0) > 0 &&
        profile?.telegram_chat_id;

      if (shouldNudge) {
        await sendTelegramMessage(
          profile!.telegram_chat_id as string,
          "Today's quests are still open — a few minutes now keeps the streak alive.",
        );
      }

      results.push({ userId: u.id, nudged: !!shouldNudge });
    } catch (e) {
      results.push({
        userId: u.id,
        error: e instanceof Error ? e.message : "Unknown error",
      });
    }
  }

  return NextResponse.json({ results });
}
