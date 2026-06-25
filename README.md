# ⚽ Kapia's World Cup Porra

A tiny prediction-pool web app for the **2026 FIFA World Cup**. Each Kapia colleague gets
an account, predicts the scoreline of every match, and earns points. A daily job pulls the
real results, regrades everyone, and posts a summary + leaderboard to Slack.

- **Stack:** Next.js 15 (App Router) · Postgres (Neon) · Drizzle ORM · Tailwind · Vercel Cron
- **Scoring:** exact score = **3 pts**, correct winner/draw only = **1 pt**, wrong = **0**
- **Data:** all 12 groups / 48 teams / 104 matches are pre-seeded. The 40 matches played
  through June 21, 2026 are already marked finished with their real scores.

---

## What you need to provide

Everything is built — you only set environment variables. See `.env.example`.

| Variable | What it is | Where to get it |
|---|---|---|
| `DATABASE_URL` | Postgres connection | Auto-set by the Neon integration on Vercel (or paste a Neon **pooled** URL locally) |
| `SESSION_SECRET` | Signs login cookies | `openssl rand -hex 32` |
| `INVITE_CODE` | Code colleagues type once to register | You choose it |
| `ADMIN_PASSWORD` | Protects `/admin` and `/api/seed` | You choose it |
| `FOOTBALL_API_KEY` | Live scores | Free key at <https://www.football-data.org/client/register> |
| `SLACK_WEBHOOK_URL` | Daily digest target | <https://api.slack.com/messaging/webhooks> |
| `CRON_SECRET` | Protects `/api/cron` | `openssl rand -hex 32` |

---

## Deploy to Vercel (≈10 minutes)

1. **Push this folder to a Git repo** (GitHub/GitLab) and **Import** it in Vercel.
2. In the Vercel project → **Storage** → add **Neon** (Postgres). This auto-injects `DATABASE_URL`.
3. In **Settings → Environment Variables**, add the other variables from the table above.
4. **Deploy.**
5. **Create the tables.** Locally, with the same `DATABASE_URL` in `.env`, run:
   ```bash
   npm install
   npm run db:push      # creates the tables
   npm run db:seed      # loads teams, fixtures, and results-to-date
   ```
   (Prefer not to run anything locally? After deploying, visit
   `https://YOUR-APP.vercel.app/api/seed?secret=YOUR_ADMIN_PASSWORD` once to seed — but you
   still need `npm run db:push` once to create the tables. The simplest path is the two
   commands above against the Neon URL.)
6. **Done.** The cron is already registered in `vercel.json` to run daily at **07:00 UTC
   (~09:00 Madrid)**, hitting `/api/cron`. Vercel automatically sends the `CRON_SECRET`.

### Share with colleagues
Send them the URL + the `INVITE_CODE`. Each person opens the app, types their name, sets a
password, enters the invite code once, and starts predicting.

---

## How it runs day to day

- **Cron `/api/cron`** (daily, automatic): fetches recent scores from football-data.org,
  updates matches, regrades predictions, and posts the Slack digest (yesterday's results +
  points each person earned + overall standings).
- **`/admin`** (password-protected, optional fallback): manually fix a score, override a
  knockout team assignment, trigger a results sync on demand, or re-post the Slack digest
  for a chosen date. Day to day you shouldn't need it.

### Trigger the digest manually / from Upstash
`/api/cron` also accepts the secret as a query param, so you can call it from Upstash QStash
or curl:
```bash
curl "https://YOUR-APP.vercel.app/api/cron?secret=YOUR_CRON_SECRET"
# preview without posting to Slack:
curl "https://YOUR-APP.vercel.app/api/cron?secret=YOUR_CRON_SECRET&dry=1"
# a specific Madrid day:
curl "https://YOUR-APP.vercel.app/api/cron?secret=YOUR_CRON_SECRET&date=2026-06-24"
```

---

## Local development

```bash
cp .env.example .env     # fill in at least DATABASE_URL and SESSION_SECRET
npm install
npm run db:push
npm run db:seed
npm run dev              # http://localhost:3000
```

## Knockout bracket (fully automatic)

The Round-of-32 → Final fixtures are pre-loaded with their dates and placeholder slots
("Winner Group A", etc.). When the group stage ends (June 27) and the football API publishes
the real qualified teams, the daily sync **fills each bracket slot automatically** (matching
fixtures to slots by kick-off time) and then grades scores like any other match. You don't
need to touch anything — `/admin` is only a manual fallback if a fixture ever fails to map.

## Slack @-mentions

Players can paste their **Slack member ID** (Slack → profile → ⋮ More → *Copy member ID*,
looks like `U0123ABCD`) on the login screen or under **Settings**. When they earn points that
day, the Slack digest pings them with a real `@mention` instead of plain text. No extra Slack
setup or bot token needed — it works through the same incoming webhook.

## Notes

- Predictions lock automatically at each match's kick-off (Madrid time).
- Team-name matching from the football API covers all 48 nations; if a score doesn't land
  automatically, set it in `/admin`.
- Re-running `npm run db:seed` is safe — it refreshes fixtures but never wipes live scores.
