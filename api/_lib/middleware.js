import { randomUUID, createHash } from "node:crypto";
import { log } from "./log.js";

/* ── 1. Request ID: every request gets an ID you can search in Cloudflare logs ── */
export async function requestId(req, res, next) {
  req.id = randomUUID();
  res.setHeader("X-Request-Id", req.id);
  await next();
}

/* ── 2. Security headers on every API response ── */
export async function securityHeaders(req, res, next) {
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("Content-Security-Policy", "default-src 'none'; frame-ancestors 'none'");
  res.setHeader("Referrer-Policy", "no-referrer");
  await next();
}

/* ── 3. Origin guard (CORS) ──
   Only the site itself may POST to the API. "Itself" = whatever domain the
   request came in on, so it works on the vercel.app URL AND the custom
   domain with zero code changes. Extra origins: ALLOWED_ORIGINS env var. */
function extraOrigins() {
  return (process.env.ALLOWED_ORIGINS || "")
    .split(",")
    .map((s) => s.trim().replace(/\/$/, ""))
    .filter(Boolean);
}

export function originGuard({ methods = "POST, OPTIONS" } = {}) {
  return async function (req, res, next) {
    const origin = req.headers.origin;
    const host = req.headers["x-forwarded-host"] || req.headers.host;
    let allowed = false;
    if (origin) {
      try {
        const u = new URL(origin);
        allowed = (host && u.host === host) || extraOrigins().includes(u.origin);
      } catch {
        allowed = false;
      }
    }
    if (allowed) {
      res.setHeader("Access-Control-Allow-Origin", origin);
      res.setHeader("Access-Control-Allow-Methods", methods);
      res.setHeader("Access-Control-Allow-Headers", "Content-Type");
      res.setHeader("Access-Control-Max-Age", "600");
    }
    res.setHeader("Vary", "Origin");

    if (req.method === "OPTIONS") return res.status(allowed ? 204 : 403).end();
    if (!allowed) {
      log("warn", { id: req.id, event: "origin_blocked", origin: origin || "none" });
      return res.status(403).json({ ok: false, error: "Forbidden" });
    }
    await next();
  };
}

/* ── 4. Method guard ── */
export function allowMethods(methods) {
  return async function (req, res, next) {
    if (!methods.includes(req.method)) {
      res.setHeader("Allow", methods.join(", "));
      return res.status(405).json({ ok: false, error: "Method not allowed" });
    }
    await next();
  };
}

/* ── 5. Content-type guard ── */
export async function requireJson(req, res, next) {
  const type = String(req.headers["content-type"] || "").toLowerCase();
  if (!type.includes("application/json")) {
    return res.status(415).json({ ok: false, error: "Content-Type must be application/json" });
  }
  await next();
}

/* ── 6. Body size limit ── */
export function bodyLimit(maxBytes) {
  return async function (req, res, next) {
    const len = Number(req.headers["content-length"] || 0);
    if (len > maxBytes) return res.status(413).json({ ok: false, error: "Request too large" });
    await next();
  };
}

/* ── 7. Safe JSON parsing ──
   The platform adapter parses JSON; bad JSON throws when req.body is read. */
export function parseJsonBody(maxBytes) {
  return async function (req, res, next) {
    let body;
    try {
      body = req.body;
      if (typeof body === "string") body = JSON.parse(body);
    } catch {
      return res.status(400).json({ ok: false, error: "Invalid JSON" });
    }
    if (!body || typeof body !== "object" || Array.isArray(body)) {
      return res.status(400).json({ ok: false, error: "Invalid request body" });
    }
    if (JSON.stringify(body).length > maxBytes) {
      return res.status(413).json({ ok: false, error: "Request too large" });
    }
    req.json = body;
    await next();
  };
}

/* ── 8. Rate limiting ──
   Default: in-memory per server instance (stops floods from one source).
   Production-grade: add UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN
   env vars and limits are shared across every instance automatically. */
export function clientIp(req) {
  // Cloudflare sets cf-connecting-ip (can't be faked by the visitor); Vercel sets x-forwarded-for.
  const cf = String(req.headers["cf-connecting-ip"] || "").trim();
  if (cf) return cf;
  const fwd = String(req.headers["x-forwarded-for"] || "").split(",")[0].trim();
  return fwd || String(req.headers["x-real-ip"] || "") || (req.socket && req.socket.remoteAddress) || "unknown";
}

const memoryHits = new Map();

function memoryCount(key, windowMs) {
  const now = Date.now();
  const entry = memoryHits.get(key);
  if (!entry || entry.reset <= now) {
    memoryHits.set(key, { count: 1, reset: now + windowMs });
    if (memoryHits.size > 5000) {
      for (const [k, v] of memoryHits) if (v.reset <= now) memoryHits.delete(k);
    }
    return { count: 1, reset: now + windowMs };
  }
  entry.count += 1;
  return entry;
}

async function redisCount(key, windowMs) {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 1500);
  try {
    const r = await fetch(url.replace(/\/$/, "") + "/pipeline", {
      method: "POST",
      headers: { Authorization: "Bearer " + token, "Content-Type": "application/json" },
      body: JSON.stringify([
        ["SET", key, "0", "PX", String(windowMs), "NX"],
        ["INCR", key],
        ["PTTL", key],
      ]),
      signal: ctrl.signal,
    });
    if (!r.ok) return null;
    const out = await r.json();
    const count = Number(out[1] && out[1].result);
    const ttl = Number(out[2] && out[2].result);
    if (!Number.isFinite(count)) return null;
    return { count, reset: Date.now() + (ttl > 0 ? ttl : windowMs) };
  } catch {
    return null; // Redis down → fall back to memory, never block real customers
  } finally {
    clearTimeout(timer);
  }
}

export function rateLimit({ windowMs, max, name }) {
  return async function (req, res, next) {
    const ipHash = createHash("sha256").update(clientIp(req)).digest("hex").slice(0, 32);
    const key = "rl:" + name + ":" + ipHash;

    // Cloudflare's rate limiter (shared by every copy of the site in a data
    // center). If it's missing or errors, the in-memory limit below still runs.
    if (typeof req.edgeLimit === "function") {
      let allowed = true;
      try {
        allowed = (await req.edgeLimit(key)) !== false;
      } catch {
        allowed = true;
      }
      if (!allowed) {
        res.setHeader("Retry-After", "60");
        log("warn", { id: req.id, event: "rate_limited", by: "edge", ip: ipHash.slice(0, 8) });
        return res.status(429).json({
          ok: false,
          error: "Too many messages from this connection. Please wait a few minutes or call us.",
        });
      }
    }

    const hit = (await redisCount(key, windowMs)) || memoryCount(key, windowMs);
    res.setHeader("X-RateLimit-Limit", String(max));
    res.setHeader("X-RateLimit-Remaining", String(Math.max(0, max - hit.count)));
    if (hit.count > max) {
      const retry = Math.max(1, Math.ceil((hit.reset - Date.now()) / 1000));
      res.setHeader("Retry-After", String(retry));
      log("warn", { id: req.id, event: "rate_limited", ip: ipHash.slice(0, 8) });
      return res.status(429).json({
        ok: false,
        error: "Too many messages from this connection. Please wait a few minutes or call us.",
      });
    }
    await next();
  };
}

/* test helper */
export function _resetRateLimits() {
  memoryHits.clear();
}
