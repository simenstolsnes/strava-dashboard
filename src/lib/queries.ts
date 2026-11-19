import { cache } from "react";
import { db, check, selectAll } from "./db";
import {
  bestCurve,
  CURVE_DURATIONS,
  estimateFtp,
  fitnessSeries,
  type FitnessPoint,
  type Zone,
} from "./metrics";
import { addDays, daysBetween, monthStart, today, weekStart, yearStart } from "./time";
import { suggest } from "./guidance";

// ---------- Types ----------

export type SportGroup = "ride" | "run" | "strength" | "other";

export type Metrics = {
  normalized_power: number | null;
  hr_zone_seconds: number[] | null;
  power_zone_seconds: number[] | null;
  efficiency_factor: number | null;
  decoupling: number | null;
  power_curve?: Record<string, number> | null;
};

export type Activity = {
  id: number;
  name: string;
  sport_type: string;
  start_date: string;
  start_date_local: string;
  distance: number;
  moving_time: number;
  elapsed_time: number;
  total_elevation_gain: number;
  average_speed: number;
  average_heartrate: number | null;
  max_heartrate: number | null;
  average_watts: number | null;
  weighted_average_watts: number | null;
  device_watts: boolean | null;
  suffer_score: number | null;
  trainer: boolean | null;
  metrics: Metrics | null;
};

export type Profile = {
  name: string;
  weight: number | null;
  stravaFtp: number | null;
  ftpOverride: number | null;
  hrZones: Zone[] | null;
  powerZones: Zone[] | null;
};

// ---------- Helpers ----------

export function sportGroup(sport: string): SportGroup {
  if (/Ride|Velomobile|Handcycle/.test(sport)) return "ride";
  if (/Run/.test(sport)) return "run";
  if (/WeightTraining|Workout|Crossfit|HighIntensity|Yoga|Pilates/.test(sport)) return "strength";
  return "other";
}

export const GROUP_LABEL: Record<SportGroup, string> = {
  ride: "Ride",
  run: "Run",
  strength: "Strength & HIIT",
  other: "Other",
};

export const day = (a: Pick<Activity, "start_date_local">) => a.start_date_local.slice(0, 10);

/** TSS from normalized power and the current FTP (null without power). */
export function tssOf(a: Activity, ftp: number | null): number | null {
  const np = a.metrics?.normalized_power;
  if (!np || !ftp || !a.device_watts) return null;
  return Math.round((a.moving_time * np * np) / (ftp * ftp * 36));
}

/** Training load for the fitness model: Relative Effort, falling back to TSS. */
export const loadOf = (a: Activity, ftp: number | null) => a.suffer_score ?? tssOf(a, ftp) ?? 0;

const one = <T,>(x: T | T[] | null): T | null => (Array.isArray(x) ? (x[0] ?? null) : x);

const BASE_COLS =
  "id,name,sport_type,start_date,start_date_local,distance,moving_time,elapsed_time,total_elevation_gain," +
  "average_speed,average_heartrate,max_heartrate,average_watts,weighted_average_watts,device_watts,suffer_score,trainer";
const METRIC_COLS = "normalized_power,hr_zone_seconds,power_zone_seconds,efficiency_factor,decoupling";


type Row = Omit<Activity, "metrics"> & { activity_metrics: Metrics | Metrics[] | null };
const toActivity = ({ activity_metrics, ...rest }: Row): Activity => ({ ...rest, metrics: one(activity_metrics) });

// ---------- Base queries (deduplicated per request) ----------

export const getProfile = cache(async (): Promise<Profile> => {
  const row = check(await db().from("athlete").select("*").limit(1).maybeSingle()) as {
    firstname: string;
    lastname: string;
    weight: number | null;
    strava_ftp: number | null;
    ftp_override: number | null;
    hr_zones: Zone[] | null;
    power_zones: Zone[] | null;
  } | null;
  return {
    name: row ? `${row.firstname} ${row.lastname}` : "",
    weight: row?.weight ?? null,
    stravaFtp: row?.strava_ftp ?? null,
    ftpOverride: row?.ftp_override ?? null,
    hrZones: row?.hr_zones ?? null,
    powerZones: row?.power_zones ?? null,
  };
});

/** All activities with metrics, newest first. */
export const getActivities = cache(async (): Promise<Activity[]> => {
  const cols = `${BASE_COLS},activity_metrics(${METRIC_COLS},power_curve)`;
  const rows = await selectAll<Row>(() =>
    db().from("activities").select(cols).order("start_date", { ascending: false }).order("id"),
  );
  return rows.map(toActivity);
});

/** FTP in use: your override, then Strava's, then estimated from the last 90 days. */
export const getFtp = cache(async (): Promise<{ ftp: number | null; source: string }> => {
  const profile = await getProfile();
  if (profile.ftpOverride) return { ftp: profile.ftpOverride, source: "set in settings" };
  if (profile.stravaFtp) return { ftp: profile.stravaFtp, source: "from Strava" };
  const since = addDays(today(), -90);
  const recent = (await getActivities()).filter((a) => day(a) >= since);
  const eftp = estimateFtp(bestCurve(recent.map((a) => a.metrics?.power_curve)));
  return { ftp: eftp, source: "estimated (95% of best 20 min, 90 days)" };
});

// ---------- Overview ----------

export type Advice = { tone: "good" | "warn" | "info"; title: string; text: string };

export function formZone(form: number) {
  if (form > 25) return { label: "Transition", tone: "info" as const };
  if (form > 5) return { label: "Fresh", tone: "good" as const };
  if (form > -10) return { label: "Neutral", tone: "info" as const };
  if (form > -30) return { label: "Optimal training", tone: "good" as const };
  return { label: "High fatigue", tone: "warn" as const };
}

function buildAdvice(series: FitnessPoint[], lowShare: number | null, sinceHard: number | null): Advice[] {
  const now = series.at(-1);
  if (!now) return [];
  const weekAgo = series.at(-8) ?? series[0];
  const ramp = now.fitness - weekAgo.fitness;
  const advice: Advice[] = [];

  const f = now.form;
  if (f < -30) {
    advice.push({
      tone: "warn",
      title: "Recover today",
      text: "Fatigue is well above your fitness. Take a rest day or a very easy 30–45 min in zone 1 before the next hard session.",
    });
  } else if (f < -10) {
    advice.push({
      tone: "good",
      title: "You're building fitness",
      text:
        sinceHard !== null && sinceHard < 2
          ? "You trained hard recently. Make the next session easy endurance (zone 2) and save intervals for when form rises above −10."
          : "Productive load. One key session is fine, but keep everything else easy.",
    });
  } else if (f <= 5) {
    advice.push({
      tone: "info",
      title: "Ready for a key session",
      text: "Form is neutral. Good day for quality, e.g. 3×10 min at threshold on the bike or 5×1000 m on the run.",
    });
  } else if (f <= 25) {
    advice.push({
      tone: "good",
      title: "You're fresh",
      text: "Great timing for a test or a hard effort: a 20-minute power test, a fast 5k, or a long ride with climbing.",
    });
  } else {
    advice.push({
      tone: "info",
      title: "Fitness is slipping",
      text: "You've been resting a lot. Build volume back gradually, about +10 % load per week.",
    });
  }

  if (ramp > 7) {
    advice.push({
      tone: "warn",
      title: `Fitness rising fast (+${ramp.toFixed(1)}/week)`,
      text: "Ramps above ~5–7 per week raise injury and illness risk. Consider an easier week soon.",
    });
  }
  if (lowShare !== null && lowShare < 0.7) {
    advice.push({
      tone: "info",
      title: `${Math.round(lowShare * 100)} % of heart-rate time in zone 1–2`,
      text: "Most endurance athletes improve best with ~80 % easy time. Try slowing your easy runs and rides down.",
    });
  }
  return advice;
}

export async function getOverview() {
  const [acts, { ftp }] = await Promise.all([getActivities(), getFtp()]);
  const t = today();
  const series = fitnessSeries(
    acts.map((a) => ({ date: day(a), load: loadOf(a, ftp) })),
    t,
  );

  // Weekly totals, last 12 weeks, oldest first
  const thisWeek = weekStart(t);
  const weeks = Array.from({ length: 12 }, (_, i) => addDays(thisWeek, -7 * (11 - i)));
  const weekly = weeks.map((start) => {
    const end = addDays(start, 7);
    const inWeek = acts.filter((a) => day(a) >= start && day(a) < end);
    const hoursBy = (g: SportGroup) =>
      inWeek.filter((a) => sportGroup(a.sport_type) === g).reduce((s, a) => s + a.moving_time, 0) / 3600;
    return {
      week: start,
      ride: +hoursBy("ride").toFixed(2),
      run: +hoursBy("run").toFixed(2),
      strength: +hoursBy("strength").toFixed(2),
      other: +hoursBy("other").toFixed(2),
      load: inWeek.reduce((s, a) => s + loadOf(a, ftp), 0),
      time: inWeek.reduce((s, a) => s + a.moving_time, 0),
      distance: inWeek.reduce((s, a) => s + (a.distance ?? 0), 0),
      count: inWeek.length,
    };
  });
  const current = weekly.at(-1)!;
  const prev4 = weekly.slice(-5, -1);
  const avg = (k: "load" | "time" | "distance" | "count") => prev4.reduce((s, w) => s + w[k], 0) / prev4.length;

  // Heart-rate intensity distribution, last 28 days
  const since28 = addDays(t, -28);
  const zoneTotals: number[] = [];
  for (const a of acts) {
    if (day(a) < since28) continue;
    a.metrics?.hr_zone_seconds?.forEach((s, i) => (zoneTotals[i] = (zoneTotals[i] ?? 0) + s));
  }
  const zoneSum = zoneTotals.reduce((s, x) => s + x, 0);
  const lowShare = zoneSum ? ((zoneTotals[0] ?? 0) + (zoneTotals[1] ?? 0)) / zoneSum : null;

  const lastHard = acts.find((a) => (a.suffer_score ?? 0) >= 45 || (tssOf(a, ftp) ?? 0) >= 70);
  const sinceHard = lastHard ? daysBetween(day(lastHard), t) : null;

  // 7-day projection if you rest (an estimate, drawn dashed)
  const last = series.at(-1);
  const chart: Array<{ date: string; fitness?: number; fatigue?: number; fitnessRest?: number; fatigueRest?: number }> =
    series.slice(-120).map((p) => ({ date: p.date, fitness: p.fitness, fatigue: p.fatigue }));
  if (last) {
    chart[chart.length - 1] = { ...chart[chart.length - 1], fitnessRest: last.fitness, fatigueRest: last.fatigue };
    let ctl = last.fitness;
    let atl = last.fatigue;
    for (let i = 1; i <= 7; i++) {
      ctl -= ctl / 42;
      atl -= atl / 7;
      chart.push({ date: addDays(t, i), fitnessRest: +ctl.toFixed(1), fatigueRest: +atl.toFixed(1) });
    }
  }

  const latest = acts[0];
  const justFinished =
    latest && Date.now() - new Date(latest.start_date).getTime() - latest.elapsed_time * 1000 < 12 * 3600 * 1000
      ? latest
      : null;

  return {
    now: last ?? null,
    weekAgo: series.at(-8) ?? null,
    series: series.slice(-180),
    chart,
    suggestion: last ? suggest(acts, last.form, sinceHard, t) : null,
    justFinished,
    weekly,
    thisWeek: current,
    avg4: { load: avg("load"), time: avg("time"), distance: avg("distance"), count: avg("count") },
    zoneTotals,
    advice: buildAdvice(series, lowShare, sinceHard),
    recent: acts.slice(0, 5),
    ftp,
  };
}

// ---------- Power ----------

export async function getPowerData() {
  const [acts, profile, ftpInfo] = await Promise.all([getActivities(), getProfile(), getFtp()]);
  const withPower = acts.filter((a) => a.metrics?.power_curve && a.device_watts);
  const t = today();
  const between = (from: number, to: number) =>
    withPower.filter((a) => day(a) > addDays(t, -from) && day(a) <= addDays(t, -to));

  const allTime = bestCurve(withPower.map((a) => a.metrics!.power_curve));
  const last90 = bestCurve(between(90, 0).map((a) => a.metrics!.power_curve));
  const prev90 = bestCurve(between(180, 90).map((a) => a.metrics!.power_curve));
  const last28 = bestCurve(between(28, 0).map((a) => a.metrics!.power_curve));

  const curve = CURVE_DURATIONS.filter((d) => allTime[d]).map((d) => ({
    seconds: d,
    allTime: allTime[d] ?? null,
    last90: last90[d] ?? null,
    prev90: prev90[d] ?? null,
    last28: last28[d] ?? null,
  }));

  // Monthly bests for key durations, last 12 months
  const months = Array.from({ length: 12 }, (_, i) => {
    const d = new Date(`${monthStart(t)}T00:00:00Z`);
    d.setUTCMonth(d.getUTCMonth() - (11 - i));
    return d.toISOString().slice(0, 7);
  });
  const monthly = months.map((m) => {
    const best = bestCurve(withPower.filter((a) => day(a).startsWith(m)).map((a) => a.metrics!.power_curve));
    return { month: m, p1m: best["60"] ?? null, p5m: best["300"] ?? null, p20m: best["1200"] ?? null };
  });

  // Which activity holds each 90-day best
  const holder = (d: number) =>
    between(90, 0).reduce<Activity | null>(
      (best, a) => ((a.metrics!.power_curve![d] ?? 0) > (best?.metrics!.power_curve![d] ?? 0) ? a : best),
      null,
    );
  const keyEfforts = [5, 60, 300, 1200, 3600]
    .filter((d) => last90[d])
    .map((d) => ({ seconds: d, watts: last90[d], activity: holder(d) }));

  return {
    curve,
    monthly,
    keyEfforts,
    eftp: estimateFtp(last90) ?? estimateFtp(allTime),
    ftp: ftpInfo,
    weight: profile.weight,
    powerZones: profile.powerZones,
    rideCount90: between(90, 0).length,
  };
}

// ---------- Progress ----------

export async function getProgress() {
  const [acts, profile] = await Promise.all([getActivities(), getProfile()]);
  const t = today();
  // Reference HR for "output at a fixed heart rate": top of zone 2, else 145.
  const refHr = profile.hrZones?.[1]?.max && profile.hrZones[1].max > 0 ? profile.hrZones[1].max : 145;
  const since = addDays(t, -365);
  const asc = [...acts].reverse().filter((a) => day(a) >= since && a.moving_time >= 1200);

  const rolling = <T extends { date: string; value: number }>(pts: T[]) =>
    pts.map((p) => {
      const window = pts.filter((q) => q.date <= p.date && q.date > addDays(p.date, -42));
      return { ...p, trend: +(window.reduce((s, q) => s + q.value, 0) / window.length).toFixed(1) };
    });

  const runs = rolling(
    asc
      .filter((a) => sportGroup(a.sport_type) === "run" && a.metrics?.efficiency_factor && a.sport_type !== "TrailRun")
      .map((a) => ({
        date: day(a),
        name: a.name,
        // EF is metres/min per bpm → seconds per km at the reference HR
        value: +((1000 / (a.metrics!.efficiency_factor! * refHr)) * 60).toFixed(1),
      })),
  );
  const rides = rolling(
    asc
      .filter((a) => sportGroup(a.sport_type) === "ride" && a.device_watts && a.metrics?.efficiency_factor)
      .map((a) => ({ date: day(a), name: a.name, value: Math.round(a.metrics!.efficiency_factor! * refHr) })),
  );

  const months = Array.from({ length: 12 }, (_, i) => {
    const d = new Date(`${monthStart(t)}T00:00:00Z`);
    d.setUTCMonth(d.getUTCMonth() - (11 - i));
    return d.toISOString().slice(0, 7);
  });
  const monthly = months.map((m) => {
    const inMonth = acts.filter((a) => day(a).startsWith(m));
    const h = (g: SportGroup) =>
      +(inMonth.filter((a) => sportGroup(a.sport_type) === g).reduce((s, a) => s + a.moving_time, 0) / 3600).toFixed(1);
    return { month: m, ride: h("ride"), run: h("run"), strength: h("strength"), other: h("other") };
  });

  const decoupling = acts
    .filter((a) => a.metrics?.decoupling != null && a.moving_time >= 3600 && sportGroup(a.sport_type) !== "strength")
    .slice(0, 10)
    .map((a) => ({ id: a.id, name: a.name, date: a.start_date_local, sport: a.sport_type, value: a.metrics!.decoupling! }));

  return { refHr, runs, rides, monthly, decoupling };
}

// ---------- Goals ----------

export type Goal = {
  id: string;
  title: string;
  kind: "volume" | "power_best" | "ftp" | "fitness";
  sport: "run" | "ride" | "all" | null;
  measure: "distance" | "time" | "sessions" | null;
  period: "week" | "month" | "year" | null;
  duration_s: number | null;
  target: number;
  deadline: string | null;
  created_at: string;
};

export type GoalProgress = Goal & {
  current: number;
  unit: string;
  pct: number;
  expectedPct: number | null;
  note: string;
  /** Short "distance left" text for the signpost arm */
  left: string;
};

export async function getGoals(): Promise<GoalProgress[]> {
  const goals = check(await db().from("goals").select("*").order("created_at")) as Goal[];
  if (!goals.length) return [];
  const [acts, power, overview] = await Promise.all([getActivities(), getPowerData(), getOverview()]);
  const t = today();

  return goals.map((g) => {
    let current = 0;
    let unit = "";
    let expectedPct: number | null = null;
    let note = "";
    if (g.kind === "volume") {
      const start = g.period === "week" ? weekStart(t) : g.period === "month" ? monthStart(t) : yearStart(t);
      const end = g.period === "week" ? addDays(start, 7) : g.period === "month" ? addDays(monthStart(addDays(start, 32)), 0) : `${Number(start.slice(0, 4)) + 1}-01-01`;
      const inPeriod = acts.filter(
        (a) => day(a) >= start && (g.sport === "all" || sportGroup(a.sport_type) === g.sport),
      );
      if (g.measure === "distance") {
        current = inPeriod.reduce((s, a) => s + a.distance, 0) / 1000;
        unit = "km";
      } else if (g.measure === "time") {
        current = inPeriod.reduce((s, a) => s + a.moving_time, 0) / 3600;
        unit = "h";
      } else {
        current = inPeriod.length;
        unit = "sessions";
      }
      expectedPct = Math.min(100, ((daysBetween(start, t) + 1) / daysBetween(start, end)) * 100);
      note = `This ${g.period}`;
    } else if (g.kind === "power_best") {
      const d = String(g.duration_s);
      current = power.curve.find((c) => String(c.seconds) === d)?.last90 ?? 0;
      unit = "W";
      note = "Best in last 90 days";
    } else if (g.kind === "ftp") {
      current = power.ftp.ftp ?? 0;
      unit = "W";
      note = `FTP ${power.ftp.source}`;
    } else if (g.kind === "fitness") {
      current = overview.now?.fitness ?? 0;
      unit = "";
      note = "Fitness (42-day load)";
    }
    if (g.deadline && g.kind !== "volume") {
      const total = daysBetween(g.created_at.slice(0, 10), g.deadline);
      const gone = daysBetween(g.created_at.slice(0, 10), t);
      note += ` · ${Math.max(0, total - gone)} days left`;
    }
    const remaining = Math.max(0, g.target - current);
    const fmtLeft = remaining >= 10 ? Math.round(remaining) : Math.round(remaining * 10) / 10;
    const left =
      current >= g.target
        ? "Reached"
        : g.kind === "volume"
          ? `${fmtLeft} ${unit} left this ${g.period}`
          : `${fmtLeft}${unit ? ` ${unit}` : ""} to go`;
    return {
      ...g,
      left,
      current: Math.round(current * 10) / 10,
      unit,
      pct: Math.min(100, (current / g.target) * 100),
      expectedPct,
      note,
    };
  });
}

// ---------- Activities ----------

export async function getActivityList(group: SportGroup | null) {
  const acts = await getActivities();
  return group ? acts.filter((a) => sportGroup(a.sport_type) === group) : acts;
}

export type Streams = {
  time?: number[];
  heartrate?: number[];
  watts?: number[];
  velocity?: number[];
  altitude?: number[];
  cadence?: number[];
  distance?: number[];
};

export type Lap = {
  name: string;
  elapsed_time: number;
  moving_time: number;
  distance: number;
  average_speed: number;
  average_heartrate: number | null;
  average_watts: number | null;
};

export async function getActivityDetail(id: number) {
  const row = check(
    await db()
      .from("activities")
      .select(`${BASE_COLS},description,calories,laps,average_cadence,max_watts,kilojoules,activity_metrics(${METRIC_COLS},power_curve),activity_streams(data),notes(feeling,text)`)
      .eq("id", id)
      .maybeSingle(),
  ) as
    | (Row & {
        description: string | null;
        calories: number | null;
        laps: Lap[] | null;
        average_cadence: number | null;
        max_watts: number | null;
        kilojoules: number | null;
        activity_streams: { data: Streams } | { data: Streams }[] | null;
        notes: { feeling: number | null; text: string | null } | { feeling: number | null; text: string | null }[] | null;
      })
    | null;
  if (!row) return null;
  const { activity_streams, notes, description, calories, laps, average_cadence, max_watts, kilojoules, ...rest } = row;
  const activity = toActivity(rest as Row);
  const [{ ftp }, profile, power] = await Promise.all([getFtp(), getProfile(), getPowerData()]);
  const best90 = Object.fromEntries(power.curve.map((c) => [c.seconds, c.last90]));
  return {
    activity,
    extra: { description, calories, laps: laps ?? [], average_cadence, max_watts, kilojoules },
    streams: one(activity_streams)?.data ?? null,
    note: one(notes),
    ftp,
    tss: tssOf(activity, ftp),
    profile,
    best90,
  };
}

export async function getSyncStatus() {
  const [count, pending, latest] = await Promise.all([
    db().from("activities").select("id", { count: "exact", head: true }),
    db().from("activities").select("id", { count: "exact", head: true }).eq("processed", false),
    db().from("activities").select("updated_at,start_date_local,name").order("updated_at", { ascending: false }).limit(1),
  ]);
  return {
    total: count.count ?? 0,
    pending: pending.count ?? 0,
    lastUpdate: (latest.data?.[0] as { updated_at: string } | undefined)?.updated_at ?? null,
  };
}
