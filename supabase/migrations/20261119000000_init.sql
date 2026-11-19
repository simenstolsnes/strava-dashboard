-- Initial schema. Applied with `supabase db push`.
-- RLS is enabled with no policies: only the server (service role / secret key)
-- can read or write. Nothing is reachable with the public anon key.

create table if not exists athlete (
  id           bigint primary key,
  firstname    text,
  lastname     text,
  weight       real,          -- kg, from Strava
  strava_ftp   integer,       -- FTP set in Strava
  ftp_override integer,       -- FTP set in this app's settings (wins if set)
  hr_zones     jsonb,         -- [{min,max}, ...] from Strava
  power_zones  jsonb,
  updated_at   timestamptz default now()
);

create table if not exists strava_tokens (
  athlete_id    bigint primary key,
  access_token  text   not null,
  refresh_token text   not null,
  expires_at    bigint not null,   -- unix seconds
  updated_at    timestamptz default now()
);

create table if not exists activities (
  id                     bigint primary key,
  athlete_id             bigint not null,
  name                   text,
  description            text,
  sport_type             text,
  start_date             timestamptz not null,
  start_date_local       timestamp,
  distance               real,     -- m
  moving_time            integer,  -- s
  elapsed_time           integer,  -- s
  total_elevation_gain   real,     -- m
  average_speed          real,     -- m/s
  max_speed              real,
  average_heartrate      real,
  max_heartrate          real,
  average_watts          real,
  weighted_average_watts real,
  max_watts              real,
  kilojoules             real,
  device_watts           boolean,
  average_cadence        real,
  suffer_score           real,     -- Strava Relative Effort
  calories               real,
  trainer                boolean,
  commute                boolean,
  workout_type           integer,
  gear_id                text,
  laps                   jsonb,
  processed              boolean default false,  -- streams fetched + metrics computed
  detail_fetched         boolean default false,  -- full detail (laps, calories, description)
  updated_at             timestamptz default now()
);
create index if not exists activities_start_idx on activities (start_date desc);

-- Derived metrics, computed from streams
create table if not exists activity_metrics (
  activity_id        bigint primary key references activities(id) on delete cascade,
  power_curve        jsonb,   -- {"5": 812, "60": 455, ...} best avg watts per duration (s)
  hr_zone_seconds    jsonb,   -- [s in Z1, s in Z2, ...]
  power_zone_seconds jsonb,
  normalized_power   real,    -- TSS/IF are derived from this + current FTP at read time
  efficiency_factor  real,    -- NP/HR (ride) or m/min per bpm (run)
  decoupling         real,    -- % drift of EF from first to second half
  computed_at        timestamptz default now()
);

-- Downsampled streams for activity charts (≤ ~1000 points per activity)
create table if not exists activity_streams (
  activity_id bigint primary key references activities(id) on delete cascade,
  data        jsonb not null  -- {time:[], heartrate:[], watts:[], velocity:[], altitude:[], cadence:[], distance:[]}
);

create table if not exists goals (
  id          uuid primary key default gen_random_uuid(),
  title       text not null,
  kind        text not null,   -- volume | power_best | ftp | fitness
  sport       text,            -- run | ride | all (volume goals)
  measure     text,            -- distance | time | sessions (volume goals)
  period      text,            -- week | month | year (volume goals)
  duration_s  integer,         -- power_best goals
  target      real not null,
  deadline    date,
  created_at  timestamptz default now()
);

create table if not exists notes (
  activity_id bigint primary key references activities(id) on delete cascade,
  feeling     smallint,        -- 1..5
  text        text,
  updated_at  timestamptz default now()
);

alter table athlete          enable row level security;
alter table strava_tokens    enable row level security;
alter table activities       enable row level security;
alter table activity_metrics enable row level security;
alter table activity_streams enable row level security;
alter table goals            enable row level security;
alter table notes            enable row level security;
