// Pure training-science calculations. No I/O here, so they're easy to test.

/** Durations (seconds) used for power curves. */
export const CURVE_DURATIONS = [
  1, 5, 10, 15, 30, 60, 120, 180, 300, 480, 600, 900, 1200, 1800, 2700, 3600, 5400, 7200,
];

const MAX_HOLD_GAP = 5; // seconds a value is held across a recording gap

/**
 * Resample an irregular stream onto a 1-second grid.
 * Short gaps hold the last value; longer gaps (pauses) get `gapValue`.
 */
export function resample1Hz(time: number[], values: number[], gapValue: number): number[] {
  if (!time.length || time.length !== values.length) return [];
  const t0 = time[0];
  const out = new Array<number>(time[time.length - 1] - t0 + 1);
  out[0] = values[0] ?? gapValue;
  for (let i = 1; i < time.length; i++) {
    const from = time[i - 1] - t0;
    const to = time[i] - t0;
    const gap = to - from;
    const v = values[i] ?? gapValue;
    for (let s = from + 1; s <= to; s++) out[s] = gap <= MAX_HOLD_GAP || s === to ? v : gapValue;
  }
  return out;
}

/** Best average over each duration (mean-maximal curve). Returns {seconds: value}. */
export function meanMax(values1Hz: number[], durations = CURVE_DURATIONS): Record<string, number> {
  const n = values1Hz.length;
  const prefix = new Float64Array(n + 1);
  for (let i = 0; i < n; i++) prefix[i + 1] = prefix[i] + (Number.isFinite(values1Hz[i]) ? values1Hz[i] : 0);
  const curve: Record<string, number> = {};
  for (const d of durations) {
    if (d > n) break;
    let best = 0;
    for (let i = d; i <= n; i++) {
      const sum = prefix[i] - prefix[i - d];
      if (sum > best) best = sum;
    }
    curve[d] = Math.round(best / d);
  }
  return curve;
}

/** Normalized Power: 30 s rolling average, 4th power mean, 4th root. */
export function normalizedPower(power1Hz: number[]): number | null {
  if (power1Hz.length < 60) return null;
  let windowSum = 0;
  let acc = 0;
  let count = 0;
  for (let i = 0; i < power1Hz.length; i++) {
    windowSum += power1Hz[i];
    if (i >= 30) windowSum -= power1Hz[i - 30];
    if (i >= 29) {
      acc += (windowSum / 30) ** 4;
      count++;
    }
  }
  return Math.round((acc / count) ** 0.25);
}

export function trainingStressScore(np: number, durationSec: number, ftp: number) {
  const intensity = np / ftp;
  return {
    intensity: Math.round(intensity * 100) / 100,
    tss: Math.round(((durationSec * np * intensity) / (ftp * 3600)) * 100),
  };
}

export type Zone = { min: number; max: number };

/** Seconds spent in each zone. Strava marks the top zone's max as -1. */
export function zoneSeconds(values1Hz: number[], zones: Zone[]): number[] {
  const out = zones.map(() => 0);
  for (const v of values1Hz) {
    if (!Number.isFinite(v) || v <= 0) continue;
    let z = zones.findIndex((zone) => zone.max === -1 || v < zone.max);
    if (z === -1) z = zones.length - 1;
    out[z]++;
  }
  return out;
}

function mean(xs: number[]) {
  let s = 0;
  let n = 0;
  for (const x of xs) if (Number.isFinite(x) && x > 0) { s += x; n++; }
  return n ? s / n : NaN;
}

/**
 * Efficiency Factor (output per heartbeat) and aerobic decoupling
 * (how much it drops from first to second half). Lower decoupling = better
 * aerobic endurance. Output is watts for rides, metres/min for runs.
 */
export function efficiency(output1Hz: number[], hr1Hz: number[]) {
  const n = Math.min(output1Hz.length, hr1Hz.length);
  if (n < 600) return null;
  const half = Math.floor(n / 2);
  const ef = (a: number, b: number) => mean(output1Hz.slice(a, b)) / mean(hr1Hz.slice(a, b));
  const whole = ef(0, n);
  const first = ef(0, half);
  const second = ef(half, n);
  if (!Number.isFinite(whole) || !Number.isFinite(first) || !Number.isFinite(second)) return null;
  return {
    ef: Math.round(whole * 1000) / 1000,
    decoupling: Math.round(((first - second) / first) * 1000) / 10,
  };
}

/**
 * Heart-rate recovery (HRRc): the largest drop in heart rate over 60 seconds,
 * starting from a heart rate at or above threshold. Bigger = faster recovery.
 */
export function heartRateRecovery(hr1Hz: number[], threshold: number): { drop: number; from: number } | null {
  let best: { drop: number; from: number } | null = null;
  for (let i = 0; i + 60 < hr1Hz.length; i++) {
    const start = hr1Hz[i];
    const end = hr1Hz[i + 60];
    if (!(start >= threshold) || !Number.isFinite(end)) continue;
    const drop = start - end;
    if (drop > 0 && (!best || drop > best.drop)) best = { drop: Math.round(drop), from: Math.round(start) };
  }
  return best;
}

/** Bucket-average a stream down to at most `maxPoints` points for charts. */
export function downsample(values: number[], maxPoints = 800): number[] {
  if (values.length <= maxPoints) return values.map((v) => (Number.isFinite(v) ? Math.round(v * 10) / 10 : v));
  const size = values.length / maxPoints;
  const out: number[] = [];
  for (let b = 0; b < maxPoints; b++) {
    const slice = values.slice(Math.floor(b * size), Math.floor((b + 1) * size));
    const m = mean(slice);
    out.push(Number.isFinite(m) ? Math.round(m * 10) / 10 : 0);
  }
  return out;
}

export type DayLoad = { date: string; load: number };
export type FitnessPoint = { date: string; fitness: number; fatigue: number; form: number; load: number };

/**
 * Banister-style fitness model (same idea as Strava Fitness & Freshness and
 * TrainingPeaks CTL/ATL/TSB). Fitness = 42-day load average, fatigue = 7-day,
 * form = fitness − fatigue including the day's own sessions, so a hard workout
 * shows up in today's form straight away (like Strava's Fitness & Freshness).
 */
export function fitnessSeries(loads: DayLoad[], untilDate: string): FitnessPoint[] {
  if (!loads.length) return [];
  const byDay = new Map<string, number>();
  for (const { date, load } of loads) byDay.set(date, (byDay.get(date) ?? 0) + load);
  const start = loads.map((l) => l.date).sort()[0];
  const out: FitnessPoint[] = [];
  let ctl = 0;
  let atl = 0;
  for (let d = new Date(`${start}T00:00:00Z`); ; d.setUTCDate(d.getUTCDate() + 1)) {
    const date = d.toISOString().slice(0, 10);
    if (date > untilDate) break;
    const load = byDay.get(date) ?? 0;
    ctl += (load - ctl) / 42;
    atl += (load - atl) / 7;
    out.push({ date, load, fitness: round1(ctl), fatigue: round1(atl), form: round1(ctl - atl) });
  }
  return out;
}

const round1 = (x: number) => Math.round(x * 10) / 10;

/** Estimated FTP from a power curve: 95 % of best 20-minute power. */
export function estimateFtp(curve: Record<string, number>): number | null {
  const p20 = curve["1200"];
  return p20 ? Math.round(p20 * 0.95) : null;
}

/** Combine several power curves into a best-of curve. */
export function bestCurve(curves: Array<Record<string, number> | null | undefined>) {
  const best: Record<string, number> = {};
  for (const c of curves) {
    if (!c) continue;
    for (const [d, w] of Object.entries(c)) if (!best[d] || w > best[d]) best[d] = w;
  }
  return best;
}
