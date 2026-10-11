import { PROJECT_TYPES, LIMITS } from "../../shared/projectTypes.js";

export const EMPTY_FORM = {
  firstName: "",
  lastName: "",
  email: "",
  phone: "",
  projectType: "",
  message: "",
  website: "", // honeypot: hidden from people, bots fill it
};

// Same rules the server uses. Server is the real gatekeeper; this is for instant feedback.
export const RULES = {
  firstName: (v) => (v.trim().length >= 2 ? "" : "First name is required."),
  lastName: (v) => (v.trim().length >= 2 ? "" : "Last name is required."),
  email: (v) => (/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.trim()) ? "" : "Enter a valid email."),
  phone: (v) => (!v.trim() || (/^[\d\s()+.\-]{7,30}$/.test(v.trim()) && v.replace(/\D/g, "").length >= 7) ? "" : "Enter a valid phone number."),
  projectType: (v) => (PROJECT_TYPES.includes(v) ? "" : "Pick a project type."),
  message: (v) => (v.trim().length >= 10 ? "" : "Tell us a little about the project (at least 10 characters)."),
};

export function validateForm(form) {
  const errors = {};
  for (const k of Object.keys(RULES)) {
    const msg = RULES[k](form[k] || "");
    if (msg) errors[k] = msg;
  }
  return errors;
}

// Caps length only. No trimming while typing (that was eating spaces).
export function limitField(name, value) {
  const max = LIMITS[name] || 200;
  return String(value).slice(0, max);
}

export function buildPayload(form, elapsedMs) {
  return {
    firstName: form.firstName.trim(),
    lastName: form.lastName.trim(),
    email: form.email.trim(),
    phone: form.phone.trim(),
    projectType: form.projectType,
    message: form.message.trim(),
    website: form.website,
    elapsedMs: Math.max(0, Math.round(elapsedMs)),
  };
}

// Returns { ok } or { ok:false, status, error, fields }. Never throws.
export async function submitInquiry(payload, { endpoint = "/api/contact", timeoutMs = 15000 } = {}) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal: ctrl.signal,
    });
    const data = await res.json().catch(() => ({}));
    if (res.ok && data.ok) return { ok: true };
    return { ok: false, status: res.status, error: data.error || "", fields: data.fields || null };
  } catch {
    return { ok: false, status: 0, error: "", fields: null };
  } finally {
    clearTimeout(timer);
  }
}
