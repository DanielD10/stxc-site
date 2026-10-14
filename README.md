# South Texas Construction By Design — website

Live at **https://southtexasconstructionbydesign.com**. One-page React site with a contact form that emails his Yahoo (and can buzz his phone). Hosted on Cloudflare, email through Resend, code on GitHub. Every push to `main` redeploys automatically.

- **Something broke?** → `RUNBOOK.md`
- **Setting it up from scratch?** → `SETUP.md`

## How a form send travels

```
Visitor's browser
  └─ src/App.jsx (Contact form) → src/lib/inquiry.js checks fields, POSTs JSON
       └─ Cloudflare Worker: worker/index.js
            ├─ not /api/*  → serves the built site from dist/ (headers from public/_headers)
            └─ /api/contact → api/contact.js, through these steps in order:
                 request ID → security headers → same-site check → POST only
                 → rate limit (Cloudflare limiter + in-memory) → JSON only, 16 KB max
                 → bot traps → validation (shared/projectTypes.js rules)
                 → email to TO_EMAIL via Resend (api/_lib/email.js, 6s timeout, 1 retry)
                 → in the background: customer receipt + phone alert (api/_lib/notify.js)
```

If the email fails, the visitor gets a screen with his phone number and a pre-filled email button, so the lead isn't lost.

## Where things live

| To change… | Edit |
|---|---|
| Words, phone, services, FAQ, photo captions, which photo goes where | `src/config.js` |
| Project-type dropdown, field limits, name rules (site and server both use these) | `shared/projectTypes.js` |
| Job photos | `public/photos/` (`name.webp` ~1600px + `name-sm.webp` ~720px) |
| Page layout and sections | `src/App.jsx`, `src/styles.css` |
| Google title/description, link-preview image | `index.html` |
| Business details Google reads (structured data) | `src/entry-server.jsx` (built from `src/config.js`) |
| Security headers, caching | `public/_headers` |
| Cloudflare setup, rate limit | `wrangler.jsonc` |
| The form's backend | `api/contact.js` → helpers in `api/_lib/` |

`vercel.json` is only for the old Vercel review copy; Cloudflare ignores it.

## Commands

| Command | What it does |
|---|---|
| `npm install` | Install (once, and after pulling new code) |
| `npm run dev` | Run locally at http://localhost:5173. The form works in dry-run mode (emails print in the terminal). |
| `npm test` | Run all 61 tests: form rules, security, email, retries, rate limits, the Cloudflare Worker |
| `npm run build` | Runs the tests first, then builds, then prerenders the page into plain HTML with Google business data (`scripts/prerender.js`, `src/entry-server.jsx`). **A failing test stops the build**, so Cloudflare never deploys broken code. |
| `npm run cf:dev` | Run inside Cloudflare's real runtime locally (put test settings in `.dev.vars`) |
| `npm run check` | List anything still placeholder |
| `npm run test-alert` | Send a test phone alert (uses `.env.local`) |
| `npm run telegram-id` | Find his Telegram chat ID |

## API

`POST /api/contact` — JSON body:
```json
{ "firstName": "", "lastName": "", "email": "", "phone": "", "projectType": "", "message": "", "website": "", "elapsedMs": 0 }
```
Responses: `200 {ok:true,id}` · `422 {ok:false,error,fields}` bad fields · `429` rate limited · `403` not from the site · `503` settings missing · `502` email service failed. The site shows the call/email fallback for 502/503/network errors.

`GET /api/health` — shows whether email is ready, which settings are missing, sender type, phone alerts, and rate limiting. Never shows any values.
