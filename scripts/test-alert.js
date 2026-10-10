// npm run test-alert — sends a sample lead alert to the phone using your .env.local settings.
import { alertConfig, sendPhoneAlerts } from "../api/_lib/notify.js";

try { process.loadEnvFile(".env.local"); } catch { /* no .env.local yet */ }

const cfg = alertConfig();
if (!cfg.channels.length) {
  console.log("\nNo phone alerts set up yet.");
  console.log("Add TELEGRAM_BOT_TOKEN + TELEGRAM_CHAT_ID, or NTFY_TOPIC, to .env.local and run this again.\n");
  process.exit(1);
}

const sample = {
  firstName: "Test",
  lastName: "Customer",
  email: "test@example.com",
  phone: "(210) 555-0123",
  projectType: "ADA Bathroom Upgrades",
  message: "This is a test alert from the STXC website setup. If this hit your phone, alerts are working.",
};

console.log("\nSending a test alert via: " + cfg.channels.join(" + ") + " …");
const results = await sendPhoneAlerts(sample, { id: "test" });
for (const r of results) console.log((r.ok ? "  ✓ " : "  ✗ ") + r.channel + (r.ok ? " — check the phone" : " — " + r.error));
console.log("");
process.exit(results.every((r) => r.ok) ? 0 : 1);
