/**
 * Cloudflare Worker entry.
 * - Website pages/photos are served straight from /dist (no Worker code runs).
 * - Anything under /api/* comes here and runs the SAME handlers in /api,
 *   with the same middleware, validation, email, and phone alerts.
 */
import contact from "../api/contact.js";
import health from "../api/health.js";

const ROUTES = {
  "/api/contact": contact,
  "/api/health": health,
};

const MAX_BODY = 64 * 1024;

function jsonResponse(status, obj) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" },
  });
}

// Settings the handlers read. Cleared first on every request so a setting
// deleted in the dashboard can't linger in a warm copy of the Worker.
const SETTINGS = [
  "RESEND_API_KEY", "TO_EMAIL", "FROM_EMAIL", "COMPANY_NAME", "COMPANY_PHONE",
  "SEND_CONFIRMATION", "ALLOWED_ORIGINS", "EMAIL_DRY_RUN",
  "TELEGRAM_BOT_TOKEN", "TELEGRAM_CHAT_ID", "NTFY_TOPIC", "NTFY_SERVER", "NTFY_TOKEN",
  "UPSTASH_REDIS_REST_URL", "UPSTASH_REDIS_REST_TOKEN",
];

// Make Cloudflare env vars/secrets visible to the shared handlers.
function loadEnv(env) {
  for (const k of SETTINGS) delete process.env[k];
  for (const [k, v] of Object.entries(env || {})) {
    if (typeof v === "string") process.env[k] = v;
  }
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const path = url.pathname.replace(/\/+$/, "") || "/";
    const handler = ROUTES[path];

    if (!handler) {
      if (path.startsWith("/api")) return jsonResponse(404, { ok: false, error: "Not found" });
      return env.ASSETS.fetch(request);
    }

    loadEnv(env);

    const declared = Number(request.headers.get("content-length") || 0);
    if (declared > MAX_BODY) return jsonResponse(413, { ok: false, error: "Request too large" });
    const raw = ["GET", "HEAD", "OPTIONS"].includes(request.method) ? "" : await request.text();
    if (raw.length > MAX_BODY) return jsonResponse(413, { ok: false, error: "Request too large" });

    const headers = {};
    request.headers.forEach((value, key) => { headers[key.toLowerCase()] = value; });
    // The real hostname comes from the URL. Never trust a visitor-supplied
    // X-Forwarded-Host here: it would let them pass the same-site check.
    headers.host = url.host;
    delete headers["x-forwarded-host"];
    const isJson = String(headers["content-type"] || "").includes("application/json");

    const req = {
      method: request.method,
      url: url.pathname + url.search,
      headers,
      socket: {},
      get body() {
        if (!raw) return undefined;
        return isJson ? JSON.parse(raw) : raw; // throws on bad JSON → middleware returns 400
      },
      // Lets the receipt email and phone alert finish after the visitor gets their answer.
      waitUntil: ctx && typeof ctx.waitUntil === "function" ? (p) => ctx.waitUntil(p) : undefined,
      hasEdgeLimiter: Boolean(env.CONTACT_LIMITER),
      // Cloudflare's rate limiter (wrangler.jsonc → ratelimits), contact form only.
      edgeLimit:
        path === "/api/contact" && env.CONTACT_LIMITER && typeof env.CONTACT_LIMITER.limit === "function"
          ? async (key) => (await env.CONTACT_LIMITER.limit({ key })).success
          : undefined,
    };

    const out = { status: 200, headers: new Headers(), body: null };
    const res = {
      headersSent: false,
      status(code) { out.status = code; return res; },
      setHeader(k, v) { out.headers.set(k, String(v)); },
      getHeader(k) { return out.headers.get(k); },
      json(obj) {
        if (!out.headers.has("Content-Type")) out.headers.set("Content-Type", "application/json; charset=utf-8");
        out.body = JSON.stringify(obj);
        res.headersSent = true;
        return res;
      },
      end(data) { if (data !== undefined) out.body = data; res.headersSent = true; return res; },
    };

    await handler(req, res);
    const noBody = out.status === 204 || out.status === 304 || request.method === "HEAD";
    return new Response(noBody ? null : out.body, { status: out.status, headers: out.headers });
  },
};
