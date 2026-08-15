// Telegram Bot API — raw HTTP, no SDK needed for this small a surface.
// CLAUDE.md "Notifications": push via a Telegram bot rather than Web Push.

function botToken(): string {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) throw new Error("TELEGRAM_BOT_TOKEN is not set");
  return token;
}

export async function sendTelegramMessage(chatId: string, text: string) {
  const res = await fetch(`https://api.telegram.org/bot${botToken()}/sendMessage`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, text }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Telegram sendMessage failed: ${res.status} ${body}`);
  }
}

/**
 * Finds the chat_id of whoever most recently messaged the bot, via getUpdates
 * (long-poll API, no webhook needed for a single-user app). The user sends
 * the bot any message first, then this looks it up — much less setup
 * friction than asking them to find their own numeric chat id.
 */
export async function detectTelegramChatId(): Promise<string | null> {
  const res = await fetch(
    `https://api.telegram.org/bot${botToken()}/getUpdates?limit=1&offset=-1`,
  );

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Telegram getUpdates failed: ${res.status} ${body}`);
  }

  const data = (await res.json()) as {
    result: { message?: { chat?: { id?: number } } }[];
  };

  const update = data.result[data.result.length - 1];
  const chatId = update?.message?.chat?.id;
  return chatId != null ? String(chatId) : null;
}
