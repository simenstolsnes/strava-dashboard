# Training dashboard

A personal, mobile-first training dashboard built on Strava data: fitness / fatigue / form,
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
| **Goals** | Volume (km / hours / sessions per week, month or year), power for a duration, FTP, fitness level |

### Where the numbers come from

- **From Strava:** activities, streams, Relative Effort, zones, FTP, weight.
- **Calculated here:** power curve (mean-max), Normalized Power, TSS / IF (from *current* FTP),
  time in zones, efficiency factor, decoupling, fitness / fatigue / form.
- **Fitness model:** 42-day (fitness) and 7-day (fatigue) exponentially weighted averages of daily load.
  Load = Strava Relative Effort, falling back to TSS for sessions without heart rate. This mirrors
  Strava's Fitness & Freshness but is our own estimate, so the values will differ somewhat.
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

### 5. Deploy to Vercel

1. Push this repo to GitHub, then **Import** it at [vercel.com/new](https://vercel.com/new).
2. Add every variable from `.env.local` under **Settings → Environment Variables**.
3. Deploy. In the Strava API settings, change **Authorization Callback Domain** to your Vercel domain
   (e.g. `my-training.vercel.app`).
4. Register the webhook so new activities appear automatically:
   ```bash
   npm run webhook -- https://my-training.vercel.app
   npm run webhook -- --list      # check it
   ```

The daily cron in `vercel.json` (04:00 UTC) catches anything the webhook missed.

### 6. Install on your phone

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
src/lib/queries.ts      database → page data (overview, power, progress, goals, advice rules)
src/app/(app)/…         pages
src/app/api/…           login, webhook, cron, manual sync
scripts/                backfill + webhook registration
supabase/schema.sql     database schema
```
