/**
 * POST /api/contact — website inquiry form → email to the business inbox.
 *
 * Request flow (each line is one middleware step):
 *   requestId → securityHeaders → originGuard → allowMethods → rateLimit
 *   → requireJson → bodyLimit → parseJsonBody → handleContact
 *
 * Env vars (Vercel → Project → Settings → Environment Variables):
 *   RESEND_API_KEY   required   from resend.com → API Keys
 *   TO_EMAIL         required   inbox that receives inquiries (comma-separate for more than one)
 *   FROM_EMAIL       optional   sender once your domain is verified in Resend
 *   COMPANY_NAME     optional   shown in emails
 *   COMPANY_PHONE    optional   shown in the customer confirmation email
 *   SEND_CONFIRMATION optional  "true" = email the customer a receipt (needs verified domain)
 *   ALLOWED_ORIGINS  optional   extra sites allowed to post here (comma-separated)
 *   UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN  optional  shared rate limiting
 *   TELEGRAM_BOT_TOKEN + TELEGRAM_CHAT_ID  optional  phone alert via Telegram
 *   NTFY_TOPIC       optional   phone alert via the ntfy app
 */
import { compose } from "./_lib/compose.js";
import {
  requestId,
  securityHeaders,
  originGuard,
  allowMethods,
  requireJson,
  bodyLimit,
  parseJsonBody,
  rateLimit,
} from "./_lib/middleware.js";
import { validateContact, botReason, looksSpammy, isDuplicate, forgetDuplicate } from "./_lib/validate.js";
import { mailConfig, buildInquiryEmail, buildConfirmationEmail, sendEmail } from "./_lib/email.js";
import { sendPhoneAlerts } from "./_lib/notify.js";
import { log, maskEmail } from "./_lib/log.js";

const MAX_BODY = 16 * 1024;

async function handleContact(req, res) {
  const body = req.json;

  // Bots get a fake "success" so they don't retry. Nothing is sent.
  const bot = botReason(body);
  if (bot) {
    log("info", { id: req.id, event: "bot_dropped", reason: bot });
    return res.status(200).json({ ok: true });
  }

  const { data, fields } = validateContact(body);
  if (Object.keys(fields).length > 0) {
    return res.status(422).json({ ok: false, error: "Please fix the highlighted fields.", fields });
  }

  const cfg = mailConfig();
  if (!cfg.ok) {
    log("error", { id: req.id, event: "config_missing", missing: cfg.missing });
    return res.status(503).json({
      ok: false,
      error: "Our form is offline for a moment. Please call or email us directly.",
    });
  }

  if (isDuplicate(data)) {
    log("info", { id: req.id, event: "duplicate_skipped", from: maskEmail(data.email) });
    return res.status(200).json({ ok: true, id: req.id });
  }

  const company = process.env.COMPANY_NAME || "South Texas Construction By Design";
  const mail = buildInquiryEmail(data, { id: req.id, company, spammy: looksSpammy(data) });

  let emailFailed = false;
  try {
    const sent = await sendEmail(
      cfg,
      { to: cfg.to, replyTo: data.email, subject: mail.subject, html: mail.html, text: mail.text },
      "inquiry-" + req.id
    );
    log("info", { id: req.id, event: "inquiry_sent", emailId: sent.id, from: maskEmail(data.email), type: data.projectType });
  } catch (err) {
    emailFailed = true;
    forgetDuplicate(data); // let them try again
    log("error", { id: req.id, event: "send_failed", msg: err.message, status: err.status });
  }

  // Phone alert goes out even if the email failed, so the lead is never lost.
  // Customer receipt only after a successful send. Both are awaited (serverless
  // functions can freeze right after responding) but each has a short timeout.
  const extras = [sendPhoneAlerts(data, { id: req.id, emailFailed })];
  if (!emailFailed && cfg.sendConfirmation && !cfg.usingTestSender && !cfg.dryRun) {
    const receipt = buildConfirmationEmail(data, { company, phone: process.env.COMPANY_PHONE || "" });
    extras.push(
      sendEmail(cfg, { to: [data.email], subject: receipt.subject, html: receipt.html, text: receipt.text }, "receipt-" + req.id)
        .catch((err) => log("warn", { id: req.id, event: "receipt_failed", msg: err.message }))
    );
  }
  await Promise.allSettled(extras);

  if (emailFailed) {
    return res.status(502).json({
      ok: false,
      error: "We couldn't send your message right now. Please call or email us directly.",
    });
  }
  return res.status(200).json({ ok: true, id: req.id });
}

export default compose(
  requestId,
  securityHeaders,
  originGuard({ methods: "POST, OPTIONS" }),
  allowMethods(["POST"]),
  rateLimit({ name: "contact", windowMs: 10 * 60 * 1000, max: 5 }),
  requireJson,
  bodyLimit(MAX_BODY),
  parseJsonBody(MAX_BODY),
  handleContact
);
