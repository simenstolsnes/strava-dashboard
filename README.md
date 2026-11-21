# Training dashboard

A personal, mobile-first training dashboard built on Strava data (plus Garmin wellness data): fitness / fatigue / form,
power curves, heart-rate zones, aerobic progress, goals and workout suggestions.
Installable on your phone as an app (PWA).

**Stack:** Next.js 16 (App Router) · Supabase Postgres · Recharts · Tailwind · hosted on Vercel.

## How it works

```
Strava ──webhook──▶ /api/strava/webhook ──▶ fetch activity + streams ──▶ compute metrics ──▶ Supabase
                    /api/cron/sync (daily safety net)                                       │
Phone / browser ◀──────────────────────── Next.js pages (server-rendered) ◀────────────────┘
```

| Page | What's on it |
|---|---|
| **Today** | Fitness, fatigue, form, rule-based suggestions, this week vs 4-week average, HR zones (28 d), latest activities |
| **Power** | FTP / eFTP, W/kg, power curve (90 d vs previous 90 d vs all), best efforts, monthly bests |
| **Activities** | All sessions by month, filter by sport → detail page with HR / power / pace / elevation streams, zones, NP / IF / TSS, laps, power curve vs 90-day best, private notes |
| **Progress** | Running pace and cycling power at a fixed heart rate over 12 months, monthly hours, aerobic decoupling |
| **Recovery** | From Garmin: last night's sleep (stages, score), resting HR and VO2 max vs your normal, heart rate through a day, and trends (1 month → all) for sleep, sleep score, resting HR, VO2 max, Body Battery, stress and steps |
| **Goals** | Volume (km / hours / sessions per week, month or year), power for a duration, FTP, fitness level |
| **Compare** | You vs friends over 4 weeks, 3 months, this year or 12 months: time in activity, sessions, load, ride distance / time / elevation / speed, average and max power, best 5 / 20 min, FTP, W/kg, sport mix, fitness and form, Garmin recovery averages, and a running-total race chart |

After logging in you land on a choice: **My training** (the pages above, for your own data) or **Compare**.

### Where the numbers come from

- **From Strava:** activities, streams, Relative Effort, zones, FTP, weight.
- **Calculated here:** power curve (mean-max), Normalized Power, TSS / IF (from *current* FTP),
  time in zones, efficiency factor, decoupling, fitness / fatigue / form.
- **Fitness model:** 42-day (fitness) and 7-day (fatigue) exponentially weighted averages of daily load.
  Load = Strava Relative Effort, falling back to TSS for sessions without heart rate. This mirrors
  Strava's Fitness & Freshness but is our own estimate, so the values will differ somewhat.
- **From Garmin:** sleep, sleep score, resting / daily heart rate, VO2 max (Garmin's estimate), Body Battery, stress, steps.
  "Your usual" and "normal" are medians of the previous 30 days, calculated here.
- **eFTP:** 95 % of best 20-minute power in the last 90 days (used only when no FTP is set).

## Setup

### 1. Supabase (database)

Already provisioned via the CLI: project `training-dashboard` (`rtwduaqthkrvfbdvniha`, Stockholm).
The schema lives in `supabase/migrations/`. To apply new migrations:

```bash
supabase db push --remote     # needs SUPABASE_DB_PASSWORD from .env.local in your shell
```

### 2. Strava API app

At [strava.com/settings/api](https://www.strava.com/settings/api), copy the **Client ID** and **Client Secret**.
For local development, set **Authorization Callback Domain** to `localhost`.

### 3. Local environment

```bash
cp .env.example .env.local   # then fill in the values
npm install
npm run dev                  # http://localhost:3000 → "Connect with Strava"
```

> Put secrets only in `.env.local` (git-ignored), never in `.env.example`, which is committed.

Generate secrets with:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### 4. Import your history

After logging in once (this stores your Strava tokens):

```bash
npm run backfill               # last 24 months
npm run backfill -- --months=60
```

Strava allows roughly 100 requests per 15 minutes and 1,000 per day, and each activity needs one request.
The script waits automatically, and you can stop and re-run it at any time.

### 5. Garmin (optional, for the Recovery page)

Create a key at [Garmin Connect → Personal API](https://connect.garmin.com/app/settings/personalApiToken) and put it in
`.env.local` (and in Vercel) as `GARMIN_PERSONAL_API_KEY`. Then import your history:

```bash
npm run garmin-backfill              # last 24 months
npm run garmin-backfill -- --months=60
```

Garmin has no webhooks, so the daily cron re-reads the last 7 days, **Sync now** in Settings does the same,
and opening the Recovery page refreshes the last two days when the data is more than 20 minutes old.
The key is exchanged for a 24-hour token on the server; keys expire after at most a year (Garmin emails you first).

### 6. Friends (optional)

Each friend gets the full dashboard for their own data, and everyone appears on **Compare**.
Friends use **their own Strava API app** (Strava apps have their own athlete limits and rate limits).

1. The friend opens [strava.com/settings/api](https://www.strava.com/settings/api) and sets
   **Authorization Callback Domain** to `training-dashboard-bay.vercel.app` (or `localhost` for local testing).
2. Add to `.env.local` **and** Vercel (Settings → Environment Variables), using a short lowercase key like `ola`:
   ```
   FRIENDS=ola
   FRIEND_OLA_ATHLETE_ID=12345678           # from their profile URL, strava.com/athletes/<id>
   FRIEND_OLA_STRAVA_CLIENT_ID=…
   FRIEND_OLA_STRAVA_CLIENT_SECRET=…
   FRIEND_OLA_GARMIN_API_KEY=…              # optional, for Recovery
   ```
   Redeploy after changing Vercel variables.
3. Send the friend their personal link: **`https://training-dashboard-bay.vercel.app/login?as=ola`**.
   They approve Strava once; the device remembers the link afterwards. Only the athlete id you configured can log in with it.
4. Import their history (after they have logged in once):
   ```bash
   npm run backfill -- --as=ola
   npm run garmin-backfill -- --as=ola
   npm run webhook -- https://training-dashboard-bay.vercel.app --as=ola   # new activities appear instantly
   ```

The daily cron syncs everyone. Removing a friend from `FRIENDS` logs them out and stops syncing them.

### 7. Deploy to Vercel

Live at **https://training-dashboard-bay.vercel.app** (Vercel project `training-dashboard`, Stockholm region).

**Deploys are automatic:** every push to `main` on GitHub deploys to production; pushes to other
branches get a preview URL. Commits must be authored with the email on your Vercel account
(this repo uses `simen.stolsnes@gmail.com`), or Vercel blocks the deploy.

**Logging in on preview deployments:** Strava allows one callback domain (production), so a preview
sends you to production's Strava login, and production hands the session back to that preview with a
60-second signed token (`/api/auth/handoff`). Only this project's `training-dashboard-*-simen11.vercel.app`
URLs are accepted. Previews use the **production database** (their env vars are the production ones,
minus the cron and webhook secrets), so treat actions on a preview as real.

Set up once, already done for this project:

1. Add every variable from `.env.local` under **Settings → Environment Variables**.
2. In the Strava API settings, set **Authorization Callback Domain** to the Vercel domain.
3. Register the webhook so new activities appear automatically:
   ```bash
   npm run webhook -- https://training-dashboard-bay.vercel.app
   npm run webhook -- --list      # check it
   ```

The daily cron in `vercel.json` (04:00 UTC) catches anything the webhook missed.

### 8. Install on your phone

- **iPhone (Safari):** open the site → Share → **Add to Home Screen**
- **Android (Chrome):** open the site → ⋮ → **Install app**

## Coaching with Claude

The dashboard shows the numbers. For deeper analysis and training plans, use Claude with the Strava
MCP connector (`https://mcp.strava.com/mcp`), either in Claude Code in this repo or in the Claude mobile app.

## Project layout

```
src/lib/metrics.ts      pure training-science math (power curve, NP, TSS, zones, fitness model)
src/lib/sync.ts         Strava → database: fetch, compute, store
src/lib/strava.ts       Strava API client with token refresh and rate-limit tracking
src/lib/garmin.ts       Garmin Personal API client + wellness sync
src/lib/recovery.ts     database → Recovery page data
src/lib/queries.ts      database → page data (overview, power, progress, goals, advice rules)
src/lib/compare.ts      database → Compare page (everyone side by side)
src/lib/people.ts       who may log in (you + FRIENDS) and their Strava / Garmin keys
src/app/(app)/…         pages
src/app/api/…           login, webhook, cron, manual sync
scripts/                backfill + webhook registration
supabase/schema.sql     database schema
```
