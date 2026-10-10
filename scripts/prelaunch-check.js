// npm run check — lists anything on the site that's still placeholder or unconfirmed.
import fs from "node:fs";
import { SITE, PHOTOS, GALLERY } from "../src/config.js";

const problems = [];

if (/555|000-0000/.test(SITE.phone)) problems.push("Phone number is still the placeholder: " + SITE.phone);

const photoNames = [...Object.values(PHOTOS), ...GALLERY.map((g) => g.photo)];
for (const name of new Set(photoNames)) {
  for (const f of [name + ".webp", name + "-sm.webp"]) {
    if (!fs.existsSync("public/photos/" + f)) problems.push("Missing photo file: public/photos/" + f);
  }
}

console.log("\nPre-launch check\n────────────────");
if (problems.length === 0) console.log("✓ No placeholders or missing photos.");
for (const p of problems) console.log("✗ " + p);
console.log("\nConfirm these are true before going public:");
console.log("  • Email shown on site: " + SITE.email);
console.log("  • Founded: " + SITE.founded + "  (shows as \"Est. " + SITE.founded + "\" and \"" + (new Date().getFullYear() - SITE.founded) + "+ Years in Texas\")");
console.log("  • Every service and FAQ answer in src/config.js matches what the business actually does");
console.log("\nEdit everything in src/config.js\n");

process.exit(problems.length ? 1 : 0);
