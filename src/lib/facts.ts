import { sportGroup, type Activity } from "./queries";
import { duration, pace } from "./format";

export type Fact = { label: string; value: string; unit?: string };

/** The few numbers that matter for this kind of session. */
export function keyFacts(a: Activity, tss: number | null): Fact[] {
  const g = sportGroup(a.sport_type);
  const hr = a.average_heartrate ? { label: "Avg HR", value: String(Math.round(a.average_heartrate)), unit: "bpm" } : null;
  const re = a.suffer_score != null ? { label: "Rel. effort", value: String(Math.round(a.suffer_score)) } : null;
  const time = { label: "Time", value: duration(a.moving_time) };
  const dist = a.distance > 0 ? { label: "Distance", value: (a.distance / 1000).toFixed(1), unit: "km" } : null;
  const np = a.metrics?.normalized_power;

  let facts: (Fact | null)[];
  if (g === "ride" && a.device_watts && np) {
    facts = [time, { label: "Norm. power", value: String(Math.round(np)), unit: "W" }, tss != null ? { label: "TSS", value: String(tss) } : re, hr];
  } else if (g === "ride") {
    facts = [time, dist, a.total_elevation_gain > 50 ? { label: "Climbing", value: String(Math.round(a.total_elevation_gain)), unit: "m" } : hr, re];
  } else if (g === "run") {
    facts = [dist, { label: "Pace", value: pace(a.average_speed).replace(" /km", ""), unit: "/km" }, hr, re ?? time];
  } else {
    facts = [time, hr, re, a.max_heartrate ? { label: "Max HR", value: String(Math.round(a.max_heartrate)), unit: "bpm" } : null];
  }
  return facts.filter((f): f is Fact => !!f).slice(0, 4);
}
