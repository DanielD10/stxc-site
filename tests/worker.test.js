// The Cloudflare entry point: same handlers, wrapped for Workers.
import { test, beforeEach } from "node:test";
import assert from "node:assert/strict";
import worker from "../worker/index.js";
import { _resetRateLimits } from "../api/_lib/middleware.js";
import { _resetDuplicates } from "../api/_lib/validate.js";

const SITE = "https://southtexasconstructionbydesign.com";
let assetCalls, resend;

const env = () => ({
  ASSETS: { fetch: async (req) => { assetCalls.push(new URL(req.url).pathname); return new Response("<html>site</html>", { status: 200, headers: { "Content-Type": "text/html" } }); } },
  RESEND_API_KEY: "re_worker_test",
  TO_EMAIL: "jrduran75@yahoo.com",
});

beforeEach(() => {
  assetCalls = [];
  resend = [];
  _resetRateLimits();
  _resetDuplicates();
  for (const k of ["EMAIL_DRY_RUN", "TELEGRAM_BOT_TOKEN", "TELEGRAM_CHAT_ID", "NTFY_TOPIC", "FROM_EMAIL", "SEND_CONFIRMATION"]) delete process.env[k];
  globalThis.fetch = async (url, opts) => {
    resend.push({ url: String(url), body: JSON.parse(opts.body) });
    return { ok: true, status: 200, json: async () => ({ id: "e1" }), text: async () => "" };
  };
});

const post = (body, headers = {}) =>
  new Request(SITE + "/api/contact", {
    method: "POST",
    headers: { Origin: SITE, "Content-Type": "application/json", "CF-Connecting-IP": "203.0.113." + Math.floor(Math.random() * 250), ...headers },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });

const lead = { firstName: "Rosa", lastName: "O'Garza", email: "rosa@alf.org", phone: "(830) 555-0142", projectType: "Assisted Living Facility", message: "We've got 6 resident rooms to redo this spring.", website: "", elapsedMs: 15000 };

test("worker: pages go to static assets, not the API", async () => {
  const r = await worker.fetch(new Request(SITE + "/"), env());
  assert.equal(r.status, 200);
  assert.deepEqual(assetCalls, ["/"]);
});

test("worker: valid lead → 200 and email to his Yahoo via Resend", async () => {
  const r = await worker.fetch(post(lead), env());
  assert.equal(r.status, 200);
  assert.equal((await r.json()).ok, true);
  assert.equal(resend.length, 1);
  assert.deepEqual(resend[0].body.to, ["jrduran75@yahoo.com"]);
  assert.match(resend[0].body.text, /Rosa O'Garza/);
  assert.equal(r.headers.get("cache-control"), "no-store");
});

test("worker: Cloudflare env vars reach the handler (health shows ready)", async () => {
  const r = await worker.fetch(new Request(SITE + "/api/health"), env());
  assert.equal((await r.json()).email, "ready");
});

test("worker: trailing slash works", async () => {
  const r = await worker.fetch(new Request(SITE + "/api/health/"), env());
  assert.equal(r.status, 200);
});

test("worker: preflight → 204 with no body", async () => {
  const r = await worker.fetch(new Request(SITE + "/api/contact", { method: "OPTIONS", headers: { Origin: SITE } }), env());
  assert.equal(r.status, 204);
  assert.equal(await r.text(), "");
  assert.equal(r.headers.get("access-control-allow-origin"), SITE);
});

test("worker: other site → 403", async () => {
  const r = await worker.fetch(post(lead, { Origin: "https://evil.example" }), env());
  assert.equal(r.status, 403);
  assert.equal(resend.length, 0);
});

test("worker: bad JSON → 400, oversize → 413, unknown api → 404", async () => {
  assert.equal((await worker.fetch(post("{oops"), env())).status, 400);
  assert.equal((await worker.fetch(post(JSON.stringify({ ...lead, message: "x".repeat(70000) })), env())).status, 413);
  assert.equal((await worker.fetch(new Request(SITE + "/api/nope"), env())).status, 404);
});

test("worker: rate limit keys on Cloudflare's real visitor IP, not spoofable headers", async () => {
  const codes = [];
  for (let i = 0; i < 6; i++) {
    const r = await worker.fetch(post({ ...lead, message: "Project " + i + " needs work done soon." }, { "CF-Connecting-IP": "198.51.100.77", "X-Forwarded-For": "1.1.1." + i }), env());
    codes.push(r.status);
  }
  assert.deepEqual(codes, [200, 200, 200, 200, 200, 429]);
});

test("worker: a forged X-Forwarded-Host can't pass the same-site check", async () => {
  const r = await worker.fetch(post(lead, { Origin: "https://evil.example", "X-Forwarded-Host": "evil.example" }), env());
  assert.equal(r.status, 403);
  assert.equal(resend.length, 0);
});

test("worker: Cloudflare rate limiter blocks, and only on the contact form", async () => {
  const keys = [];
  const e = { ...env(), CONTACT_LIMITER: { limit: async ({ key }) => { keys.push(key); return { success: false }; } } };
  const r = await worker.fetch(post(lead), e);
  assert.equal(r.status, 429);
  assert.equal(resend.length, 0);
  assert.equal(keys.length, 1);
  assert.match(keys[0], /^rl:contact:/);
  const h = await worker.fetch(new Request(SITE + "/api/health"), e);
  assert.equal(h.status, 200);
  assert.equal(keys.length, 1); // health never touches the limiter
});

test("worker: receipt finishes in the background via ctx.waitUntil", async () => {
  const waited = [];
  const e = { ...env(), FROM_EMAIL: "Site <website@southtexasconstructionbydesign.com>", SEND_CONFIRMATION: "true" };
  const r = await worker.fetch(post({ ...lead, message: "Background test message here." }), e, { waitUntil: (p) => waited.push(p) });
  assert.equal(r.status, 200);
  assert.equal(waited.length, 1);
  await waited[0];
  assert.equal(resend.length, 2);
});

test("worker: a setting deleted in the dashboard doesn't linger", async () => {
  await worker.fetch(new Request(SITE + "/api/health"), env());
  const e = env();
  delete e.TO_EMAIL;
  const r = await worker.fetch(new Request(SITE + "/api/health"), e);
  const j = await r.json();
  assert.equal(j.email, "NOT ready");
  assert.deepEqual(j.missingSettings, ["TO_EMAIL"]);
});
