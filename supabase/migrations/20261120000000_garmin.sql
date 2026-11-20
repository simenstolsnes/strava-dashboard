-- Garmin wellness data (Garmin Connect Personal API), one row per calendar day.
-- Like the other tables: RLS on, no policies, so only the server can read or write.

create table if not exists garmin_daily (
  date              date primary key,
  -- Sleep (the night ending on this date)
  sleep_seconds     integer,
  deep_seconds      integer,
  light_seconds     integer,
  rem_seconds       integer,
  awake_seconds     integer,
  sleep_score       integer,
  sleep_quality     text,        -- Garmin qualifier: POOR / FAIR / GOOD / EXCELLENT
  sleep_start_local timestamp,   -- wall-clock time on the watch
  sleep_end_local   timestamp,
  sleep_stress      real,
  -- Heart rate
  resting_hr        integer,
  min_hr            integer,
  max_hr            integer,
  -- Daily summary
  stress_avg        integer,
  body_battery_high integer,
  body_battery_low  integer,
  body_battery_charged integer,
  body_battery_drained integer,
  steps             integer,
  step_goal         integer,
  -- VO2 max (Garmin's estimate), only on days it was updated
  vo2max_run        real,
  vo2max_ride       real,
  updated_at        timestamptz default now()
);

-- Heart rate through the day: [[epoch ms, bpm], ...] (about every 2 minutes)
create table if not exists garmin_heart_rate (
  date       date primary key,
  samples    jsonb not null,
  resting_hr integer,
  updated_at timestamptz default now()
);

alter table garmin_daily enable row level security;
alter table garmin_heart_rate enable row level security;
