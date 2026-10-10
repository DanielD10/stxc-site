# STXC Website — Setup Guide

Hosting: **Cloudflare (free)** · Domain: **southtxbydesign.com** (~$10.46/yr) · Email: **Resend (free)** · Code: **GitHub (private, free)**

Leads from the form go to **jrduran75@yahoo.com**, and his phone gets a push alert.

---

## What you're holding

```
stxc-site/
  src/config.js       ← ★ THE FILE YOU EDIT: words, phone, email, photo captions
  public/photos/      ← the real job photos
  api/contact.js      ← the backend: receives the form, checks it, emails him, alerts his phone
  api/health.js       ← status page: /api/health tells you if email + alerts are set up
  api/_lib/           ← the middleware: security, rate limits, validation, email, alerts
  worker/index.js     ← plugs the backend into Cloudflare
  wrangler.jsonc      ← Cloudflare settings
  public/_headers     ← security headers for every page
  tests/              ← 49 automatic checks (npm test)
  vercel.json         ← lets the same code run on Vercel later if you ever move it
```

---

## Part A — On your computer (first time only)

**1. Install tools:** **nodejs.org** (green LTS button), **git-scm.com** (Windows only; Macs have it), **code.visualstudio.com** (editor).

**2. Get the code:**
```
git clone https://github.com/DanielD10/stxc-site.git
cd stxc-site
npm install
```

**3. Run it locally:**
```
npm run dev
```
Open **http://localhost:5173**. Send a test inquiry — the email prints in the Terminal as a **DRY RUN** (nothing is sent from your computer). `Ctrl + C` stops it.

| Command | What it does |
|---|---|
| `npm run check` | Flags anything placeholder or missing |
| `npm test` | Runs all 49 checks |
| `npm run test-alert` | Sends a test lead alert to his phone (uses `.env.local`) |
| `npm run telegram-id` | Finds his Telegram chat ID |
| `npm run cf:dev` | Runs the site inside Cloudflare's real runtime locally |

---

## Part B — Go live on Cloudflare

### B1. Cloudflare account + domain (10 min)
1. **cloudflare.com** → **Sign up** → verify email.
2. Left menu → **Domain Registration** → **Register Domains** → search **southtxbydesign.com** → buy (~$10.46/yr, renews at the same price).

### B2. Deploy from GitHub (5 min)
1. Left menu → **Compute (Workers)** → **Workers & Pages** → **Create** → **Import a repository**.
2. **Connect GitHub** → allow access to **stxc-site** → select it.
3. On the settings screen:
   - **Worker name:** `stxc-site` (must match `name` in `wrangler.jsonc`)
   - **Build command:** `npm run build` ← required, it won't deploy without it
   - **Deploy command:** `npx wrangler deploy` (the default)
   - Leave root directory blank.
4. **Deploy.** A minute or two later you get a link like `https://stxc-site.<your-name>.workers.dev`. The site is live there.

### B3. Hook up southtxbydesign.com (2 min)
1. Open the **stxc-site** Worker → **Settings** → **Domains & Routes** → **Add** → **Custom Domain** → `southtxbydesign.com` → **Add Custom Domain**.
2. Repeat for `www.southtxbydesign.com`.
3. Cloudflare makes the DNS records and HTTPS certificate on its own. Give it a few minutes.

The contact form works on every address automatically — no code change.

### B4. Email: verify the business domain (10 min)
Resend only delivers to outside inboxes (like his Yahoo) after the domain is verified.

1. **Resend** → **Domains** → `southtxbydesign.com` shows a list of DNS records (TXT and MX).
2. **Cloudflare** → **southtxbydesign.com** → **DNS** → **Records** → **Add record** for each one. Copy them **exactly**. Set each to **DNS only** (grey cloud).
3. Back in Resend → **Verify**. Usually done in minutes.

### B5. Add the backend settings (5 min)
Worker **stxc-site** → **Settings** → **Variables and Secrets** → **Add** → type **Secret** for each:

| Name | Value |
|---|---|
| `RESEND_API_KEY` | the `re_...` key |
| `TO_EMAIL` | `jrduran75@yahoo.com` |
| `FROM_EMAIL` | `South Texas Construction By Design <website@southtxbydesign.com>` |
| `COMPANY_PHONE` | `(210) 367-6648` |
| `SEND_CONFIRMATION` | `true` (customers get a "we got your message" email) |

> ⚠️ Use **Variables and Secrets** (runtime), not **Build variables** — those never reach the form.

Then redeploy (Worker → **Deployments**), or just push any change.

### B6. Prove it works (2 min)
1. Open **https://southtxbydesign.com/api/health** → `"email":"ready"` and `"sender":"custom verified domain"`.
2. Fill out the form like a customer. Check his Yahoo — and **Spam** the first time. Mark it **Not Spam**.
3. Hit **Reply** in that email → it goes straight to the customer.

---

## Part C — Phone alerts (10 min, free)

Free email-to-text is gone (AT&T and T-Mobile shut theirs off in 2025, Verizon's ends by March 2027), so this sends a **push notification**: name, project, phone number. It goes out even if the email fails.

### Option A — Telegram (recommended; iPhone or Android)
1. Your phone: install **Telegram** → search **@BotFather** → **Start** → send `/newbot` → name it `STXC Leads` → username ending in `bot`. Copy the **token**.
2. **His** phone: install Telegram → open the `t.me/...` link BotFather gave you → tap **Start**.
3. In the project folder, create `.env.local` with:
   ```
   TELEGRAM_BOT_TOKEN=paste-token-here
   ```
4. `npm run telegram-id` → prints `TELEGRAM_CHAT_ID=...`. Add that line to `.env.local`.
5. `npm run test-alert` → his phone buzzes.
6. Add `TELEGRAM_BOT_TOKEN` and `TELEGRAM_CHAT_ID` as **Secrets** in Cloudflare (same screen as B5).

### Option B — ntfy (no account; best on Android)
1. His phone: install **ntfy** → **+** → subscribe to a long private topic name.
2. Add `NTFY_TOPIC` = that name as a **Secret** in Cloudflare. Anyone who knows the name can read the alerts — keep it private.

Afterward, `/api/health` shows `phoneAlerts: telegram` (or `ntfy`) instead of `off`.

**Also on his phone:** install the **Yahoo Mail** app with notifications on.

---

## Making changes later

Edit (usually `src/config.js`), save, then:
```
git add .
git commit -m "what changed"
git push
```
Cloudflare rebuilds and the live site updates in about a minute (Worker → **Deployments**).

**Adding photos:** put `name.webp` (~1600px wide) and `name-sm.webp` (~720px wide) in `public/photos/` (free converter: **squoosh.app** → WebP), then add `{ photo: "name", caption: "What the job was" }` to `GALLERY` in `src/config.js`.

---

## When something's off

| What you see | What to do |
|---|---|
| Cloudflare build failed | Open the failed deployment's log. Usually the **Build command** isn't `npm run build`, or the Worker name isn't `stxc-site`. |
| `/api/health` says `NOT ready` | Add the setting it names under **Variables and Secrets** (not Build variables), then redeploy. |
| Form says "That didn't go through" | Check `/api/health`, then Worker → **Observability / Logs** for `send_failed`. Usually the domain isn't verified in Resend yet, or the key is wrong. |
| No email in Yahoo | Check **Spam**. Confirm the domain shows **Verified** in Resend. |
| No phone alert | `/api/health` → `phoneAlerts`. If `off`, the secrets aren't set. Run `npm run test-alert` locally. |
| "Too many messages" | Rate limit: 5 per 10 minutes per connection. Wait 10 minutes. |
| Site looks old after pushing | Wait a minute, then hard-refresh (`Cmd+Shift+R` / `Ctrl+F5`). |

---

## What's protecting the site

**Every form submission passes through, in order:** request ID → security headers → origin check (only the site itself can post) → POST-only → rate limit (5 per 10 min, keyed on Cloudflare's real visitor IP) → JSON-only, 16 KB max → safe parsing → bot traps (hidden field + too-fast timer) → validation (same rules on site and server) → HTML-escaped email (no code or extra recipients can be injected) → timed, retried, duplicate-proof sending → phone alert.

**Whole site:** strict Content Security Policy (only the site's own scripts, images, and Google Fonts load), HTTPS-only (HSTS), no framing, locked-down browser permissions, photo metadata stripped.

**Costs:** domain ~$10.46/yr. Everything else is on free plans: Cloudflare (100k API requests/day, unlimited page views), Resend (3,000 emails/month), Telegram/ntfy, GitHub.
