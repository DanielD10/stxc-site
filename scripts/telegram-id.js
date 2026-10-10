// npm run telegram-id — finds the TELEGRAM_CHAT_ID after he taps Start on the bot.
try { process.loadEnvFile(".env.local"); } catch { /* no .env.local yet */ }

const token = process.env.TELEGRAM_BOT_TOKEN;
if (!token) {
  console.log("\nPut TELEGRAM_BOT_TOKEN=... (from @BotFather) in .env.local first.\n");
  process.exit(1);
}

const r = await fetch("https://api.telegram.org/bot" + token + "/getUpdates");
const data = await r.json().catch(() => ({}));
if (!data.ok) {
  console.log("\nTelegram rejected the token. Double-check TELEGRAM_BOT_TOKEN.\n");
  process.exit(1);
}

const chats = new Map();
for (const u of data.result || []) {
  const c = (u.message || u.my_chat_member || {}).chat;
  if (c) chats.set(c.id, [c.first_name, c.last_name, c.username && "@" + c.username].filter(Boolean).join(" ") || c.title || "");
}

if (!chats.size) {
  console.log("\nNo messages yet. On his phone: open the bot in Telegram and tap START (or send it \"hi\"), then run this again.\n");
  process.exit(1);
}
console.log("\nFound:");
for (const [id, name] of chats) console.log("  TELEGRAM_CHAT_ID=" + id + "   (" + name + ")");
console.log("\nCopy the line for his account into .env.local and into Vercel.\n");
