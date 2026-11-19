export function duration(seconds: number | null | undefined): string {
  if (!seconds) return "0:00";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  const pad = (n: number) => String(n).padStart(2, "0");
  return h ? `${h}:${pad(m)}:${pad(s)}` : `${m}:${pad(s)}`;
}

export function hours(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.round((seconds % 3600) / 60);
  return h ? `${h}h ${String(m).padStart(2, "0")}m` : `${m} min`;
}

export const km = (m: number | null | undefined, digits = 1) => `${((m ?? 0) / 1000).toFixed(digits)} km`;

/** m/s → "5:12 /km" */
export function pace(speed: number | null | undefined): string {
  if (!speed) return "–";
  const secPerKm = 1000 / speed;
  const m = Math.floor(secPerKm / 60);
  const s = Math.round(secPerKm % 60);
  return s === 60 ? `${m + 1}:00 /km` : `${m}:${String(s).padStart(2, "0")} /km`;
}

export const kmh = (speed: number | null | undefined) => `${((speed ?? 0) * 3.6).toFixed(1)} km/h`;

export function curveLabel(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  if (seconds < 3600) return `${seconds / 60}m`;
  return `${seconds / 3600}h`;
}

// Activity times are stored as local wall-clock time (start_date_local), so
// format them as UTC to show exactly what the athlete's watch said.
const asUtc = (local: string) => new Date(/[zZ]|[+-]\d\d:?\d\d$/.test(local) ? local : `${local}Z`);

export function shortDate(local: string): string {
  return asUtc(local).toLocaleDateString("en-GB", { day: "numeric", month: "short", timeZone: "UTC" });
}

export function longDate(local: string): string {
  return asUtc(local).toLocaleString("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "UTC",
  });
}
