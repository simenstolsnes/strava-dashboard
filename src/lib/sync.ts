import { db, check } from "./db";
import { strava, RateLimitError, rateLimit, type StravaActivity, type StreamSet } from "./strava";
import {
  resample1Hz,
  meanMax,
  normalizedPower,
  zoneSeconds,
  efficiency,
  downsample,
  heartRateRecovery,
  type Zone,
} from "./metrics";

type Context = { hrZones: Zone[] | null; powerZones: Zone[] | null };

/**
 * Bump when computeMetrics or the stored chart streams change; `npm run backfill -- --refresh`
 * reprocesses older rows. v3: chart streams on a moving-time axis.
 */
export const METRICS_VERSION = 3;

/** Longest gap (s) between moving samples still counted as moving time (smart recording). */
const MAX_MOVING_STEP = 10;

/** Threshold heart rate: the bottom of Strava's zone 4 ("Threshold") in a 5-zone setup. */
export const thresholdHr = (zones: Zone[] | null) => (zones && zones.length >= 4 ? zones[3].min : null);

const isRun = (sport: string) => /Run|Walk|Hike/.test(sport);

function summaryRow(a: StravaActivity) {
  return {
    id: a.id,
    athlete_id: a.athlete.id,
    name: a.name,
    sport_type: a.sport_type,
    start_date: a.start_date,
    start_date_local: a.start_date_local.replace("Z", ""),
    distance: a.distance,
    moving_time: a.moving_time,
    elapsed_time: a.elapsed_time,
    total_elevation_gain: a.total_elevation_gain,
    average_speed: a.average_speed,
    max_speed: a.max_speed,
    average_heartrate: a.average_heartrate ?? null,
    max_heartrate: a.max_heartrate ?? null,
    average_watts: a.average_watts ?? null,
    weighted_average_watts: a.weighted_average_watts ?? null,
    max_watts: a.max_watts ?? null,
    kilojoules: a.kilojoules ?? null,
    device_watts: a.device_watts ?? null,
    average_cadence: a.average_cadence ?? null,
    suffer_score: a.suffer_score ?? null,
    trainer: a.trainer ?? null,
    commute: a.commute ?? null,
    workout_type: a.workout_type ?? null,
    gear_id: a.gear_id ?? null,
    // The list endpoint carries a simplified route; detail replaces it with the full one
    ...(a.map?.summary_polyline ? { map_polyline: a.map.summary_polyline } : {}),
    updated_at: new Date().toISOString(),
  };
}

function detailRow(a: StravaActivity) {
  return {
    ...summaryRow(a),
    description: a.description ?? null,
    calories: a.calories ?? null,
    map_polyline: a.map?.polyline || a.map?.summary_polyline || null,
    detail_fetched: true,
    laps: (a.laps ?? []).map((l) => ({
      name: l.name,
      elapsed_time: l.elapsed_time,
      moving_time: l.moving_time,
      distance: l.distance,
      average_speed: l.average_speed,
      average_heartrate: l.average_heartrate ?? null,
      max_heartrate: l.max_heartrate ?? null,
      average_watts: l.average_watts ?? null,
      average_cadence: l.average_cadence ?? null,
    })),
  };
}

export async function upsertSummaries(list: StravaActivity[]) {
  if (!list.length) return;
  // Don't overwrite processed/detail flags: summaries never include them.
  check(await db().from("activities").upsert(list.map(summaryRow)));
}

/** Refresh profile, FTP, weight and zones from Strava. */
export async function refreshAthlete(athleteId: number) {
  const [athlete, zones] = await Promise.all([strava.athlete(athleteId), strava.zones(athleteId)]);
  check(
    await db().from("athlete").upsert({
      id: athlete.id,
      firstname: athlete.firstname,
      lastname: athlete.lastname,
      weight: athlete.weight ?? null,
      strava_ftp: athlete.ftp ?? null,
      hr_zones: zones.heart_rate?.zones ?? null,
      power_zones: zones.power?.zones ?? null,
      updated_at: new Date().toISOString(),
    }),
  );
}

async function loadContext(athleteId: number): Promise<Context> {
  const row = check(
    await db().from("athlete").select("hr_zones, power_zones").eq("id", athleteId).maybeSingle(),
  ) as { hr_zones: Zone[] | null; power_zones: Zone[] | null } | null;
  return { hrZones: row?.hr_zones ?? null, powerZones: row?.power_zones ?? null };
}

function computeMetrics(sport: string, s: StreamSet, ctx: Context) {
  const time = s.time?.data ?? [];
  const watts = s.watts?.data;
  const hr = s.heartrate?.data;
  const velocity = s.velocity_smooth?.data;

  const power1Hz = watts ? resample1Hz(time, watts, 0) : null;
  const hr1Hz = hr ? resample1Hz(time, hr, NaN) : null;
  const pace1Hz = velocity && isRun(sport) ? resample1Hz(time, velocity.map((v) => v * 60), NaN) : null;

  const effOutput = power1Hz ?? pace1Hz;
  const eff = effOutput && hr1Hz ? efficiency(effOutput, hr1Hz) : null;
  const threshold = thresholdHr(ctx.hrZones);
  const hrr = hr1Hz && threshold ? heartRateRecovery(hr1Hz, threshold) : null;

  return {
    hrrc: hrr?.drop ?? null,
    hrrc_from: hrr?.from ?? null,
    power_curve: power1Hz ? meanMax(power1Hz) : null,
    normalized_power: power1Hz ? normalizedPower(power1Hz) : null,
    power_zone_seconds: power1Hz && ctx.powerZones ? zoneSeconds(power1Hz, ctx.powerZones) : null,
    hr_zone_seconds: hr1Hz && ctx.hrZones ? zoneSeconds(hr1Hz, ctx.hrZones) : null,
    efficiency_factor: eff?.ef ?? null,
    decoupling: eff?.decoupling ?? null,
  };
}

/**
 * Downsampled streams for the activity charts, on a moving-time axis: samples
 * where Strava marks you as stopped are dropped, and pauses don't advance the
 * clock, so breaks leave no holes in heart rate, power or pace.
 */
export function chartStreams(s: StreamSet) {
  const time = s.time?.data ?? [];
  const moving = s.moving?.data as unknown as boolean[] | undefined;
  const hasMoving = !!moving && moving.length === time.length && moving.some(Boolean);

  // Indices to keep, and moving seconds elapsed at each of them
  const keep: number[] = [];
  const movingTime: number[] = [];
  let clock = 0;
  for (let i = 0; i < time.length; i++) {
    if (hasMoving && !moving![i]) continue;
    if (keep.length) clock += Math.min(time[i] - time[keep[keep.length - 1]], MAX_MOVING_STEP);
    keep.push(i);
    movingTime.push(clock);
  }

  const pick = (k: keyof StreamSet) => (s[k]?.data ? downsample(keep.map((i) => s[k]!.data[i])) : undefined);
  return {
    axis: hasMoving ? ("moving" as const) : ("elapsed" as const),
    time: downsample(hasMoving ? movingTime : keep.map((i) => time[i])),
    heartrate: pick("heartrate"),
    watts: pick("watts"),
    velocity: pick("velocity_smooth"),
    altitude: pick("altitude"),
    cadence: pick("cadence"),
    distance: pick("distance"),
  };
}

async function fetchStreams(athleteId: number, activityId: number): Promise<StreamSet> {
  try {
    return await strava.streams(athleteId, activityId);
  } catch (e) {
    // Manual entries have no streams (404); treat as empty.
    if (e instanceof Error && e.message.includes("(404)")) return {};
    throw e;
  }
}

/**
 * Fetch streams (and optionally full detail) for one activity, compute
 * metrics and store everything. `withDetail` costs one extra API request.
 */
export async function processActivity(
  athleteId: number,
  activityId: number,
  opts: { withDetail: boolean; ctx?: Context },
) {
  const ctx = opts.ctx ?? (await loadContext(athleteId));
  let sport: string;
  if (opts.withDetail) {
    const detail = await strava.activity(athleteId, activityId);
    check(await db().from("activities").upsert(detailRow(detail)));
    sport = detail.sport_type;
  } else {
    const row = check(
      await db().from("activities").select("sport_type").eq("id", activityId).single(),
    ) as { sport_type: string };
    sport = row.sport_type;
  }

  const streams = await fetchStreams(athleteId, activityId);
  if (streams.time?.data?.length) {
    check(
      await db().from("activity_metrics").upsert({
        activity_id: activityId,
        ...computeMetrics(sport, streams, ctx),
        computed_at: new Date().toISOString(),
      }),
    );
    check(await db().from("activity_streams").upsert({ activity_id: activityId, data: chartStreams(streams) }));
  }
  check(
    await db().from("activities").update({ processed: true, metrics_version: METRICS_VERSION }).eq("id", activityId),
  );
}

/**
 * Strava's webhook only reports title, sport type and privacy changes, never
 * description edits. Re-fetch the detail (one request each) of recent
 * activities so edited descriptions, names and calories catch up daily.
 */
export async function refreshRecentDetails(athleteId: number, days = 7) {
  const since = new Date(Date.now() - days * 86400 * 1000).toISOString();
  const recent = check(
    await db().from("activities").select("id").eq("athlete_id", athleteId).gte("start_date", since).eq("processed", true),
  ) as { id: number }[];
  let updated = 0;
  try {
    for (const { id } of recent) {
      const detail = await strava.activity(athleteId, id);
      check(await db().from("activities").upsert(detailRow(detail)));
      updated++;
    }
  } catch (e) {
    if (!(e instanceof RateLimitError)) throw e;
  }
  return updated;
}

export async function deleteActivity(activityId: number) {
  check(await db().from("activities").delete().eq("id", activityId));
}

/**
 * Pull activities newer than what's stored (with a few days of overlap to
 * catch edits), then process up to `maxProcess` unprocessed activities.
 * Stops cleanly when the Strava rate limit is hit.
 */
export async function syncRecent(athleteId: number, maxProcess = 20) {
  const latest = check(
    await db()
      .from("activities")
      .select("start_date")
      .eq("athlete_id", athleteId)
      .order("start_date", { ascending: false })
      .limit(1),
  ) as { start_date: string }[];
  const after = latest[0]
    ? Math.floor(new Date(latest[0].start_date).getTime() / 1000) - 3 * 86400
    : Math.floor(Date.now() / 1000) - 90 * 86400;

  let fetched = 0;
  for (let page = 1; ; page++) {
    const list = await strava.activities(athleteId, { after, page, per_page: 100 });
    await upsertSummaries(list);
    fetched += list.length;
    if (list.length < 100) break;
  }
  const processed = await processPending(athleteId, maxProcess, true);
  return { fetched, ...processed };
}

/**
 * Process the newest pending activities first. `outdated` also picks up
 * activities whose metrics predate METRICS_VERSION (and refetches detail).
 */
export async function processPending(
  athleteId: number,
  max: number,
  withDetail: boolean,
  scope: "unprocessed" | "outdated" = "unprocessed",
) {
  const base = db().from("activities").select("id, detail_fetched").eq("athlete_id", athleteId);
  const filtered =
    scope === "outdated"
      ? base.or(`processed.eq.false,metrics_version.lt.${METRICS_VERSION},metrics_version.is.null`)
      : base.eq("processed", false);
  const pending = check(await filtered.order("start_date", { ascending: false }).limit(max)) as {
    id: number;
    detail_fetched: boolean | null;
  }[];
  const ctx = await loadContext(athleteId);
  let done = 0;
  try {
    for (const { id, detail_fetched } of pending) {
      // A refresh only needs detail (calories, map, laps) once; after that, streams are enough.
      const needsDetail = withDetail && (scope === "unprocessed" || !detail_fetched);
      await processActivity(athleteId, id, { withDetail: needsDetail, ctx });
      done++;
    }
  } catch (e) {
    if (!(e instanceof RateLimitError)) throw e;
    return { processed: done, remaining: true, rateLimited: true, rateLimit };
  }
  return { processed: done, remaining: pending.length === max, rateLimited: false, rateLimit };
}
