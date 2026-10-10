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

// Make Cloudflare env vars/secrets visible to the shared handlers.
function loadEnv(env) {
  for (const [k, v] of Object.entries(env || {})) {
    if (typeof v === "string") process.env[k] = v;
  }
}

export default {
  async fetch(request, env) {
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
    if (!headers.host) headers.host = url.host;
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
