-- Each person can leave the Compare page (Settings → Comparison). On by default.
alter table athlete add column if not exists compare_enabled boolean not null default true;
