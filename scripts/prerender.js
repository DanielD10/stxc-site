// BUILD ONLY (runs at the end of `npm run build`).
// Writes the fully rendered page into dist/index.html so Google, Bing, and link
// previews get every word without running JavaScript, plus structured data
// that tells Google the business name, phone, area, and services.
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

const root = process.cwd();
const htmlPath = path.join(root, "dist", "index.html");
const ssrDir = path.join(root, ".ssr");
const entry = fs.readdirSync(ssrDir).find((f) => /^entry-server\.(m?js)$/.test(f));
if (!entry) throw new Error("prerender: .ssr/entry-server.js missing — did the SSR build run?");

const { render, structuredData } = await import(pathToFileURL(path.join(ssrDir, entry)).href);

let html = fs.readFileSync(htmlPath, "utf8");
const marker = '<div id="root"></div>';
if (!html.includes(marker)) throw new Error("prerender: " + marker + " not found in dist/index.html");

const body = render();
if (!body || body.length < 1000) throw new Error("prerender: rendered page is suspiciously small");

// JSON-LD is data, not code: "<" is escaped so it can never close the tag.
const ld = structuredData()
  .map((obj) => '<script type="application/ld+json">' + JSON.stringify(obj).replace(/</g, "\\u003c") + "</script>")
  .join("\n    ");

html = html.replace(marker, '<div id="root">' + body + "</div>");
html = html.replace("</head>", "    " + ld + "\n  </head>");
fs.writeFileSync(htmlPath, html);
fs.rmSync(ssrDir, { recursive: true, force: true });
console.log("prerender: wrote " + Math.round(html.length / 1024) + " KB to dist/index.html");
