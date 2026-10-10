// Run with: npm test
// Exercises the real API handlers with fake requests. Nothing is actually emailed.
import { test, beforeEach } from "node:test";
import assert from "node:assert/strict";
import contact from "../api/contact.js";
import health from "../api/health.js";
import { _resetRateLimits } from "../api/_lib/middleware.js";
import { _resetDuplicates } from "../api/_lib/validate.js";
import { buildPayload, EMPTY_FORM, validateForm } from "../src/lib/inquiry.js";
import { PROJECT_TYPES } from "../shared/projectTypes.js";

const HOST = "stxc-site.vercel.app";
const ORIGIN = "https://" + HOST;
let ipCounter = 0;

function req({ method = "POST", origin = ORIGIN, body, rawBody, type = "application/json", ip, headers = {} } = {}) {
  const r = {
    method,
    headers: {
      host: HOST,
      ...(origin ? { origin } : {}),
      ...(type ? { "content-type": type } : {}),
      "x-forwarded-for": ip || "10.0.0." + ++ipCounter,
      ...headers,
    },
    socket: { remoteAddress: "127.0.0.1" },
  };
  if (rawBody !== undefined) {
    Object.defineProperty(r, "body", { get() { return JSON.parse(rawBody); } });
  } else {
    r.body = body;
  }
  return r;
}

function res() {
  const r = { statusCode: 200, headers: {}, body: undefined, headersSent: false };
  r.status = (c) => { r.statusCode = c; return r; };
  r.json = (o) => { r.body = o; r.headersSent = true; return r; };
  r.end = () => { r.headersSent = true; return r; };
  r.setHeader = (k, v) => { r.headers[k.toLowerCase()] = v; };
  r.getHeader = (k) => r.headers[k.toLowerCase()];
  return r;
}

function goodBody(over = {}) {
  return {
    firstName: "John",
    lastName: "O'Brien",
    email: "john@facility.com",
    phone: "(210) 555-1234",
    projectType: "Nursing Home or Skilled Nursing Facility Remodel",
    message: "We need our 40-bed east wing renovated before the March survey.",
    website: "",
    elapsedMs: 30000,
    ...over,
  };
}

let calls;
let alerts;
let alertStatus = 200;
function mockResend(responses) {
  calls = [];
  alerts = [];
  let i = 0;
  globalThis.fetch = async (url, opts) => {
    if (!String(url).startsWith("https://api.resend.com")) {
      alerts.push({ url: String(url), opts, body: JSON.parse(opts.body) });
      if (alertStatus instanceof Error) throw alertStatus;
      return { ok: alertStatus < 300, status: alertStatus, text: async () => "", json: async () => ({}) };
    }
    calls.push({ url, opts, body: JSON.parse(opts.body) });
    const next = responses[Math.min(i++, responses.length - 1)];
    if (next instanceof Error) throw next;
    return { ok: next.status < 300, status: next.status, json: async () => next.json || {} };
  };
}

beforeEach(() => {
  _resetRateLimits();
  _resetDuplicates();
  process.env.RESEND_API_KEY = "re_test_key";
  process.env.TO_EMAIL = "owner@stxc.test";
  delete process.env.EMAIL_DRY_RUN;
  delete process.env.FROM_EMAIL;
  delete process.env.SEND_CONFIRMATION;
  delete process.env.ALLOWED_ORIGINS;
  delete process.env.UPSTASH_REDIS_REST_URL;
  delete process.env.TELEGRAM_BOT_TOKEN;
  delete process.env.TELEGRAM_CHAT_ID;
  delete process.env.NTFY_TOPIC;
  delete process.env.NTFY_SERVER;
  alertStatus = 200;
  mockResend([{ status: 200, json: { id: "email_123" } }]);
});

/* ── Origin / method / transport guards ── */

test("preflight from own site → 204 with CORS header", async () => {
  const r = res();
  await contact(req({ method: "OPTIONS" }), r);
  assert.equal(r.statusCode, 204);
  assert.equal(r.headers["access-control-allow-origin"], ORIGIN);
});

test("preflight from another site → 403", async () => {
  const r = res();
  await contact(req({ method: "OPTIONS", origin: "https://evil.example" }), r);
  assert.equal(r.statusCode, 403);
  assert.equal(r.headers["access-control-allow-origin"], undefined);
});

test("POST from another site → 403, nothing sent", async () => {
  const r = res();
  await contact(req({ origin: "https://evil.example", body: goodBody() }), r);
  assert.equal(r.statusCode, 403);
  assert.equal(calls.length, 0);
});

test("lookalike vercel.app site is blocked (old regex hole closed)", async () => {
  const r = res();
  await contact(req({ origin: "https://attacker-site.vercel.app", body: goodBody() }), r);
  assert.equal(r.statusCode, 403);
});

test("POST with no Origin header (scripts/curl) → 403", async () => {
  const r = res();
  await contact(req({ origin: null, body: goodBody() }), r);
  assert.equal(r.statusCode, 403);
});

test("ALLOWED_ORIGINS adds extra sites", async () => {
  process.env.ALLOWED_ORIGINS = "https://southtxbydesign.com";
  const r = res();
  await contact(req({ origin: "https://southtxbydesign.com", body: goodBody() }), r);
  assert.equal(r.statusCode, 200);
});

test("custom domain works with no config (same-host rule)", async () => {
  const r = res();
  const q = req({ origin: "https://www.southtxbydesign.com", body: goodBody() });
  q.headers.host = "www.southtxbydesign.com";
  await contact(q, r);
  assert.equal(r.statusCode, 200);
});

test("GET → 405", async () => {
  const r = res();
  await contact(req({ method: "GET" }), r);
  assert.equal(r.statusCode, 405);
  assert.equal(r.headers["allow"], "POST");
});

test("wrong content type → 415", async () => {
  const r = res();
  await contact(req({ type: "text/plain", body: "hi" }), r);
  assert.equal(r.statusCode, 415);
});

test("declared oversize body → 413", async () => {
  const r = res();
  await contact(req({ body: goodBody(), headers: { "content-length": "999999" } }), r);
  assert.equal(r.statusCode, 413);
});

test("broken JSON → 400", async () => {
  const r = res();
  await contact(req({ rawBody: "{not json" }), r);
  assert.equal(r.statusCode, 400);
});

test("array body → 400", async () => {
  const r = res();
  await contact(req({ body: [1, 2] }), r);
  assert.equal(r.statusCode, 400);
});

/* ── Bot defenses ── */

test("honeypot filled → fake success, nothing sent", async () => {
  const r = res();
  await contact(req({ body: goodBody({ website: "http://spam.example" }) }), r);
  assert.equal(r.statusCode, 200);
  assert.equal(r.body.ok, true);
  assert.equal(calls.length, 0);
});

test("submitted in under 2.5s → fake success, nothing sent", async () => {
  const r = res();
  await contact(req({ body: goodBody({ elapsedMs: 400 }) }), r);
  assert.equal(r.statusCode, 200);
  assert.equal(calls.length, 0);
});

test("6th message from same IP in 10 min → 429", async () => {
  const codes = [];
  for (let i = 0; i < 6; i++) {
    const r = res();
    await contact(req({ ip: "203.0.113.9", body: goodBody({ message: "Project number " + i + " needs a full remodel please." }) }), r);
    codes.push(r.statusCode);
  }
  assert.deepEqual(codes, [200, 200, 200, 200, 200, 429]);
});

test("link-stuffed message is flagged, not dropped", async () => {
  const r = res();
  await contact(req({ body: goodBody({ message: "see http://a.x http://b.x www.c.x for details" }) }), r);
  assert.equal(r.statusCode, 200);
  assert.match(calls[0].body.subject, /^\[Possible spam\]/);
});

/* ── Validation ── */

test("bad fields → 422 with per-field errors", async () => {
  const r = res();
  await contact(req({ body: goodBody({ firstName: "J", email: "nope", projectType: "Hacking", message: "hi" }) }), r);
  assert.equal(r.statusCode, 422);
  assert.ok(r.body.fields.firstName);
  assert.ok(r.body.fields.email);
  assert.ok(r.body.fields.projectType);
  assert.ok(r.body.fields.message);
  assert.equal(calls.length, 0);
});

test("bad phone → 422, empty phone is fine", async () => {
  let r = res();
  await contact(req({ body: goodBody({ phone: "call me" }) }), r);
  assert.equal(r.statusCode, 422);
  assert.ok(r.body.fields.phone);
  r = res();
  await contact(req({ body: goodBody({ phone: "" }) }), r);
  assert.equal(r.statusCode, 200);
});

/* ── Sending ── */

test("valid inquiry → 200 and the right email goes to Resend", async () => {
  const r = res();
  await contact(req({ body: goodBody() }), r);
  assert.equal(r.statusCode, 200);
  assert.equal(r.body.ok, true);
  assert.equal(calls.length, 1);
  const c = calls[0];
  assert.equal(c.url, "https://api.resend.com/emails");
  assert.equal(c.opts.headers.Authorization, "Bearer re_test_key");
  assert.ok(c.opts.headers["Idempotency-Key"].startsWith("inquiry-"));
  assert.deepEqual(c.body.to, ["owner@stxc.test"]);
  assert.equal(c.body.reply_to, "john@facility.com");
  assert.equal(c.body.from, "South Texas Construction By Design <onboarding@resend.dev>");
  assert.match(c.body.subject, /Nursing Home or Skilled Nursing Facility Remodel from John O'Brien/);
  assert.match(c.body.text, /O'Brien/); // apostrophes survive
  assert.match(c.body.html, /O&#39;Brien/); // and are escaped in HTML
  assert.match(c.body.text, /40-bed east wing/);
});

test("HTML/script in message is escaped, never rendered", async () => {
  const r = res();
  await contact(req({ body: goodBody({ message: "<script>alert(1)</script> <img src=x onerror=alert(2)> real project" }) }), r);
  assert.equal(r.statusCode, 200);
  const html = calls[0].body.html;
  assert.ok(!html.includes("<script>alert"));
  assert.ok(!html.includes("<img src=x"));
  assert.ok(html.includes("&lt;script&gt;"));
});

test("line breaks in name can't inject email headers", async () => {
  const r = res();
  await contact(req({ body: goodBody({ firstName: "John\r\nBcc: victim@x.com" }) }), r);
  assert.equal(r.statusCode, 200);
  assert.ok(!/[\r\n]/.test(calls[0].body.subject));
});

test("multiple TO_EMAIL addresses all receive it", async () => {
  process.env.TO_EMAIL = "a@stxc.test, b@stxc.test";
  const r = res();
  await contact(req({ body: goodBody() }), r);
  assert.deepEqual(calls[0].body.to, ["a@stxc.test", "b@stxc.test"]);
});

test("missing settings → 503, friendly message, nothing sent", async () => {
  delete process.env.RESEND_API_KEY;
  const r = res();
  await contact(req({ body: goodBody() }), r);
  assert.equal(r.statusCode, 503);
  assert.match(r.body.error, /call or email/);
  assert.equal(calls.length, 0);
});

test("Resend hiccup (500) → retries once, succeeds, same idempotency key", async () => {
  mockResend([{ status: 500 }, { status: 200, json: { id: "ok" } }]);
  const r = res();
  await contact(req({ body: goodBody() }), r);
  assert.equal(r.statusCode, 200);
  assert.equal(calls.length, 2);
  assert.equal(calls[0].opts.headers["Idempotency-Key"], calls[1].opts.headers["Idempotency-Key"]);
});

test("Resend rejects key (403) → no retry, 502 friendly error", async () => {
  mockResend([{ status: 403, json: { message: "invalid key" } }]);
  const r = res();
  await contact(req({ body: goodBody() }), r);
  assert.equal(r.statusCode, 502);
  assert.equal(calls.length, 1);
  assert.match(r.body.error, /call or email/);
});

test("network failure → 502, and the person can retry right away", async () => {
  mockResend([new Error("ECONNRESET"), new Error("ECONNRESET")]);
  let r = res();
  await contact(req({ ip: "198.51.100.7", body: goodBody() }), r);
  assert.equal(r.statusCode, 502);
  mockResend([{ status: 200, json: { id: "ok" } }]);
  r = res();
  await contact(req({ ip: "198.51.100.7", body: goodBody() }), r);
  assert.equal(r.statusCode, 200);
  assert.equal(calls.length, 1);
});

test("double-click duplicate → sent once", async () => {
  let r = res();
  await contact(req({ body: goodBody() }), r);
  r = res();
  await contact(req({ body: goodBody() }), r);
  assert.equal(r.statusCode, 200);
  assert.equal(calls.length, 1);
});

test("confirmation receipt only goes out with a verified sender", async () => {
  process.env.SEND_CONFIRMATION = "true";
  let r = res();
  await contact(req({ body: goodBody() }), r);
  assert.equal(calls.length, 1); // test sender → no receipt
  _resetDuplicates();
  process.env.FROM_EMAIL = "South Texas Construction By Design <website@southtxbydesign.com>";
  mockResend([{ status: 200, json: { id: "a" } }]);
  r = res();
  await contact(req({ body: goodBody() }), r);
  await new Promise((s) => setTimeout(s, 10));
  assert.equal(calls.length, 2);
  assert.deepEqual(calls[1].body.to, ["john@facility.com"]);
});

test("dry-run mode → success without calling Resend", async () => {
  process.env.EMAIL_DRY_RUN = "1";
  delete process.env.RESEND_API_KEY;
  const origLog = console.log;
  console.log = () => {};
  const r = res();
  await contact(req({ body: goodBody() }), r);
  console.log = origLog;
  assert.equal(r.statusCode, 200);
  assert.equal(calls.length, 0);
});

test("security headers on every API response", async () => {
  const r = res();
  await contact(req({ method: "GET" }), r);
  assert.equal(r.headers["cache-control"], "no-store");
  assert.equal(r.headers["x-content-type-options"], "nosniff");
  assert.ok(r.headers["x-request-id"]);
});

/* ── Health ── */

test("/api/health reports ready without leaking values", async () => {
  const r = res();
  await health({ method: "GET", headers: { host: HOST }, socket: {} }, r);
  assert.equal(r.statusCode, 200);
  assert.equal(r.body.email, "ready");
  assert.ok(!JSON.stringify(r.body).includes("re_test_key"));
  assert.ok(!JSON.stringify(r.body).includes("owner@stxc.test"));
});

test("/api/health names missing settings", async () => {
  delete process.env.TO_EMAIL;
  const r = res();
  await health({ method: "GET", headers: { host: HOST }, socket: {} }, r);
  assert.equal(r.body.email, "NOT ready");
  assert.deepEqual(r.body.missingSettings, ["TO_EMAIL"]);
});

/* ── Frontend ↔ backend contract ── */

test("what the website sends is exactly what the server accepts", async () => {
  const form = { ...EMPTY_FORM, firstName: " Maria ", lastName: "De La Cruz", email: "maria@alf.org", phone: "", projectType: PROJECT_TYPES[0], message: "Two bathrooms need accessibility upgrades. We're on a tight timeline." };
  assert.deepEqual(validateForm(form), {});
  const payload = buildPayload(form, 12000);
  assert.deepEqual(Object.keys(payload).sort(), ["elapsedMs", "email", "firstName", "lastName", "message", "phone", "projectType", "website"]);
  const r = res();
  await contact(req({ body: payload }), r);
  assert.equal(r.statusCode, 200);
  assert.match(calls[0].body.text, /We're on a tight timeline/); // apostrophe intact end to end
  assert.match(calls[0].body.text, /Maria De La Cruz/);
});

test("every dropdown option passes server validation", async () => {
  for (const t of PROJECT_TYPES) {
    _resetDuplicates();
    const r = res();
    await contact(req({ body: goodBody({ projectType: t }) }), r);
    assert.equal(r.statusCode, 200, t);
  }
});

/* ── Phone alerts ── */

function alertsOn() {
  process.env.TELEGRAM_BOT_TOKEN = "123:ABC";
  process.env.TELEGRAM_CHAT_ID = "987654";
  process.env.NTFY_TOPIC = "stxc-leads-test-topic";
}

test("no alert settings → no alert calls, form still works", async () => {
  const r = res();
  await contact(req({ body: goodBody() }), r);
  assert.equal(r.statusCode, 200);
  assert.equal(alerts.length, 0);
});

test("valid lead → Telegram + ntfy alerts with name, project, tap-to-call", async () => {
  alertsOn();
  const r = res();
  await contact(req({ body: goodBody() }), r);
  assert.equal(r.statusCode, 200);
  assert.equal(alerts.length, 2);
  const tg = alerts.find((a) => a.url.includes("api.telegram.org"));
  const nt = alerts.find((a) => a.url.startsWith("https://ntfy.sh"));
  assert.equal(tg.url, "https://api.telegram.org/bot123:ABC/sendMessage");
  assert.equal(tg.body.chat_id, "987654");
  assert.match(tg.body.text, /John O'Brien/);
  assert.match(tg.body.text, /Nursing Home or Skilled Nursing Facility Remodel/);
  assert.match(tg.body.text, /\(210\) 555-1234/);
  assert.equal(nt.url, "https://ntfy.sh/");
  assert.equal(nt.body.topic, "stxc-leads-test-topic");
  assert.equal(nt.body.click, "tel:2105551234");
  assert.deepEqual(nt.body.actions.map((a) => a.url), ["tel:2105551234", "mailto:john@facility.com"]);
});

test("no phone given → ntfy taps open email instead", async () => {
  alertsOn();
  const r = res();
  await contact(req({ body: goodBody({ phone: "" }) }), r);
  const nt = alerts.find((a) => a.url.startsWith("https://ntfy.sh"));
  assert.equal(nt.body.click, "mailto:john@facility.com");
  assert.equal(nt.body.actions.length, 1);
});

test("alert service down → customer still gets success, email still sent", async () => {
  alertsOn();
  alertStatus = new Error("ECONNREFUSED");
  const r = res();
  await contact(req({ body: goodBody() }), r);
  assert.equal(r.statusCode, 200);
  assert.equal(calls.length, 1);
});

test("email fails → phone alert STILL goes out, flagged, so the lead isn't lost", async () => {
  alertsOn();
  mockResend([{ status: 500 }, { status: 500 }]);
  const r = res();
  await contact(req({ body: goodBody() }), r);
  assert.equal(r.statusCode, 502);
  const tg = alerts.find((a) => a.url.includes("api.telegram.org"));
  assert.match(tg.body.text, /email delivery FAILED/);
  assert.match(tg.body.text, /john@facility.com/);
});

test("bots and rejected forms never trigger an alert", async () => {
  alertsOn();
  let r = res();
  await contact(req({ body: goodBody({ website: "spam" }) }), r);
  r = res();
  await contact(req({ body: goodBody({ email: "bad" }) }), r);
  r = res();
  await contact(req({ origin: "https://evil.example", body: goodBody() }), r);
  assert.equal(alerts.length, 0);
});

test("/api/health shows which phone alerts are on", async () => {
  alertsOn();
  const r = res();
  await health({ method: "GET", headers: { host: HOST }, socket: {} }, r);
  assert.equal(r.body.phoneAlerts, "telegram + ntfy");
  assert.ok(!JSON.stringify(r.body).includes("123:ABC"));
  assert.ok(!JSON.stringify(r.body).includes("stxc-leads-test-topic"));
});

test("receipt wording: 'Other' reads naturally, real types are named", async () => {
  const { buildConfirmationEmail } = await import("../api/_lib/email.js");
  const meta = { company: "South Texas Construction By Design", phone: "(210) 367-6648" };
  const other = buildConfirmationEmail({ firstName: "Ana", projectType: "Other" }, meta);
  assert.match(other.text, /about your project\./);
  assert.doesNotMatch(other.text, /Other project/);
  const named = buildConfirmationEmail({ firstName: "Ana", projectType: "Office Build-Out" }, meta);
  assert.match(named.text, /about your Office Build-Out project\./);
});

test("inquiry email spells out Reference and Central Time", async () => {
  const { buildInquiryEmail } = await import("../api/_lib/email.js");
  const m = buildInquiryEmail({ firstName: "Ana", lastName: "Ruiz", email: "ana@example.com", phone: "", projectType: "Other", message: "Need a quote for a small job." }, { id: "abc-123", company: "South Texas Construction By Design" });
  assert.match(m.text, /\(Central Time\) · Reference abc-123/);
  assert.doesNotMatch(m.text + m.html, /\bRef\b/);
});
