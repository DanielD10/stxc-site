import { log } from "./log.js";

const RESEND_URL = "https://api.resend.com/emails";
const DEFAULT_FROM = "South Texas Construction By Design <onboarding@resend.dev>";

export function escapeHtml(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function mailConfig() {
  const dryRun = process.env.EMAIL_DRY_RUN === "1";
  const apiKey = process.env.RESEND_API_KEY || "";
  const to = (process.env.TO_EMAIL || "").split(",").map((s) => s.trim()).filter(Boolean);
  const from = process.env.FROM_EMAIL || DEFAULT_FROM;
  const missing = [];
  if (!dryRun && !apiKey) missing.push("RESEND_API_KEY");
  if (!dryRun && to.length === 0) missing.push("TO_EMAIL");
  return {
    ok: missing.length === 0,
    missing,
    dryRun,
    apiKey,
    to,
    from,
    usingTestSender: from.includes("onboarding@resend.dev"),
    sendConfirmation: process.env.SEND_CONFIRMATION === "true",
  };
}

export function buildInquiryEmail(d, meta) {
  const name = d.firstName + " " + d.lastName;
  const flag = meta.spammy ? "[Possible spam] " : "";
  // Subject is built from single-line cleaned fields: no CR/LF can get in.
  const subject = (flag + "New project inquiry: " + d.projectType + " from " + name).slice(0, 200);
  const when = new Date().toLocaleString("en-US", {
    timeZone: "America/Chicago",
    dateStyle: "medium",
    timeStyle: "short",
  });

  const text = [
    "New project inquiry from the website",
    "",
    "Name:     " + name,
    "Email:    " + d.email,
    "Phone:    " + (d.phone || "Not provided"),
    "Project:  " + d.projectType,
    "",
    "Message:",
    d.message,
    "",
    "Received " + when + " (Central Time) · Reference " + meta.id,
    "Hit Reply to answer them directly.",
  ].join("\n");

  const row = (label, value) =>
    '<tr><td style="padding:10px 0;border-bottom:1px solid #eef0f3;width:110px;font-size:11px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:#8a93a3;vertical-align:top">' +
    label +
    '</td><td style="padding:10px 0;border-bottom:1px solid #eef0f3;font-size:15px;color:#111827">' +
    value +
    "</td></tr>";

  const phoneDigits = d.phone.replace(/[^\d+]/g, "");
  const html =
    '<!doctype html><html><body style="margin:0;padding:24px;background:#f3f4f6;font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Arial,sans-serif">' +
    '<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center">' +
    '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:580px;background:#ffffff;border-radius:12px;overflow:hidden">' +
    '<tr><td style="background:#1e3a5f;padding:24px 28px">' +
    '<div style="color:#ffffff;font-size:20px;font-weight:700">' + escapeHtml(flag) + "New Project Inquiry</div>" +
    '<div style="color:#bfd3ee;font-size:13px;margin-top:4px">' + escapeHtml(meta.company) + " website</div>" +
    "</td></tr>" +
    '<tr><td style="padding:12px 28px 4px"><table role="presentation" width="100%" cellpadding="0" cellspacing="0">' +
    row("Name", "<strong>" + escapeHtml(name) + "</strong>") +
    row("Email", '<a href="mailto:' + escapeHtml(d.email) + '" style="color:#2563eb">' + escapeHtml(d.email) + "</a>") +
    row("Phone", d.phone ? '<a href="tel:' + escapeHtml(phoneDigits) + '" style="color:#2563eb">' + escapeHtml(d.phone) + "</a>" : "Not provided") +
    row("Project", escapeHtml(d.projectType)) +
    "</table></td></tr>" +
    '<tr><td style="padding:12px 28px 0"><div style="font-size:11px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:#8a93a3;margin-bottom:6px">Message</div>' +
    '<div style="background:#f8fafc;border-radius:8px;padding:14px 16px;font-size:14px;line-height:1.65;color:#1f2937;white-space:pre-wrap">' +
    escapeHtml(d.message).replace(/\n/g, "<br>") +
    "</div></td></tr>" +
    '<tr><td style="padding:20px 28px 26px;font-size:13px;color:#4b5563">Hit <strong>Reply</strong> to answer ' + escapeHtml(d.firstName) + " directly.</td></tr>" +
    '<tr><td style="background:#f8fafc;padding:12px 28px;font-size:11px;color:#9ca3af">Received ' + escapeHtml(when) + " (Central Time) · Reference " + escapeHtml(meta.id) + "</td></tr>" +
    "</table></td></tr></table></body></html>";

  return { subject, text, html };
}

export function buildConfirmationEmail(d, meta) {
  const subject = "We got your message — " + meta.company;
  const lines = [
    "Hi " + d.firstName + ",",
    "",
    "Thanks for reaching out about " + (d.projectType === "Other" ? "your project" : d.projectType === "Project Management" ? "managing your project" : "your " + d.projectType + " project") + ". We got your message and we'll get back to you within one business day.",
    "",
  ];
  if (meta.phone) lines.push("Need us sooner? Call " + meta.phone + ".", "");
  lines.push("— " + meta.company);
  const text = lines.join("\n");
  const html =
    '<div style="font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Arial,sans-serif;font-size:15px;line-height:1.6;color:#1f2937">' +
    escapeHtml(text).replace(/\n/g, "<br>") +
    "</div>";
  return { subject, text, html };
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Sends through Resend. 6s timeout per try, one retry on network/5xx/429
// (worst case about 12.5s, well under the form's 25s wait).
// Idempotency key means a retry can never create a duplicate email.
export async function sendEmail(cfg, msg, idempotencyKey) {
  if (cfg.dryRun) {
    log("info", { event: "email_dry_run", to: msg.to.length + " recipient(s)", subject: msg.subject });
    console.log("\n──── DRY RUN EMAIL (nothing was sent) ────\n" + msg.text + "\n──────────────────────────────────────────\n");
    return { id: "dry-run" };
  }

  const payload = {
    from: cfg.from,
    to: msg.to,
    subject: msg.subject,
    html: msg.html,
    text: msg.text,
  };
  if (msg.replyTo) payload.reply_to = msg.replyTo;

  let lastError;
  for (let attempt = 1; attempt <= 2; attempt++) {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 6000);
    try {
      const r = await fetch(RESEND_URL, {
        method: "POST",
        headers: {
          Authorization: "Bearer " + cfg.apiKey,
          "Content-Type": "application/json",
          "Idempotency-Key": idempotencyKey,
        },
        body: JSON.stringify(payload),
        signal: ctrl.signal,
      });
      const data = await r.json().catch(() => ({}));
      if (r.ok) return { id: data.id };
      lastError = new Error("Resend " + r.status + ": " + (data.message || data.name || "error"));
      lastError.status = r.status;
      if (r.status < 500 && r.status !== 429) break; // bad key / bad sender: retrying won't help
    } catch (err) {
      lastError = err.name === "AbortError" ? new Error("Resend timeout") : err;
    } finally {
      clearTimeout(timer);
    }
    if (attempt === 1) await sleep(400);
  }
  throw lastError;
}
