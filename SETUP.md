# STXC Website — Setup Guide (start to live)

Plan on about an hour the first time. You need 3 free accounts: **GitHub** (stores the code), **Vercel** (runs the site), **Resend** (sends the emails).

---

## What you're holding

```
stxc-site/
  api/contact.js      ← the backend: receives the form, checks it, emails you
  api/health.js       ← a status page: /api/health tells you if email is set up
  api/_lib/           ← the middleware: security, rate limits, validation, email
  src/config.js       ← ★ THE ONLY FILE YOU EDIT for words, phone, photo captions
  public/photos/      ← the real job photos
  src/App.jsx         ← the website itself
  shared/             ← the project-type list (used by site AND backend)
  tests/              ← automatic checks (npm test)
  vercel.json         ← hosting + security settings
  .env.example        ← list of settings the backend needs
```

---

## Step 1 — Install the tools (one time, 10 min)

1. **Node.js** — go to **nodejs.org**, click the green **LTS** button, install, click Next through everything.
2. **Git** — Mac: skip, it installs itself the first time you use it. Windows: go to **git-scm.com**, download, install with all the defaults.
3. **VS Code** (for editing files) — **code.visualstudio.com**, install.

Check it worked. Open **Terminal** (Mac: press `Cmd + Space`, type `terminal`, Enter) or **Command Prompt** (Windows: press the Windows key, type `cmd`, Enter) and type:

```
node --version
```

Any number like `v22.x.x` means you're good.

---

## Step 2 — Put the folder on your Desktop and install (3 min)

1. Unzip `stxc-site.zip`. Move the `stxc-site` folder to your **Desktop**.
2. In Terminal:

Mac:
```
cd ~/Desktop/stxc-site
```
Windows:
```
cd %USERPROFILE%\Desktop\stxc-site
```

3. Then:
```
npm install
```
Wait for it to finish (about 30 seconds, lots of text is normal).

---

## Step 3 — See it run on your computer (2 min)

```
npm run dev
```

Open **http://localhost:5173** in your browser. That's the site.

Scroll to the form and send a test inquiry. Look back at Terminal — you'll see the email printed there with **DRY RUN**. That means the whole backend worked; it just didn't actually send because there's no email key on your computer yet. That's on purpose.

Press `Ctrl + C` in Terminal to stop it.

---

## Step 4 — Put in the real business info (5 min)

Open the `stxc-site` folder in VS Code (File → Open Folder). Open **`src/config.js`** and fix:

- **phone** — the real business number (it's still a placeholder)
- **email** and **founded** — confirm they're right
- **CREDENTIALS** — only real ones (insurance, RCAT roofing license, OSHA training). Texas has no state GC license or state roofing license, so don't list a "state license." Leave it empty if unsure.

Save, then run:
```
npm run check
```
Fix whatever it lists with ✗ until it says **✓ No placeholders or missing photos.**

Optional but smart — run the automatic tests:
```
npm test
```
You should see `pass 41` and `fail 0`.

### Adding or swapping photos later
1. Put the photo in `public/photos/` twice: `name.webp` (big, ~1600px wide) and `name-sm.webp` (small, ~720px wide). Free converter: **squoosh.app** (pick WebP). Or send the photos to me and I'll convert them.
2. Add a line to `GALLERY` in `src/config.js`: `{ photo: "name", caption: "What the job was" }`
3. `npm run check` tells you if a photo file is missing.

---

## Step 5 — Resend: the email service (5 min)

> ⚠️ **Make the Resend account with `jrduran75@yahoo.com`.**
> Until a business domain is verified (Step 10), Resend only delivers to the email the account was created with. If you sign up with your own email, his inquiries go to you, not him.

1. Go to **resend.com** → Sign up with **jrduran75@yahoo.com**. He'll get a confirmation email — have him open it and tap the link (or sit with him and do it together).
2. Left menu → **API Keys** → **Create API Key** → name it `STXC website` → permission **Sending access** → Create.
3. **Copy the key now** (starts with `re_`). It's only shown once. Paste it in a note for Step 7.

---

## Step 6 — GitHub: store the code (10 min)

1. Go to **github.com** → Sign up → confirm your email.
2. Top right **+** → **New repository** → name: `stxc-site` → choose **Private** → **Create repository**.
3. In Terminal (still in the `stxc-site` folder), run these one at a time. Replace `YOURNAME` with your GitHub username:

```
git init
git add .
git commit -m "Launch STXC website"
git branch -M main
git remote add origin https://github.com/YOURNAME/stxc-site.git
git push -u origin main
```

**If it asks you to log in:**
- Windows: a GitHub window pops up — sign in there.
- Mac: it asks for a username and password. The password is NOT your GitHub password. Make a token: github.com → your photo (top right) → **Settings** → bottom of the left menu **Developer settings** → **Personal access tokens** → **Tokens (classic)** → **Generate new token (classic)** → name it, check the **repo** box → **Generate** → copy it → paste it as the password. (You won't see it as you paste. Normal. Press Enter.)

Refresh the GitHub page. Your files should be there.

> If `git commit` complains about "Please tell me who you are," run these two lines (with your info) and try again:
> `git config --global user.name "Your Name"`
> `git config --global user.email "you@example.com"`

---

## Step 7 — Vercel: put it on the internet (5 min)

1. Go to **vercel.com** → **Sign Up** → **Continue with GitHub** → allow access.
2. **Add New…** → **Project** → find `stxc-site` → **Import**.
3. Leave the build settings alone (it detects Vite on its own).
4. Open **Environment Variables** on that same screen and add:

| Name | Value |
|------|-------|
| `RESEND_API_KEY` | your `re_...` key from Step 5 |
| `TO_EMAIL` | `jrduran75@yahoo.com` |
| `COMPANY_PHONE` | the real business phone (optional) |

5. Click **Deploy**. About a minute later you get a link like `https://stxc-site-xxxx.vercel.app`.

> Added the variables after deploying? Go to **Deployments** → the top one → **⋯** → **Redeploy**. Settings only kick in on a new deploy.

---

## Step 8 — Prove it works (2 min)

1. Open `https://YOUR-LINK.vercel.app/api/health`
   You should see `"email":"ready"`. If it says `NOT ready`, the `missingSettings` list tells you which setting is missing.
2. Open the site, fill out the form like a customer would, send it.
3. Check the inbox (and the **spam** folder the first time). You'll get a formatted email. Hit **Reply** and it goes straight to the customer.

**That's live.** Everything after this is optional polish.

---

## Step 9 — Phone alerts: buzz his phone on every lead (10 min, free)

Texting through email is basically dead — AT&T and T-Mobile shut theirs down in 2025 and Verizon's ends by March 2027 — and real SMS costs money and carrier paperwork. So the site sends a **free push notification** instead. It looks and sounds like a text, shows the person's name, project, and phone number, and goes out **even if the email fails**.

Pick one. Telegram works great on iPhone and Android. ntfy is quicker but best on Android.

### Option A — Telegram (recommended)

On **your** phone or computer:
1. Install **Telegram**, open it, search **@BotFather** (blue check mark), tap **Start**.
2. Send `/newbot`. Name it `STXC Leads`. Give it a username ending in `bot`, like `stxc_leads_alerts_bot`.
3. BotFather replies with a **token** (looks like `7123456789:AAH...`). Copy it.

On **his** phone:
4. Install **Telegram** and sign up with his number.
5. Open the link BotFather gave you (`t.me/your_bot_name`) and tap **Start**.

Back on your computer, in the `stxc-site` folder:
6. Make a file named `.env.local` (copy `.env.example` and rename it) and put in:
   ```
   TELEGRAM_BOT_TOKEN=paste-the-token-here
   ```
7. Run:
   ```
   npm run telegram-id
   ```
   It prints a line like `TELEGRAM_CHAT_ID=123456789 (his name)`. Add that line to `.env.local`.
8. Run:
   ```
   npm run test-alert
   ```
   His phone should buzz with a test lead. If it did, it works.
9. Add both `TELEGRAM_BOT_TOKEN` and `TELEGRAM_CHAT_ID` in Vercel → Settings → Environment Variables, then Redeploy.

### Option B — ntfy (no account)
1. On his phone, install **ntfy** (App Store or Google Play).
2. Tap **+** → subscribe to a long, random topic name (use the one I gave you, or make one up like `stxc-leads-8f3k2q9w7z`). **Anyone who knows the name can read the alerts, so keep it private.**
3. Put `NTFY_TOPIC=that-name` in `.env.local`, run `npm run test-alert`, then add `NTFY_TOPIC` in Vercel and Redeploy.

Check `/api/health` after redeploying — `phoneAlerts` should say `telegram` or `ntfy` instead of `off`.

### Also do this on his phone (2 min)
- Install the **Yahoo Mail** app and turn notifications **on**.
- The first lead email may land in **Spam**. Open it, tap **Not Spam**, and add `onboarding@resend.dev` to his contacts so the rest go to the inbox.

---

## Step 10 — Custom domain + professional sender (optional, 20 min + waiting)

**Hook up the domain:**
1. Vercel → your project → **Settings** → **Domains** → type the domain (like `stxcbydesign.com`) → **Add**.
2. Vercel shows you DNS records. Log in where the domain was bought (GoDaddy, Namecheap, etc.), find **DNS settings**, and add those records **exactly as Vercel shows them**.
3. Wait 15 minutes to a few hours. Vercel turns on HTTPS by itself.

The form works on the new domain automatically — no code change needed.

**Send from the business domain (recommended):**
1. Resend → **Domains** → **Add Domain** → enter the domain → add the records it shows at your domain company → wait for **Verified**.
2. Vercel → **Settings** → **Environment Variables** → add:
   - `FROM_EMAIL` = `STXC Website <website@yourdomain.com>`
   - `SEND_CONFIRMATION` = `true` (customers get a "we got your message" email)
3. Now `TO_EMAIL` can be any inbox, and you can list more than one: `owner@x.com, office@x.com`
4. Redeploy (Deployments → ⋯ → Redeploy).

---

## Making changes later

Edit (usually `src/config.js`), save, then:
```
git add .
git commit -m "describe the change"
git push
```
Vercel rebuilds and the live site updates in about a minute.

---

## When something's off

| What you see | What to do |
|---|---|
| `/api/health` says `NOT ready` | Add the setting it names in Vercel → Environment Variables, then Redeploy. |
| Form says "That didn't go through" | Open `/api/health`. If it says ready, check Vercel → your project → **Logs** for a line with `send_failed`. Usually a wrong/deleted Resend key. |
| "Too many messages" | Rate limit: 5 messages per 10 minutes from one connection. Wait 10 minutes. |
| No phone alert | Check `/api/health` → `phoneAlerts`. If it says `off`, the settings aren't in Vercel (or you didn't Redeploy). Run `npm run test-alert` on your computer to test the phone side. |
| Lead email not in his inbox | Look in Yahoo **Spam**, mark it Not Spam. Make sure the Resend account was made with jrduran75@yahoo.com. |
| `npm install` errors | Make sure you're inside the `stxc-site` folder (`cd` step) and Node is installed. |
| Site looks old after pushing | Wait a minute, then hard-refresh (`Cmd+Shift+R` / `Ctrl+F5`). |

---

## What's protecting the site

**Every request to the form goes through this chain:**
1. **Request ID** — every message gets a reference number that shows up in the email and the logs.
2. **Security headers** — no caching of form data, no embedding, no sniffing.
3. **Origin check** — only the site itself can send to the form. Other websites and scripts get blocked.
4. **Method check** — only POST.
5. **Rate limit** — 5 per 10 minutes per connection.
6. **Content-type + size limits** — only JSON, max 16 KB.
7. **Safe parsing** — broken or weird data gets a clean error, not a crash.
8. **Bot traps** — a hidden field bots fill out, and a "too fast to be human" timer. Bots get a fake success and nothing is sent.
9. **Validation** — same rules on the site and the server. The server always re-checks.
10. **Safe email** — everything a visitor types is escaped, so nobody can inject code or extra recipients into the email.
11. **Reliable sending** — 8-second timeout, one automatic retry, and duplicate protection so a double-click never sends twice.

**Whole site:** strict Content Security Policy, HTTPS-only (HSTS), no framing, locked-down browser permissions.

**Optional upgrades:**
- **Upstash Redis** (free at upstash.com) — add `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` in Vercel and the rate limit is shared across every server instead of per-server.
- **Vercel Firewall** — your project has a Firewall tab with bot protection you can turn on.
