// Structured logs show up in Vercel → Project → Logs.
// Never log full emails, phone numbers or messages.

export function log(level, fields) {
  const line = JSON.stringify({ level, t: new Date().toISOString(), ...fields });
  if (level === "error") console.error(line);
  else if (level === "warn") console.warn(line);
  else console.log(line);
}

export function maskEmail(email) {
  if (typeof email !== "string" || !email.includes("@")) return "unknown";
  const [user, domain] = email.split("@");
  return (user[0] || "*") + "***@" + domain;
}
