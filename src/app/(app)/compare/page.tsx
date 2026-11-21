import Link from "next/link";
import type { ReactNode } from "react";
import { requireAthlete } from "@/lib/auth";
import { getComparison, isPeriod, PERIODS, type PersonStats } from "@/lib/compare";
import { GROUP_LABEL, type SportGroup } from "@/lib/queries";
import { hmin, hours } from "@/lib/format";
import { Card, Empty, PageTitle, SPORT_COLOR } from "@/components/ui";
import { RaceChart, type RaceRow } from "@/components/compare-charts";

export const metadata = { title: "Compare" };

/** You in shell teal; everyone else in the comparison inks (rust stays reserved for next/now). */
const COLORS = ["var(--teal)", "var(--ink-2)", "var(--post)", "var(--muted)"];

type Entry = { p: PersonStats; color: string };
type Better = "high" | "low" | null;

/** One measure: a bar per person, scaled to the largest; the leader's value set bold. */
function Row({ label, entries, value, text, better = "high", note }: {
  label: string;
  entries: Entry[];
  value: (p: PersonStats) => number | null;
  text: (v: number) => string;
  better?: Better;
  note?: ReactNode;
}) {
  const values = entries.map((e) => value(e.p));
  const present = values.filter((v): v is number => v != null && v > 0);
  if (!present.length) return null;
  const max = Math.max(...present);
  const best = better === "high" ? max : better === "low" ? Math.min(...present) : null;
  const tie = present.filter((v) => v === best).length > 1;
  return (
    <li className="py-3 first:pt-0 last:pb-0">
      <p className="label mb-2">{label}</p>
      <ul className="space-y-1.5">
        {entries.map((e, i) => {
          const v = values[i];
          const lead = v != null && v === best && !tie && present.length > 1;
          return (
            <li key={e.p.athleteId} className="flex items-center gap-3 text-sm">
              <span className="w-16 shrink-0 truncate text-ink-2">{e.p.name}</span>
              <span className="relative h-2.5 min-w-0 flex-1 rounded-sm bg-rock-2" aria-hidden>
                {v != null && v > 0 && (
                  <span
                    className="absolute inset-y-0 left-0 rounded-sm"
                    style={{ width: `${Math.max(2, (v / max) * 100)}%`, background: e.color }}
                  />
                )}
              </span>
              <span className={`num w-24 shrink-0 text-right ${lead ? "font-extrabold text-ink" : "font-semibold text-ink-2"}`}>
                {v != null && v > 0 ? text(v) : "–"}
              </span>
            </li>
          );
        })}
      </ul>
      {note && <p className="mt-1.5 text-xs text-muted">{note}</p>}
    </li>
  );
}

const Rows = ({ children }: { children: ReactNode }) => <ul className="divide-y divide-hairline">{children}</ul>;

const int = (v: number) => Math.round(v).toLocaleString("en-GB");
const kmText = (m: number) => `${(m / 1000).toFixed(m >= 100_000 ? 0 : 1)} km`;

export default async function ComparePage({ searchParams }: PageProps<"/compare">) {
  const me = await requireAthlete();
  const { p } = await searchParams;
  const period = isPeriod(p) ? p : "4w";
  const c = await getComparison(me, period);
  const entries: Entry[] = c.people.map((p, i) => ({ p, color: COLORS[i % COLORS.length] }));
  const names = c.people.map((p) => p.name);

  const chips = (
    <nav className="mb-4 flex flex-wrap gap-2" aria-label="Period">
      {Object.entries(PERIODS).map(([key, { label }]) => (
        <Link
          key={key}
          href={`/compare?p=${key}`}
          aria-current={key === period ? "page" : undefined}
          className={`rounded-full border px-3 py-1.5 text-xs font-semibold ${
            key === period ? "border-teal bg-teal text-white" : "border-line bg-plate text-ink-2 hover:text-ink"
          }`}
        >
          {label}
        </Link>
      ))}
    </nav>
  );

  if (c.people.length < 2) {
    return (
      <>
        <PageTitle wide sub="You against your training partners.">Compare</PageTitle>
        <div className="max-w-3xl">
          <Empty>
            Nobody to compare with yet. A friend shows up here once they have logged in through their personal link and their
            activities are imported.
          </Empty>
        </div>
      </>
    );
  }

  // Running totals, one column per person
  const rows: RaceRow[] = c.people[0].cumulative.map((d, i) => {
    const row: RaceRow = { date: d.date };
    for (const p of c.people) {
      row[`h_${p.athleteId}`] = p.cumulative[i].hours;
      row[`km_${p.athleteId}`] = p.cumulative[i].rideKm;
    }
    return row;
  });
  const anyPower = c.people.some((p) => p.ride.powerRides > 0);
  const anyGarmin = c.people.some((p) => p.garmin);
  const sports: SportGroup[] = ["ride", "run", "strength", "other"];

  return (
    <>
      <PageTitle wide sub={`${names.join(" vs ")} · ${PERIODS[period].label.toLowerCase()}`}>Compare</PageTitle>
      {chips}
      <div className="grid items-start gap-4 lg:grid-cols-2">
        <Card title="Training" subtitle="All sports">
          <Rows>
            <Row label="Time in activity" entries={entries} value={(p) => p.total.time} text={hours} />
            <Row label="Sessions" entries={entries} value={(p) => p.total.sessions} text={int} />
            <Row label="Active days" entries={entries} value={(p) => p.total.activeDays} text={int} />
            <Row label="Training load" entries={entries} value={(p) => p.total.load} text={int} note="Sum of Strava Relative Effort (TSS when there is no heart rate)." />
            <Row label="Calories" entries={entries} value={(p) => p.total.kcal} text={(v) => `${int(v)} kcal`} />
          </Rows>
        </Card>

        <Card title="Who’s ahead" subtitle="Running total through the period">
          <RaceChart rows={rows} racers={entries.map((e) => ({ id: e.p.athleteId, name: e.p.name, color: e.color }))} />
        </Card>

        <Card title="On the bike" subtitle="Rides, indoor and outdoor">
          <Rows>
            <Row label="Distance" entries={entries} value={(p) => p.ride.distance} text={kmText} />
            <Row label="Time on the bike" entries={entries} value={(p) => p.ride.time} text={hours} />
            <Row label="Rides" entries={entries} value={(p) => p.ride.count} text={int} />
            <Row label="Elevation" entries={entries} value={(p) => p.ride.elevation} text={(v) => `${int(v)} m`} />
            <Row label="Average speed" entries={entries} value={(p) => p.ride.speed} text={(v) => `${v.toFixed(1)} km/h`} />
            <Row label="Longest ride" entries={entries} value={(p) => p.ride.longest} text={kmText} />
          </Rows>
        </Card>

        {anyPower && (
          <Card
            title="Power"
            subtitle="Rides with a power meter (incl. Zwift and trainer)"
            info="Average power is the time-weighted average over all power-meter rides in the period. Max power is the highest 1-second power. Best 5 and 20 min are the highest averages held in a single ride. FTP and W/kg are each person's current values."
          >
            <Rows>
              <Row label="Average power" entries={entries} value={(p) => p.ride.avgWatts} text={(v) => `${v} W`} />
              <Row label="Max power" entries={entries} value={(p) => p.ride.maxWatts} text={(v) => `${v} W`} />
              <Row label="Best 5 min" entries={entries} value={(p) => p.ride.best5m} text={(v) => `${v} W`} />
              <Row label="Best 20 min" entries={entries} value={(p) => p.ride.best20m} text={(v) => `${v} W`} />
              <Row label="FTP" entries={entries} value={(p) => p.ftp} text={(v) => `${v} W`} />
              <Row label="W/kg" entries={entries} value={(p) => p.wkg} text={(v) => v.toFixed(2)} note="FTP divided by weight from Strava." />
            </Rows>
          </Card>
        )}

        <Card title="Sport mix" subtitle="Share of time in activity">
          <ul className="space-y-3">
            {entries.map(({ p }) => (
              <li key={p.athleteId}>
                <p className="mb-1 flex justify-between text-sm">
                  <span className="font-semibold text-ink">{p.name}</span>
                  <span className="num text-ink-2">{hours(p.total.time)}</span>
                </p>
                <div className="flex h-3 w-full gap-[2px] overflow-hidden rounded-sm bg-rock-2" role="img" aria-label={`${p.name}: sport mix`}>
                  {sports.map((g) =>
                    p.bySport[g] ? (
                      <div
                        key={g}
                        style={{ width: `${(p.bySport[g] / p.total.time) * 100}%`, background: SPORT_COLOR[g] }}
                        title={`${GROUP_LABEL[g]}: ${hours(p.bySport[g])}`}
                      />
                    ) : null,
                  )}
                </div>
              </li>
            ))}
          </ul>
          <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-ink-2">
            {sports.map((g) => (
              <li key={g} className="flex items-center gap-1.5">
                <span className="inline-block h-2.5 w-2.5 rounded-[2px]" style={{ background: SPORT_COLOR[g] }} />
                {GROUP_LABEL[g]}
              </li>
            ))}
          </ul>
        </Card>

        <Card
          title="Form today"
          subtitle="Right now, whatever the period"
          info="Fitness is a 42-day average of daily training load, fatigue a 7-day one, and form the difference. Each person's load is their own Relative Effort, so this compares how much each of you has trained, not who is faster."
        >
          <Rows>
            <Row label="Fitness" entries={entries} value={(p) => p.now?.fitness ?? null} text={(v) => v.toFixed(0)} />
            <Row label="Fatigue" entries={entries} value={(p) => p.now?.fatigue ?? null} text={(v) => v.toFixed(0)} better={null} />
          </Rows>
          <ul className="mt-3 grid grid-cols-2 gap-3 border-t border-hairline pt-3">
            {entries.map(({ p }) => (
              <li key={p.athleteId}>
                <p className="label">{p.name} · form</p>
                <p className="num mt-1 text-2xl font-extrabold text-ink">
                  {p.now ? `${p.now.form > 0 ? "+" : ""}${p.now.form.toFixed(0)}` : "–"}
                </p>
              </li>
            ))}
          </ul>
        </Card>

        {anyGarmin && (
          <Card title="Recovery" subtitle="Daily averages from Garmin">
            <Rows>
              <Row label="Sleep" entries={entries} value={(p) => p.garmin?.sleep ?? null} text={(v) => hmin(v / 3600)} />
              <Row label="Sleep score" entries={entries} value={(p) => p.garmin?.score ?? null} text={(v) => v.toFixed(0)} />
              <Row label="Resting heart rate" entries={entries} value={(p) => p.garmin?.rhr ?? null} text={(v) => `${v.toFixed(0)} bpm`} better="low" />
              <Row label="Steps" entries={entries} value={(p) => p.garmin?.steps ?? null} text={int} />
              <Row label="VO2 max" entries={entries} value={(p) => p.garmin?.vo2 ?? null} text={(v) => v.toFixed(1)} note="Garmin’s latest estimate (cycling when available)." />
            </Rows>
          </Card>
        )}
      </div>
    </>
  );
}
