import { log } from "./log.js";

/* Phone alerts: a push notification on his phone the moment the form is used.
   Both are free. Turn on either one (or both) with env vars:

   Telegram (works great on iPhone and Android)
     TELEGRAM_BOT_TOKEN   from @BotFather
     TELEGRAM_CHAT_ID     run `npm run telegram-id` after he taps Start on the bot

   ntfy (no account, best on Android)
     NTFY_TOPIC           a long random name; anyone who knows it can read it, so keep it private
     NTFY_SERVER          optional, defaults to https://ntfy.sh
     NTFY_TOKEN           optional, for a protected/self-hosted server

   Alerts never block or break the form. If one fails, it's logged and skipped. */

const TIMEOUT_MS = 4000;

export function alertConfig() {
  const telegram =
    process.env.TELEGRAM_BOT_TOKEN && process.env.TELEGRAM_CHAT_ID
      ? { token: process.env.TELEGRAM_BOT_TOKEN, chatId: process.env.TELEGRAM_CHAT_ID }
      : null;
  const ntfy = process.env.NTFY_TOPIC
    ? {
        topic: process.env.NTFY_TOPIC,
        server: (process.env.NTFY_SERVER || "https://ntfy.sh").replace(/\/$/, ""),
        token: process.env.NTFY_TOKEN || "",
      }
    : null;
  const channels = [telegram && "telegram", ntfy && "ntfy"].filter(Boolean);
  return { telegram, ntfy, channels };
}

function telLink(phone) {
  const digits = String(phone || "").replace(/[^\d+]/g, "");
  return digits.length >= 7 ? "tel:" + digits : "";
}

export function alertText(d, meta = {}) {
  const snippet = d.message.length > 160 ? d.message.slice(0, 157).trimEnd() + "…" : d.message;
  const lines = [
    meta.emailFailed ? "⚠️ New website lead (email delivery FAILED — details below)" : "🔔 New website lead",
    "",
    d.firstName + " " + d.lastName,
    "Project: " + d.projectType,
    "Phone: " + (d.phone || "not given"),
    "Email: " + d.email,
    "",
    "“" + snippet + "”",
  ];
  if (!meta.emailFailed) lines.push("", "Full details are in your email.");
  return lines.join("\n");
}

async function post(url, body, headers = {}) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    const r = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...headers },
      body: JSON.stringify(body),
      signal: ctrl.signal,
    });
    if (!r.ok) {
      const text = await r.text().catch(() => "");
      throw new Error("HTTP " + r.status + (text ? ": " + text.slice(0, 120) : ""));
    }
    return true;
  } catch (err) {
    throw err.name === "AbortError" ? new Error("timeout") : err;
  } finally {
    clearTimeout(timer);
  }
}

function sendTelegram(cfg, d, meta) {
  return post("https://api.telegram.org/bot" + cfg.token + "/sendMessage", {
    chat_id: cfg.chatId,
    text: alertText(d, meta),
    disable_web_page_preview: true,
  });
}

function sendNtfy(cfg, d, meta) {
  const tel = telLink(d.phone);
  const actions = [];
  if (tel) actions.push({ action: "view", label: "Call back", url: tel, clear: false });
  actions.push({ action: "view", label: "Email back", url: "mailto:" + d.email, clear: false });
  return post(
    cfg.server + "/",
    {
      topic: cfg.topic,
      title: (meta.emailFailed ? "⚠️ " : "") + "New lead: " + d.projectType,
      message: alertText(d, meta),
      priority: 4,
      tags: ["construction"],
      click: tel || "mailto:" + d.email,
      actions,
    },
    cfg.token ? { Authorization: "Bearer " + cfg.token } : {}
  );
}

// Returns [{ channel, ok, error? }]. Never throws.
export async function sendPhoneAlerts(d, meta = {}) {
  const cfg = alertConfig();
  const jobs = [];
  if (cfg.telegram) jobs.push(["telegram", sendTelegram(cfg.telegram, d, meta)]);
  if (cfg.ntfy) jobs.push(["ntfy", sendNtfy(cfg.ntfy, d, meta)]);
  const settled = await Promise.allSettled(jobs.map(([, p]) => p));
  return settled.map((s, i) => {
    const channel = jobs[i][0];
    if (s.status === "fulfilled") return { channel, ok: true };
    log("warn", { id: meta.id, event: "phone_alert_failed", channel, msg: s.reason && s.reason.message });
    return { channel, ok: false, error: s.reason && s.reason.message };
  });
}
