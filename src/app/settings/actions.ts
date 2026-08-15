"use server";

import { createClient } from "@/lib/supabase/server";
import { INTENSITY_OPTIONS, type Intensity } from "@/lib/intensity";
import { detectTelegramChatId, sendTelegramMessage } from "@/lib/telegram";

export async function updateIntensity(intensity: Intensity) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("Not signed in");
  }

  if (!INTENSITY_OPTIONS.some((o) => o.value === intensity)) {
    throw new Error("Invalid intensity value");
  }

  const { error } = await supabase
    .from("users")
    .update({ intensity })
    .eq("id", user.id);

  if (error) throw new Error(error.message);
}

// Finds the chat id of whoever most recently messaged the bot (the user is
// expected to have just sent it a message) and links it to this account.
export async function detectAndLinkTelegram() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("Not signed in");
  }

  const chatId = await detectTelegramChatId();
  if (!chatId) {
    throw new Error(
      "No message found yet — send your bot any message on Telegram, then try again.",
    );
  }

  const { error } = await supabase
    .from("users")
    .update({ telegram_chat_id: chatId })
    .eq("id", user.id);

  if (error) throw new Error(error.message);

  await sendTelegramMessage(
    chatId,
    "Linked! You'll get a nudge here if your daily quests are still open by evening, and when your Weekly Review is ready.",
  );

  return { chatId };
}

export async function unlinkTelegram() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("Not signed in");
  }

  const { error } = await supabase
    .from("users")
    .update({ telegram_chat_id: null })
    .eq("id", user.id);

  if (error) throw new Error(error.message);
}
