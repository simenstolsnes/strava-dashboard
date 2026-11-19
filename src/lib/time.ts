export const TIME_ZONE = "Europe/Oslo";

/** Today's date (YYYY-MM-DD) in the athlete's time zone. */
export function today(): string {
  return new Intl.DateTimeFormat("sv-SE", { timeZone: TIME_ZONE }).format(new Date());
}

export function addDays(date: string, days: number): string {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/** Monday of the week containing `date`. */
export function weekStart(date: string): string {
  const dow = (new Date(`${date}T00:00:00Z`).getUTCDay() + 6) % 7;
  return addDays(date, -dow);
}

export const monthStart = (date: string) => `${date.slice(0, 7)}-01`;
export const yearStart = (date: string) => `${date.slice(0, 4)}-01-01`;

export function daysBetween(a: string, b: string) {
  return Math.round((new Date(`${b}T00:00:00Z`).getTime() - new Date(`${a}T00:00:00Z`).getTime()) / 86400000);
}
