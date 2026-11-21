import { db, check } from "./db";
import { bestCurve, fitnessSeries } from "./metrics";
import { people } from "./people";
import { day, getActivities, getFtp, getProfile, kcalOf, loadOf, sportGroup, type SportGroup } from "./queries";
import { addDays, today, yearStart } from "./time";

export const PERIODS = {
  "4w": { label: "4 weeks", days: 28 },
  "3m": { label: "3 months", days: 91 },
  ytd: { label: "This year", days: null },
  "12m": { label: "12 months", days: 365 },
} as const;
export type PeriodKey = keyof typeof PERIODS;
export const isPeriod = (p: unknown): p is PeriodKey => typeof p === "string" && p in PERIODS;

export type PersonStats = {
  athleteId: number;
  name: string;
  isMe: boolean;
  /** All sports */
  total: { time: number; sessions: number; activeDays: number; load: number; kcal: number; elevation: number };
  bySport: Record<SportGroup, number>;
  ride: {
    count: number;
    distance: number;
    time: number;
    elevation: number;
    /** km/h over moving time */
    speed: number | null;
    longest: number;
    /** Time-weighted average of power-meter rides' average power */
    avgWatts: number | null;
    /** Highest 1-second power from the streams */
    maxWatts: number | null;
    best5m: number | null;
    best20m: number | null;
    powerRides: number;
  };
  ftp: number | null;
  ftpSource: string;
  wkg: number | null;
  now: { fitness: number; fatigue: number; form: number } | null;
  garmin: { sleep: number | null; score: number | null; rhr: number | null; steps: number | null; vo2: number | null } | null;
  /** Cumulative hours and ride km per day across the period, for the race chart */
  cumulative: { date: string; hours: number; rideKm: number }[];
};

const avg = (xs: (number | null | undefined)[]) => {
  const v = xs.filter((x): x is number => x != null && x > 0);
  return v.length ? v.reduce((s, x) => s + x, 0) / v.length : null;
};

async function garminFor(athleteId: number, from: string, to: string) {
  const rows = check(
    await db()
      .from("garmin_daily")
      .select("date,sleep_seconds,sleep_score,resting_hr,steps,vo2max_ride,vo2max_run")
      .eq("athlete_id", athleteId)
      .gte("date", from)
      .lte("date", to)
      .order("date"),
  ) as {
    date: string;
    sleep_seconds: number | null;
    sleep_score: number | null;
    resting_hr: number | null;
    steps: number | null;
    vo2max_ride: number | null;
    vo2max_run: number | null;
  }[];
  if (!rows.length) return null;
  // Latest VO2 max ever (it updates rarely), preferring cycling
  const vo2 = check(
    await db()
      .from("garmin_daily")
      .select("vo2max_ride,vo2max_run")
      .eq("athlete_id", athleteId)
      .or("vo2max_ride.not.is.null,vo2max_run.not.is.null")
      .order("date", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ) as { vo2max_ride: number | null; vo2max_run: number | null } | null;
  return {
    sleep: avg(rows.map((r) => r.sleep_seconds)),
    score: avg(rows.map((r) => r.sleep_score)),
    rhr: avg(rows.map((r) => r.resting_hr)),
    // Today's steps are still counting
    steps: avg(rows.filter((r) => r.date < to).map((r) => r.steps)),
    vo2: vo2?.vo2max_ride ?? vo2?.vo2max_run ?? null,
  };
}

async function statsFor(athleteId: number, isMe: boolean, from: string, to: string): Promise<PersonStats> {
  const [all, profile, ftpInfo, garmin] = await Promise.all([
    getActivities(athleteId),
    getProfile(athleteId),
    getFtp(athleteId),
    garminFor(athleteId, from, to),
  ]);
  const acts = all.filter((a) => day(a) >= from && day(a) <= to);
  const rides = acts.filter((a) => sportGroup(a.sport_type) === "ride");
  const powered = rides.filter((a) => a.device_watts && a.average_watts);
  const poweredTime = powered.reduce((s, a) => s + a.moving_time, 0);
  const curve = bestCurve(powered.map((a) => a.metrics?.power_curve));
  const sum = (list: typeof acts, f: (a: (typeof acts)[number]) => number) => list.reduce((s, a) => s + f(a), 0);

  const bySport: Record<SportGroup, number> = { ride: 0, run: 0, strength: 0, other: 0 };
  for (const a of acts) bySport[sportGroup(a.sport_type)] += a.moving_time;

  const series = fitnessSeries(
    all.map((a) => ({ date: day(a), load: loadOf(a, ftpInfo.ftp) })),
    today(),
  );
  const last = series.at(-1);

  const cumulative: PersonStats["cumulative"] = [];
  let hours = 0;
  let rideKm = 0;
  const byDay = Map.groupBy(acts, day);
  for (let d = from; d <= to; d = addDays(d, 1)) {
    for (const a of byDay.get(d) ?? []) {
      hours += a.moving_time / 3600;
      if (sportGroup(a.sport_type) === "ride") rideKm += a.distance / 1000;
    }
    cumulative.push({ date: d, hours: +hours.toFixed(2), rideKm: +rideKm.toFixed(1) });
  }

  const rideTime = sum(rides, (a) => a.moving_time);
  const rideDistance = sum(rides, (a) => a.distance);
  return {
    athleteId,
    name: profile.name.split(" ")[0] || `Athlete ${athleteId}`,
    isMe,
    total: {
      time: sum(acts, (a) => a.moving_time),
      sessions: acts.length,
      activeDays: new Set(acts.map(day)).size,
      load: Math.round(sum(acts, (a) => loadOf(a, ftpInfo.ftp))),
      kcal: sum(acts, (a) => kcalOf(a)?.kcal ?? 0),
      elevation: sum(acts, (a) => a.total_elevation_gain ?? 0),
    },
    bySport,
    ride: {
      count: rides.length,
      distance: rideDistance,
      time: rideTime,
      elevation: sum(rides, (a) => a.total_elevation_gain ?? 0),
      speed: rideTime ? (rideDistance / rideTime) * 3.6 : null,
      longest: Math.max(0, ...rides.map((a) => a.distance)),
      avgWatts: poweredTime ? Math.round(sum(powered, (a) => a.average_watts! * a.moving_time) / poweredTime) : null,
      maxWatts: curve["1"] ?? null,
      best5m: curve["300"] ?? null,
      best20m: curve["1200"] ?? null,
      powerRides: powered.length,
    },
    ftp: ftpInfo.ftp,
    ftpSource: ftpInfo.source,
    wkg: ftpInfo.ftp && profile.weight ? ftpInfo.ftp / profile.weight : null,
    now: last ? { fitness: last.fitness, fatigue: last.fatigue, form: last.form } : null,
    garmin,
    cumulative,
  };
}

/** Everyone configured who has logged in at least once (so has a profile), the viewer first. */
export async function getConnected(viewer: number) {
  const rows = check(await db().from("athlete").select("id,firstname")) as { id: number; firstname: string | null }[];
  const names = new Map(rows.map((r) => [Number(r.id), r.firstname ?? ""]));
  return people()
    .filter((p) => names.has(p.athleteId))
    .map((p) => ({ athleteId: p.athleteId, name: names.get(p.athleteId) || p.key, isMe: p.athleteId === viewer }))
    .sort((a, b) => Number(b.isMe) - Number(a.isMe));
}

export async function getComparison(viewer: number, period: PeriodKey) {
  const to = today();
  const days = PERIODS[period].days;
  const from = days ? addDays(to, -(days - 1)) : yearStart(to);
  const ids = (await getConnected(viewer)).map((p) => p.athleteId);

  const stats = await Promise.all(ids.map((id) => statsFor(id, id === viewer, from, to)));
  return { from, to, people: stats };
}
