-- Several people (the owner plus friends). Activities already carry athlete_id;
-- goals and Garmin data become per athlete. Existing rows belong to the owner,
-- who until now was the only row in `athlete`.

alter table goals add column if not exists athlete_id bigint;
update goals set athlete_id = (select id from athlete order by updated_at limit 1) where athlete_id is null;
alter table goals alter column athlete_id set not null;
create index if not exists goals_athlete_idx on goals (athlete_id);

alter table garmin_daily add column if not exists athlete_id bigint;
update garmin_daily set athlete_id = (select id from athlete order by updated_at limit 1) where athlete_id is null;
alter table garmin_daily alter column athlete_id set not null;
alter table garmin_daily drop constraint if exists garmin_daily_pkey;
alter table garmin_daily add primary key (athlete_id, date);

alter table garmin_heart_rate add column if not exists athlete_id bigint;
update garmin_heart_rate set athlete_id = (select id from athlete order by updated_at limit 1) where athlete_id is null;
alter table garmin_heart_rate alter column athlete_id set not null;
alter table garmin_heart_rate drop constraint if exists garmin_heart_rate_pkey;
alter table garmin_heart_rate add primary key (athlete_id, date);

create index if not exists activities_athlete_start_idx on activities (athlete_id, start_date desc);
