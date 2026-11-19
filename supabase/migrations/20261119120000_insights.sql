-- Maps, HRRc and a metrics version so activities can be reprocessed when
-- new metrics are added (npm run backfill -- --refresh).

alter table activities
  add column if not exists map_polyline    text,             -- encoded polyline (full when detail fetched)
  add column if not exists metrics_version integer default 0; -- bumped when metrics are (re)computed

alter table activity_metrics
  add column if not exists hrrc      real, -- largest 60 s heart-rate drop starting at/above threshold (bpm)
  add column if not exists hrrc_from real; -- heart rate the drop started from (bpm)
