import Link from "next/link";
import { requireAthlete } from "@/lib/auth";
import { getPowerData } from "@/lib/queries";
import { Card, Empty, PageTitle, Stat } from "@/components/ui";
import { MonthlyPowerChart, PowerCurveChart } from "@/components/charts";
import { curveLabel, shortDate } from "@/lib/format";

export const metadata = { title: "Power" };

export default async function PowerPage() {
  const me = await requireAthlete();
  const p = await getPowerData(me);

  if (!p.curve.length) {
    return (
      <>
        <PageTitle wide>Power</PageTitle>
        <Empty>No rides with a power meter synced yet. Zwift and trainer rides will show up here.</Empty>
      </>
    );
  }

  const ftp = p.ftp.ftp;
  const eftp = p.eftp;
  const change = eftp?.period === "last 90 days" && p.eftpPrev90 ? eftp.ftp - p.eftpPrev90 : null;
  const pct = (factor: number) => `${+(factor * 100).toFixed(1)} %`;

  return (
    <>
      <PageTitle wide sub={`${p.rideCount90} rides with power in the last 90 days`}>Power</PageTitle>
      <div className="max-w-3xl space-y-4">

      <Card>
        <div className="grid grid-cols-3 gap-3">
          <Stat
            label="FTP"
            value={ftp ?? "–"}
            unit="W"
            hint={p.ftp.source}
            info="Functional Threshold Power: roughly the highest power you can hold for about an hour. It anchors your power zones, Intensity Factor and TSS. Set your own in Settings, otherwise Strava's value or the estimate is used."
          />
          <Stat
            label="W/kg"
            info="FTP divided by body weight (from Strava). What decides climbing speed: about 3 W/kg is a strong amateur, 4+ W/kg very fit, 5+ elite."
            value={ftp && p.weight ? (ftp / p.weight).toFixed(2) : "–"}
            hint={p.weight ? `at ${p.weight} kg` : "add weight in Strava"}
          />
          <Stat
            label={eftp?.period === "all time" ? "eFTP (all time)" : "eFTP (90 d)"}
            info="Estimated FTP from cycling only; runs and other sports never count. Your best 5, 10, 20 and 30 minutes are each multiplied by a factor, and the highest result is used. See the calculation below. The arrow compares with the same estimate for the 90 days before."
            value={eftp?.ftp ?? "–"}
            unit="W"
            delta={change !== null ? { text: `${Math.abs(change)} W vs prior 90 d`, good: change === 0 ? null : change > 0 } : undefined}
          />
        </div>
      </Card>

      {eftp && (
        <Card
          title="How your eFTP is estimated"
          subtitle={`Best ride efforts, ${eftp.period}. The highest estimate is used.`}
          info="Only rides with a power meter count. The factors are midpoints of the usual ranges: 5 min 75–80 %, 10 min 90–92 %, 20 min 95 % (the Coggan/Allen standard), 30 min 98–100 %. Best efforts are rarely all-out tests, so your real FTP may differ."
        >
          <p className="mb-3 text-sm text-ink-2">
            <span className="num font-semibold text-ink">{eftp.ftp} W</span> = {pct(eftp.factor)} of your best {eftp.seconds / 60} min (
            {eftp.watts} W), from{" "}
            <Link href={`/activities/${eftp.ride.id}`} className="font-medium text-teal hover:underline">
              {eftp.ride.name}
            </Link>
            , {shortDate(eftp.ride.date)}.
            {eftp.seconds === 300 &&
              " This is the least certain basis: 5 minutes mostly measures VO2max, not threshold. A hard 20 or 30 minutes gives a better estimate."}
          </p>
          <table className="num w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-muted">
                <th className="pb-2 font-normal">Duration</th>
                <th className="pb-2 font-normal">Best power</th>
                <th className="pb-2 font-normal">Factor</th>
                <th className="pb-2 font-normal">FTP estimate</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {eftp.candidates.map((c) => {
                const used = c.seconds === eftp.seconds;
                return (
                  <tr key={c.seconds} className={used ? "font-semibold text-ink" : "text-ink-2"}>
                    <td className="py-2">{c.seconds / 60} min</td>
                    <td className="py-2">{c.watts} W</td>
                    <td className="py-2">{pct(c.factor)}</td>
                    <td className="py-2">
                      {c.ftp} W{used && <span className="ml-2 text-xs text-teal">used</span>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </Card>
      )}

      <Card
        title="Power curve"
        subtitle="Best average power (W) for each duration. Tap a point to see which ride set it."
        info="For every duration from 1 second to 2 hours, the highest average power you held in any single ride. Short durations show sprint power, 5 minutes your VO2max, 20–60 minutes your threshold. Only rides with a power meter (including Zwift and the trainer) count."
      >
        <PowerCurveChart data={p.curve} weight={p.weight} />
      </Card>

      <Card title="Best efforts, last 90 days">
        <table className="num w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-muted">
              <th className="pb-2 font-normal">Duration</th>
              <th className="pb-2 font-normal">Power</th>
              <th className="pb-2 font-normal">W/kg</th>
              <th className="w-1/2 pb-2 font-normal">Activity</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {p.keyEfforts.map((e) => (
              <tr key={e.seconds}>
                <td className="py-2 align-top text-ink-2">{curveLabel(e.seconds)}</td>
                <td className="py-2 align-top font-semibold text-ink">{e.watts} W</td>
                <td className="py-2 align-top text-ink-2">{p.weight ? (e.watts / p.weight).toFixed(2) : "–"}</td>
                <td className="py-2 align-top">
                  {e.activity && (
                    <Link href={`/activities/${e.activity.id}`} className="line-clamp-2 font-medium text-teal hover:underline">
                      {e.activity.name}
                    </Link>
                  )}
                  {e.activity && <span className="text-xs text-muted">{shortDate(e.activity.start_date_local)}</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      <Card
        title="Monthly bests"
        subtitle="Best 1, 5 and 20 min power (W) per month. Tap a month to see the rides."
        info="Your best 1-, 5- and 20-minute power for each month. A month without hard efforts dips even if you are fit, so look at peaks across a few months."
      >
        <MonthlyPowerChart data={p.monthly} />
      </Card>

      {p.powerZones && ftp && (
        <Card title="Your power zones" subtitle="From Strava">
          <ul className="num space-y-1 text-sm">
            {p.powerZones.map((z, i) => (
              <li key={i} className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-sm" style={{ background: `var(--z${i + 1})` }} />
                <span className="w-16 text-ink-2">Zone {i + 1}</span>
                <span className="text-ink">{z.max === -1 ? `${z.min}+ W` : `${z.min}–${z.max} W`}</span>
              </li>
            ))}
          </ul>
        </Card>
      )}
      </div>
    </>
  );
}
