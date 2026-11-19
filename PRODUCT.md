# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

One person: the owner, a Norway-based (Oslo) multisport amateur athlete. Trains roughly 4–6 times a week:
road runs (easy runs and 1000 m interval sessions), structured indoor rides on Zwift / a smart trainer
with power, outdoor gravel and road rides (often social, long, hilly), and weekly HIIT / strength.
Current Strava training focus: "Build".

Two usage moments:
- **Phone glances** (daily): right after a workout, or in the morning deciding what to do today.
  Seconds, one hand, often outdoors or on the move.
- **Deep dives** (weekly-ish): longer sessions on a larger screen digging into power curves,
  heart-rate data, progress and goals.

## Product Purpose

A private training dashboard built on the owner's own Strava data that shows how fitness is developing,
analyses individual workouts in depth, tracks self-defined goals, and gives grounded suggestions for
upcoming sessions. Success: the owner checks it after most workouts, understands what the session did,
and knows what a sensible next session is.

## Positioning

Unlike general tools (Strava, intervals.icu), it is built for exactly one athlete: it shows the metrics
that matter for *each activity type*, puts the owner's own goals and notes next to the numbers, and
grounds guidance in the owner's own history and preferences rather than generic plans.

## Operating Context

- Data arrives automatically from Strava (webhook seconds after upload; daily safety-net sync).
- Installed on the phone as a home-screen web app (PWA); also used in a desktop browser.
- Deeper coaching conversations happen in Claude with the Strava MCP connector; the dashboard
  holds the numbers and lightweight guidance.

## Capabilities and Constraints

- Metrics: heart rate and HR zones, power, power curves (mean-max), Normalized Power, IF, TSS, FTP / eFTP,
  W/kg, Relative Effort (Strava), fitness / fatigue / form (estimated CTL/ATL/TSB), efficiency factor,
  aerobic decoupling, pace, speed, elevation, cadence, laps.
- **Metrics must adapt to the activity type**: power-centric for rides with a power meter, pace/HR for runs,
  HR/effort for HIIT and strength, terrain for outdoor rides and trail runs. A wide set of metrics is welcome
  as long as each one is relevant to the activity shown.
- Pages: Today, Power, Activities (+ detail), Progress, Goals, Settings.
- Goals: volume per week/month/year, power for a duration, FTP, fitness level.
- Private notes ("how did it feel") per activity.
- Estimated values (fitness model, eFTP, pace/power at a fixed HR) must be labelled as estimates, distinct
  from values Strava reports.
- Read-only access to Strava; data stored in Supabase; hosted on Vercel.

## Brand Commitments

- Interface language: English.
- Binding colors from the owner: main `#016C66` (deep teal), secondary `#A54F16` (burnt orange-brown).
- No Strava branding beyond the required "Connect with Strava" / "View on Strava" affordances.

## Evidence on Hand

- Real Strava history: ~455 activities from Nov 2024 onward, ~200 with power, most with heart rate.
- No testimonials, users, or external claims exist; none should be fabricated.

## Product Principles

1. **Grounded, not creative.** Recommendations come from the owner's own history: the session types,
   sports and patterns they actually do and enjoy (e.g. Zwift interval sessions, 1000 m repeats, long gravel
   rides), adjusted for current form. Never invent exotic workouts the history gives no reason for.
2. **The right numbers for the activity.** Show depth, but only what is meaningful for that session type.
3. **Glanceable first, deep on demand.** The phone answer ("how am I doing, what next") comes in seconds;
   the detail is one tap away.
4. **Honest about estimates.** Always distinguish Strava-reported data from computed estimates.
5. **Personal over generic.** The owner's goals and notes sit beside the data, not in a separate corner.
