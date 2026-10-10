# STXC By Design — website

Contractor site with a contact form that emails the business and alerts his phone. React + Vite front end, Cloudflare Worker backend (Vercel-compatible), email through Resend.

**First time? Read `SETUP.md`.**

## Commands

| Command | What it does |
|---|---|
| `npm install` | Install (once, and after pulling new code) |
| `npm run dev` | Run locally at http://localhost:5173 (form works in dry-run mode) |
| `npm run check` | List anything on the site that's still placeholder |
| `npm test` | Run the 49 backend, alert, Cloudflare, and contract tests |
| `npm run cf:dev` | Run inside Cloudflare's runtime locally |
| `npm run test-alert` | Send a test lead alert to his phone (uses `.env.local`) |
| `npm run telegram-id` | Find his Telegram chat ID after he taps Start on the bot |
| `npm run build` | Production build (Vercel runs this for you) |

## Where things live

- **Words, phone, services, FAQ, photo captions:** `src/config.js`
- **Job photos:** `public/photos/` (`name.webp` + `name-sm.webp`)
- **Project-type dropdown:** `shared/projectTypes.js` (site and server both use it)
- **Backend:** `api/contact.js` → middleware in `api/_lib/`
- **Status check:** `/api/health`
- **Cloudflare:** `wrangler.jsonc`, `worker/index.js`, `public/_headers`
- **Vercel (alternate host):** `vercel.json`
- **Settings the backend needs:** `.env.example`

## API

`POST /api/contact` — JSON body:
```json
{ "firstName": "", "lastName": "", "email": "", "phone": "", "projectType": "", "message": "", "website": "", "elapsedMs": 0 }
```
Responses: `200 {ok:true,id}` · `422 {ok:false,error,fields}` · `429` rate limited · `403` wrong origin · `502/503` email problem (site shows call/email fallback).

`GET /api/health` — `{ email: "ready" | "NOT ready", missingSettings: [...] }`
