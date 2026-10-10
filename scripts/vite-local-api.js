// DEV ONLY. Makes `npm run dev` serve /api/* using the exact same files
// Vercel runs in production, so the contact form works on your computer.
// No Resend key in .env.local? It runs in DRY RUN mode: the email prints
// in your terminal instead of being sent.
import fs from "node:fs";
import path from "node:path";

function readBody(req) {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks = [];
    req.on("data", (c) => {
      size += c.length;
      if (size > 64 * 1024) { reject(new Error("too large")); req.destroy(); return; }
      chunks.push(c);
    });
    req.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
    req.on("error", reject);
  });
}

export function localApi(env) {
  return {
    name: "stxc-local-api",
    apply: "serve",
    configureServer(server) {
      for (const [k, v] of Object.entries(env)) {
        if (process.env[k] === undefined) process.env[k] = v;
      }
      if (!process.env.RESEND_API_KEY) {
        process.env.EMAIL_DRY_RUN = "1";
        server.config.logger.info("  [api] No RESEND_API_KEY in .env.local → contact form runs in DRY RUN mode (emails print here).");
      }

      server.middlewares.use(async (req, res, next) => {
        const urlPath = (req.url || "").split("?")[0];
        const m = urlPath.match(/^\/api\/([a-z0-9-]+)\/?$/);
        if (!m) return next();

        const file = path.join(server.config.root, "api", m[1] + ".js");
        res.status = (code) => { res.statusCode = code; return res; };
        res.json = (obj) => {
          if (!res.getHeader("Content-Type")) res.setHeader("Content-Type", "application/json; charset=utf-8");
          res.end(JSON.stringify(obj));
          return res;
        };
        if (!fs.existsSync(file)) return res.status(404).json({ ok: false, error: "Not found" });

        try {
          const raw = await readBody(req);
          const isJson = String(req.headers["content-type"] || "").includes("application/json");
          Object.defineProperty(req, "body", {
            configurable: true,
            get() {
              if (!raw) return undefined;
              if (!isJson) return raw;
              return JSON.parse(raw); // throws on bad JSON, same as Vercel
            },
          });
          const mod = await server.ssrLoadModule(file);
          await mod.default(req, res);
        } catch (err) {
          server.config.logger.error("[api] " + err.message);
          if (!res.headersSent) res.status(500).json({ ok: false, error: "Local API error" });
        }
      });
    },
  };
}
