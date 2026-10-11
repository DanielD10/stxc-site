import { createHash } from "node:crypto";
import { PROJECT_TYPES, LIMITS, MIN_FILL_MS } from "../../shared/projectTypes.js";

// Control characters, zero-width characters, and line/paragraph separators.
const INVISIBLE_CHARS = new RegExp("[\\u0000-\\u0008\\u000B\\u000C\\u000E-\\u001F\\u007F\\u200B-\\u200F\\u2028\\u2029]", "g");

// Cleans text WITHOUT destroying it: apostrophes, quotes and dashes stay
// ("O'Brien" stays O'Brien). HTML safety happens when the email is built.
function clean(value, max, { multiline = false } = {}) {
  if (typeof value !== "string") return "";
  let v = value.normalize("NFKC");
  v = v.replace(INVISIBLE_CHARS, "");
  v = v.replace(/\r\n?/g, "\n");
  if (!multiline) v = v.replace(/\s+/g, " ");
  else v = v.replace(/\n{4,}/g, "\n\n\n");
  return v.trim().slice(0, max);
}

const EMAIL_RE = /^[^\s@<>()[\]\\,;:"]+@[^\s@<>()[\]\\,;:"]+\.[^\s@<>()[\]\\,;:"]{2,}$/;
const PHONE_RE = /^[\d\s()+.\-]{7,30}$/;

export function validateContact(body) {
  const data = {
    firstName: clean(body.firstName, LIMITS.firstName),
    lastName: clean(body.lastName, LIMITS.lastName),
    email: clean(body.email, LIMITS.email).toLowerCase(),
    phone: clean(body.phone, LIMITS.phone),
    projectType: clean(body.projectType, LIMITS.projectType),
    message: clean(body.message, LIMITS.message, { multiline: true }),
  };

  const fields = {};
  if (data.firstName.length < 2) fields.firstName = "First name is required.";
  if (data.lastName.length < 2) fields.lastName = "Last name is required.";
  if (!EMAIL_RE.test(data.email)) fields.email = "Enter a valid email.";
  if (data.phone && (!PHONE_RE.test(data.phone) || data.phone.replace(/\D/g, "").length < 7)) {
    fields.phone = "Enter a valid phone number.";
  }
  if (!PROJECT_TYPES.includes(data.projectType)) fields.projectType = "Pick a project type.";
  if (data.message.length < 10) fields.message = "Tell us a little about the project (at least 10 characters).";

  return { data, fields };
}

// Bots fill hidden fields and submit instantly. People don't.
export function botReason(body) {
  if (typeof body.website === "string" && body.website.trim() !== "") return "honeypot";
  const elapsed = Number(body.elapsedMs);
  if (Number.isFinite(elapsed) && elapsed >= 0 && elapsed < MIN_FILL_MS) return "too_fast";
  return null;
}

// Link-heavy messages get flagged in the subject line, never dropped,
// so a real lead is never lost.
export function looksSpammy(data) {
  const links = (data.message.match(/https?:\/\/|www\./gi) || []).length;
  return links >= 3;
}

// Same person, same message within 10 minutes = double-click, send once.
const recent = new Map();
const DUP_WINDOW = 10 * 60 * 1000;

export function isDuplicate(data) {
  const now = Date.now();
  const key = createHash("sha256").update(data.email + "|" + data.message).digest("hex");
  for (const [k, t] of recent) if (now - t > DUP_WINDOW) recent.delete(k);
  if (recent.has(key)) return true;
  recent.set(key, now);
  return false;
}

export function forgetDuplicate(data) {
  const key = createHash("sha256").update(data.email + "|" + data.message).digest("hex");
  recent.delete(key);
}

export function _resetDuplicates() {
  recent.clear();
}
