/**
 * GET /api/health — open this in a browser to confirm the backend is live
 * and the email settings are in place. Shows setting NAMES only, never values.
 */
import { compose } from "./_lib/compose.js";
import { requestId, securityHeaders, allowMethods, rateLimit } from "./_lib/middleware.js";
import { mailConfig } from "./_lib/email.js";
import { alertConfig } from "./_lib/notify.js";

function health(req, res) {
  const cfg = mailConfig();
  const upstash = Boolean(process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN);
  res.status(200).json({
    ok: true,
    backend: "running",
    email: cfg.dryRun ? "dry-run (test mode, nothing is sent)" : cfg.ok ? "ready" : "NOT ready",
    missingSettings: cfg.missing,
    sender: cfg.usingTestSender ? "Resend test sender (only delivers to your Resend account email)" : "custom verified domain",
    phoneAlerts: alertConfig().channels.length ? alertConfig().channels.join(" + ") : "off",
    rateLimiting: [req.hasEdgeLimiter && "Cloudflare rate limiter", upstash ? "shared (Upstash Redis)" : "per-instance (memory)"].filter(Boolean).join(" + "),
    time: new Date().toISOString(),
  });
}

export default compose(
  requestId,
  securityHeaders,
  allowMethods(["GET", "HEAD"]),
  rateLimit({ name: "health", windowMs: 60 * 1000, max: 30 }),
  health
);
