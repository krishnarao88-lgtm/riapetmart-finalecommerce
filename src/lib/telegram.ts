import "server-only";

/**
 * Sends a message to the owner's Telegram chat. Quietly does nothing until TELEGRAM_BOT_TOKEN and
 * TELEGRAM_CHAT_ID are set in Vercel, and never throws: an alert must never break a checkout or signup.
 */
export async function notifyTelegram(html: string) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  if (!token || !chatId) return;
  try {
    await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, text: html.slice(0, 4000), parse_mode: "HTML", disable_web_page_preview: true }),
      signal: AbortSignal.timeout(5000),
    });
  } catch (err) {
    console.error("Telegram alert failed:", err);
  }
}

/** Escapes text for Telegram's HTML mode. */
export function tg(text: string | number | null | undefined) {
  return String(text ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
