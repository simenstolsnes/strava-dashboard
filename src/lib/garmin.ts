import { db, check } from "./db";
import { addDays, today } from "./time";

/**
 * Garmin Connect Personal API (one user, read-only).
 * The API key from Garmin Connect is exchanged for a 24 h bearer token; there is no refresh token,
 * so a new one is requested when the cached one is close to expiry.
 */

const BASE = "https://personal.connectapi.garmin.com";
const TOKEN_PATH = "/personalapitoken-service/personal-api/personal-api-key/token";

/** Sleep summaries reject long ranges (100 days fails), so every range is fetched in chunks. */
const CHUNK_DAYS = 28;

export const garminConfigured = () => Boolean(process.env.GARMIN_PERSONAL_API_KEY);

let cached: { token: string; exp: number } | null = null;

async function token(): Promise<string> {
  if (cached && cached.exp - 3600 > Date.now() / 1000) return cached.token;
  const key = process.env.GARMIN_PERSONAL_API_KEY;
  if (!key) throw new Error("Missing environment variable GARMIN_PERSONAL_API_KEY");
  const res = await fetch(BASE + TOKEN_PATH, { method: "POST", headers: { Authorization: `ApiKey ${key}` }, cache: "no-store" });
  // Never echo the body: on success it is the token itself.
  if (!res.ok) throw new Error(`Garmin token request failed (${res.status}). Check that the API key is valid and not expired.`);
  const raw = (await res.text()).trim();
  let t = raw;
  try {
    t = (JSON.parse(raw) as { access_token?: string }).access_token ?? raw;
  } catch {
    // plain JWT, as the API currently returns
  }
  let exp = Date.now() / 1000 + 23 * 3600;
  try {
    exp = JSON.parse(Buffer.from(t.split(".")[1], "base64url").toString()).exp ?? exp;
  } catch {
    // not a JWT we can read; assume ~24 h
  }
  cached = { token: t, exp };
  return t;
}

export async function garminGet<T>(path: string): Promise<T> {
  const res = await fetch(BASE + path, { headers: { Authorization: `Bearer ${await token()}` }, cache: "no-store" });
  if (res.status === 401) cached = null;
  if (!res.ok) throw new Error(`Garmin GET ${path.split("?")[0]} failed (${res.status})`);
  const text = await res.text();
  return (text ? JSON.parse(text) : null) as T;
}

// ---- Payloads (only the fields we use) ----

type SleepSummary = {
  calendarDate: string;
  sleepTimeSeconds: number | null;
  deepSleepSeconds: number | null;
  lightSleepSeconds: number | null;
  remSleepSeconds: number | null;
  awakeSleepSeconds: number | null;
  sleepStartTimestampLocal: number | null;
  sleepEndTimestampLocal: number | null;
  avgSleepStress?: number | null;
  sleepScores?: { overall?: { value?: number; qualifierKey?: string } };
};

type DailySummary = {
  calendarDate: string;
  movement?: { steps?: { value?: number; goal?: number } };
  heartRate?: { minValue?: number; maxValue?: number; restingValue?: number };
  stress?: { avgLevel?: number };
  bodyBattery?: { minValue?: number; maxValue?: number; chargedValue?: number; drainedValue?: number };
};

type Vo2Entry = { calendarDate: string; vo2MaxPreciseValue?: number; vo2MaxValue?: number };
type Vo2Day = { generic: Vo2Entry | null; cycling: Vo2Entry | null };

type DailyHeartRate = {
  calendarDate: string;
  restingHeartRate?: number | null;
  heartRateValues?: [number, number | null][] | null;
};

// "Local" timestamps are wall-clock time encoded as if it were UTC; keep them as wall-clock.
const localTs = (ms: number | null | undefined) => (ms ? new Date(ms).toISOString().slice(0, 19) : null);
const num = (v: number | null | undefined) => (v == null || Number.isNaN(v) ? null : v);
/** Garmin occasionally reports a "resting" HR above the day's minimum (watch worn only during a workout). */
export const plausibleRhr = (rhr: number | null | undefined, min?: number | null) =>
  rhr != null && rhr >= 25 && rhr <= 110 && (min == null || min <= 0 || rhr <= min + 15) ? rhr : null;
const positive = (v: number | null | undefined) => (v == null || v <= 0 ? null : v);

export type GarminDay = {
  date: string;
  sleep_seconds?: number | null;
  deep_seconds?: number | null;
  light_seconds?: number | null;
  rem_seconds?: number | null;
  awake_seconds?: number | null;
  sleep_score?: number | null;
  sleep_quality?: string | null;
  sleep_start_local?: string | null;
  sleep_end_local?: string | null;
  sleep_stress?: number | null;
  resting_hr?: number | null;
  min_hr?: number | null;
  max_hr?: number | null;
  stress_avg?: number | null;
  body_battery_high?: number | null;
  body_battery_low?: number | null;
  body_battery_charged?: number | null;
  body_battery_drained?: number | null;
  steps?: number | null;
  step_goal?: number | null;
  vo2max_run?: number | null;
  vo2max_ride?: number | null;
};

/** Fetch one chunk (≤ 28 days) of daily data and merge it into one row per date. */
async function fetchChunk(start: string, end: string): Promise<GarminDay[]> {
  const [sleep, summaries, vo2] = await Promise.all([
    garminGet<SleepSummary[]>(`/sleep-service/sleep/dailySleepSummariesByDate?startDate=${start}&endDate=${end}`),
    garminGet<{ data?: DailySummary[] }>(`/usersummary-service/v2/dailysummaries?startDate=${start}&endDate=${end}`),
    garminGet<Vo2Day[]>(`/metrics-service/metrics/maxmet/daily/${start}/${end}`),
  ]);

  const days = new Map<string, GarminDay>();
  const day = (date: string) => {
    let d = days.get(date);
    if (!d) days.set(date, (d = { date }));
    return d;
  };

  for (const s of summaries?.data ?? []) {
    Object.assign(day(s.calendarDate), {
      resting_hr: plausibleRhr(s.heartRate?.restingValue, s.heartRate?.minValue),
      min_hr: positive(s.heartRate?.minValue),
      max_hr: positive(s.heartRate?.maxValue),
      // Garmin reports negative stress levels when there wasn't enough data
      stress_avg: num(s.stress?.avgLevel) != null && s.stress!.avgLevel! >= 0 ? s.stress!.avgLevel : null,
      body_battery_high: num(s.bodyBattery?.maxValue),
      body_battery_low: num(s.bodyBattery?.minValue),
      body_battery_charged: num(s.bodyBattery?.chargedValue),
      body_battery_drained: num(s.bodyBattery?.drainedValue),
      steps: num(s.movement?.steps?.value),
      step_goal: num(s.movement?.steps?.goal),
    });
  }

  for (const s of sleep ?? []) {
    if (!s.sleepTimeSeconds) continue; // watch not worn that night
    Object.assign(day(s.calendarDate), {
      sleep_seconds: s.sleepTimeSeconds,
      deep_seconds: num(s.deepSleepSeconds),
      light_seconds: num(s.lightSleepSeconds),
      rem_seconds: num(s.remSleepSeconds),
      awake_seconds: num(s.awakeSleepSeconds),
      sleep_score: num(s.sleepScores?.overall?.value),
      sleep_quality: s.sleepScores?.overall?.qualifierKey ?? null,
      sleep_start_local: localTs(s.sleepStartTimestampLocal),
      sleep_end_local: localTs(s.sleepEndTimestampLocal),
      sleep_stress: positive(s.avgSleepStress),
    });
  }

  for (const v of vo2 ?? []) {
    if (v.generic?.calendarDate) day(v.generic.calendarDate).vo2max_run = v.generic.vo2MaxPreciseValue ?? v.generic.vo2MaxValue ?? null;
    if (v.cycling?.calendarDate) day(v.cycling.calendarDate).vo2max_ride = v.cycling.vo2MaxPreciseValue ?? v.cycling.vo2MaxValue ?? null;
  }

  return [...days.values()].filter((d) => d.date >= start && d.date <= end);
}

/** Store the days in [start, end]; returns how many days had data. */
export async function syncGarminDays(start: string, end: string): Promise<number> {
  let stored = 0;
  for (let from = start; from <= end; from = addDays(from, CHUNK_DAYS)) {
    const to = addDays(from, CHUNK_DAYS - 1) < end ? addDays(from, CHUNK_DAYS - 1) : end;
    const rows = await fetchChunk(from, to);
    if (rows.length) {
      // Every row comes from the same full fetch, so a missing field really is missing at Garmin
      const now = new Date().toISOString();
      check(await db().from("garmin_daily").upsert(rows.map((r) => ({ ...r, updated_at: now }))));
      stored += rows.length;
    }
  }
  return stored;
}

/** Heart rate through one day (about every 2 minutes). */
export async function syncGarminHeartRate(date: string): Promise<boolean> {
  const hr = await garminGet<DailyHeartRate>(`/wellness-service/wellness/dailyHeartRate?date=${date}`);
  const samples = (hr?.heartRateValues ?? []).filter((s): s is [number, number] => s[1] != null && s[1] > 0);
  if (!samples.length) return false;
  check(
    await db().from("garmin_heart_rate").upsert({
      date,
      samples,
      resting_hr: positive(hr.restingHeartRate),
      updated_at: new Date().toISOString(),
    }),
  );
  return true;
}

/** Recent days: re-read the last week (late watch syncs, partial days) and today's/yesterday's heart rate. */
export async function syncGarminRecent(days = 7) {
  const end = today();
  const stored = await syncGarminDays(addDays(end, -(days - 1)), end);
  const [y, t] = await Promise.all([syncGarminHeartRate(addDays(end, -1)), syncGarminHeartRate(end)]);
  return { garminDays: stored, garminHeartRateDays: Number(y) + Number(t) };
}

/** When Garmin data was last stored, or null if never. */
export async function lastGarminSync(): Promise<Date | null> {
  const row = check(
    await db().from("garmin_daily").select("updated_at").order("updated_at", { ascending: false }).limit(1).maybeSingle(),
  ) as { updated_at: string } | null;
  return row ? new Date(row.updated_at) : null;
}
