import { after } from "next/server";
import { db, check, selectAll } from "./db";
import { garminConfigured, lastGarminSync, plausibleRhr, syncGarminRecent, type GarminDay } from "./garmin";
import { addDays, today, TIME_ZONE } from "./time";

/** One day on the trend charts. Sleep in hours; Garmin's values as reported. */
export type RecoveryDay = {
  date: string;
  sleep: number | null;
  deep: number | null;
  light: number | null;
  rem: number | null;
  awake: number | null;
  score: number | null;
  rhr: number | null;
  stress: number | null;
  bbHigh: number | null;
  bbLow: number | null;
  steps: number | null;
  vo2Run: number | null;
  vo2Ride: number | null;
};

/** Oslo's UTC offset at an instant (handles summer time). */
function osloOffsetMs(t: number) {
  const wall = new Date(t).toLocaleString("sv-SE", { timeZone: TIME_ZONE }).replace(" ", "T");
  return Date.parse(`${wall}Z`) - Math.floor(t / 1000) * 1000;
}

const h = (s: number | null | undefined) => (s == null ? null : Math.round((s / 3600) * 100) / 100);

function median(xs: number[]) {
  if (!xs.length) return null;
  const s = [...xs].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

/**
 * Garmin has no webhooks. When the data is more than 20 minutes old, read the last two days
 * before rendering, but never hold the page for more than 4 s: a slower sync finishes in the
 * background and shows on the next visit.
 */
async function refreshIfStale(athleteId: number) {
  const last = await lastGarminSync(athleteId);
  if (last && Date.now() - last.getTime() < 20 * 60 * 1000) return;
  const run = syncGarminRecent(athleteId, 2).catch((e) => console.error("Garmin refresh failed:", e));
  const done = await Promise.race([run.then(() => true), new Promise<boolean>((r) => setTimeout(() => r(false), 4000))]);
  if (!done) after(() => run);
}

export async function getRecovery(athleteId: number, daySel?: string) {
  if (!garminConfigured(athleteId)) return { configured: false as const };
  await refreshIfStale(athleteId);

  const rows: GarminDay[] = ((await selectAll<GarminDay>(() =>
    db().from("garmin_daily").select("*").eq("athlete_id", athleteId).order("date"),
  )) as GarminDay[]).map((r) => ({
    ...r,
    resting_hr: plausibleRhr(r.resting_hr, r.min_hr),
  }));
  const end = today();
  const byDate = new Map(rows.map((r) => [r.date, r]));

  // Continuous calendar from the first stored day so gaps read as gaps
  const days: RecoveryDay[] = [];
  if (rows.length) {
    for (let d = rows[0].date; d <= end; d = addDays(d, 1)) {
      const r = byDate.get(d);
      days.push({
        date: d,
        sleep: h(r?.sleep_seconds),
        deep: h(r?.deep_seconds),
        light: h(r?.light_seconds),
        rem: h(r?.rem_seconds),
        awake: h(r?.awake_seconds),
        score: r?.sleep_score ?? null,
        rhr: r?.resting_hr ?? null,
        stress: r?.stress_avg ?? null,
        bbHigh: r?.body_battery_high ?? null,
        bbLow: r?.body_battery_low ?? null,
        // Today's steps are still counting
        steps: d === end ? null : (r?.steps ?? null),
        vo2Run: r?.vo2max_run ?? null,
        vo2Ride: r?.vo2max_ride ?? null,
      });
    }
  }

  // Last night: the most recent night with sleep, at most 2 days old
  const night = [...rows].reverse().find((r) => r.sleep_seconds && r.date >= addDays(end, -1)) ?? null;
  const prior = rows.filter((r) => r.date < (night?.date ?? end) && r.date >= addDays(night?.date ?? end, -30));
  const sleepNormal = median(prior.map((r) => r.sleep_seconds).filter((x): x is number => !!x));

  // Resting HR: today's (Garmin sets it during the night), compared with the 30 days before
  const latestRhr = [...rows].reverse().find((r) => r.resting_hr) ?? null;
  const rhrNormal = median(
    rows
      .filter((r) => latestRhr && r.date < latestRhr.date && r.date >= addDays(latestRhr.date, -30))
      .map((r) => r.resting_hr)
      .filter((x): x is number => !!x),
  );

  // VO2 max: latest value per sport and the value 90 days before it
  const vo2 = (key: "vo2max_run" | "vo2max_ride") => {
    const set = rows.filter((r) => r[key]);
    const latest = set.at(-1);
    if (!latest) return null;
    const before = [...set].reverse().find((r) => r.date <= addDays(latest.date, -90));
    return { value: latest[key]!, date: latest.date, before: before?.[key] ?? null };
  };

  // Heart rate through one day: yesterday unless a day is picked
  const hrDates = (
    check(await db().from("garmin_heart_rate").select("date").eq("athlete_id", athleteId).order("date", { ascending: false }).limit(60)) as { date: string }[]
  ).map((r) => r.date);
  const yesterday = addDays(end, -1);
  const hrDate =
    daySel && hrDates.includes(daySel) ? daySel : hrDates.includes(yesterday) ? yesterday : (hrDates.find((d) => d < end) ?? hrDates[0] ?? null);
  const hrRow = hrDate
    ? (check(await db().from("garmin_heart_rate").select("*").eq("athlete_id", athleteId).eq("date", hrDate).maybeSingle()) as {
        date: string;
        samples: [number, number][];
        resting_hr: number | null;
      } | null)
    : null;
  // Sleep that ended that morning and sleep that started that evening
  const sleepWindows = hrDate
    ? [byDate.get(hrDate), byDate.get(addDays(hrDate, 1))]
        .filter((r): r is GarminDay => !!r?.sleep_start_local && !!r.sleep_end_local)
        .map((r) => ({ start: r.sleep_start_local!, end: r.sleep_end_local! }))
    : [];
  const hrDay = hrRow
    ? {
        date: hrRow.date,
        resting: hrRow.resting_hr ?? byDate.get(hrRow.date)?.resting_hr ?? null,
        min: byDate.get(hrRow.date)?.min_hr ?? null,
        max: byDate.get(hrRow.date)?.max_hr ?? null,
        // Wall-clock time in Oslo, encoded as UTC like the sleep times, so the axis reads as on the watch
        samples: hrRow.samples.map(([t, bpm]) => [t + osloOffsetMs(t), bpm] as [number, number]),
        sleep: sleepWindows.map((w) => ({ start: Date.parse(`${w.start}Z`), end: Date.parse(`${w.end}Z`) })),
        dayStart: Date.parse(`${hrRow.date}T00:00:00Z`),
        // A finished day whose data stops hours early: the watch was off or hasn't synced
        complete: hrRow.date < end,
        prev: hrDates.find((d) => d < hrRow.date) ?? null,
        next: [...hrDates].reverse().find((d) => d > hrRow.date) ?? null,
      }
    : null;

  return {
    configured: true as const,
    days,
    night,
    sleepNormal,
    rhr: latestRhr ? { value: latestRhr.resting_hr!, date: latestRhr.date, normal: rhrNormal } : null,
    vo2Run: vo2("vo2max_run"),
    vo2Ride: vo2("vo2max_ride"),
    today: byDate.get(end) ?? null,
    hrDay,
    lastSync: (await lastGarminSync(athleteId))?.toISOString() ?? null,
  };
}
