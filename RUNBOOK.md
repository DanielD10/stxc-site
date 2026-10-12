# When something breaks

Start here. Every problem below has a place to look and a fix. Nothing on this list can take the whole site down by itself: if the form fails, visitors still see a screen with his phone number and a pre-filled email button.

## The 3 places to look

| Where | What it tells you |
|---|---|
| **southtexasconstructionbydesign.com/api/health** | Whether the form's settings are in place. `"email":"ready"` and `"sender":"custom verified domain"` = good. If it says `NOT ready`, `missingSettings` names what's missing. |
| **Resend → Emails** (resend.com) | Every email the site sent, and whether it was delivered, bounced, or marked spam. **Resend → Logs** shows every attempt, including ones Resend refused, with the reason. |
| **Cloudflare → Workers & Pages → stxc-site → Observability → Logs** | What the site's backend did on each form send. Search for the event names in the table below. |

## Log events (Cloudflare logs)

| Event | Meaning | Fix |
|---|---|---|
| `inquiry_sent` | Worked. Email handed to Resend. | Nothing. If he didn't get it, check his Yahoo **Spam** and Resend → Emails. |
| `config_missing` | A setting is missing. Visitors see "Our form is offline". | Worker → Settings → **Variables and Secrets** → add what `missing` names → **Deploy**. |
| `send_failed` + `Resend 403` | Key is wrong, or the domain lost verification. | Resend → **Domains**: must say Verified. If yes, make a new API key and paste it into `RESEND_API_KEY`. |
| `send_failed` + `Resend 422` | `FROM_EMAIL` is malformed or not on the verified domain. | Set it to exactly `South Texas Construction By Design <website@southtexasconstructionbydesign.com>`. |
| `send_failed` + `Resend 429` | Hit Resend's free limit (100 emails/day, 3,000/month; each inquiry uses 2 with the receipt). | Wait until tomorrow, or set `SEND_CONFIRMATION` to `false` to halve usage. Upgrade Resend if it keeps happening. |
| `send_failed` + `Resend timeout` / `500` | Resend was down. The site already retried once. | Nothing to fix. Check status.resend.com. Visitors saw the call/email fallback. |
| `receipt_failed` | His copy went out; the customer's "we got your message" didn't. | Usually a typo'd customer address. Nothing to do. |
| `rate_limited` | Someone sent more than 3 a minute (or 5 in 10 minutes). | Normal spam protection. Real people never hit it. |
| `bot_dropped` | A bot filled the hidden field or submitted instantly. Nothing was sent. | Nothing. |
| `origin_blocked` | Something outside the site tried to post to the form. | Nothing. That's the block working. |
| `unhandled` | A bug. Visitor saw "Something went wrong". | Note the time and the `msg`, then fix the code it points to. Run `npm test`. |

## Common situations

**He says he's not getting emails.**
1. Open `/api/health`. Fix anything `NOT ready`.
2. Resend → Emails. If the email is there and **Delivered**, it's in his Yahoo Spam: mark it **Not Spam** once.
3. If Resend shows nothing, send a test from the form and check Cloudflare logs for the event.

**A push to GitHub didn't change the live site.**
Cloudflare → stxc-site → **Deployments**. If the newest build failed, open its log.
- `npm test` failing = the safety net worked. A test broke, so the build stopped and **the old site stayed live**. Fix the code, run `npm test` locally until it passes, push again.
- Any other error: usually the build command isn't `npm run build`.

**A change went live and broke something.**
Cloudflare → stxc-site → **Deployments** → pick the last good one → **Rollback**. The site is back in seconds. Then fix the code and push.

**Someone is spamming the form.**
The limits already cap it at 3 a minute per connection. If it gets past that, turn on Cloudflare **Bot Fight Mode** (domain → Security → Bots), which is free.

**You changed the services, the dropdown, or the wording.**
Edit `src/config.js` (wording) or `shared/projectTypes.js` (dropdown). Run `npm test` and `npm run dev` to look at it, then push.

## Settings reference

All live in Cloudflare → stxc-site → Settings → **Variables and Secrets**. Changes need **Deploy** to take effect.

| Name | Value | Needed? |
|---|---|---|
| `RESEND_API_KEY` | `re_...` key from Resend (sending access, this domain only) | Yes |
| `TO_EMAIL` | `jrduran75@yahoo.com` (comma-separate to add more) | Yes |
| `FROM_EMAIL` | `South Texas Construction By Design <website@southtexasconstructionbydesign.com>` | Yes, or Resend refuses to send to Yahoo |
| `COMPANY_PHONE` | `(210) 367-6648` | Shown in the customer's receipt |
| `SEND_CONFIRMATION` | `true` | Customer gets a "we got your message" email |
| `TELEGRAM_BOT_TOKEN` + `TELEGRAM_CHAT_ID`, or `NTFY_TOPIC` | see SETUP.md Part C | Phone alerts, optional |

The rate limiter is set in `wrangler.jsonc` (`ratelimits`), not the dashboard.
