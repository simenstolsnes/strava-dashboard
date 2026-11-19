import Link from "next/link";
import { requireAthlete } from "@/lib/auth";
import { getPowerData } from "@/lib/queries";
import { Card, Empty, PageTitle, Stat } from "@/components/ui";
import { MonthlyPowerChart, PowerCurveChart } from "@/components/charts";
import { curveLabel, shortDate } from "@/lib/format";

export const metadata = { title: "Power" };

export default async function PowerPage() {
  await requireAthlete();
  const p = await getPowerData();

  if (!p.curve.length) {
    return (
      <>
        <PageTitle wide>Power</PageTitle>
        <Empty>No rides with a power meter synced yet. Zwift and trainer rides will show up here.</Empty>
      </>
    );
  }

  const ftp = p.ftp.ftp;
  const best20Prev = p.curve.find((c) => c.seconds === 1200)?.prev90 ?? null;
  const best20 = p.curve.find((c) => c.seconds === 1200)?.last90 ?? null;
  const change = best20 && best20Prev ? best20 - best20Prev : null;

  return (
    <>
      <PageTitle wide sub={`${p.rideCount90} rides with power in the last 90 days`}>Power</PageTitle>
      <div className="max-w-3xl space-y-4">

      <Card>
        <div className="grid grid-cols-3 gap-3">
          <Stat label="FTP" value={ftp ?? "–"} unit="W" hint={p.ftp.source} />
          <Stat
            label="W/kg"
            value={ftp && p.weight ? (ftp / p.weight).toFixed(2) : "–"}
            hint={p.weight ? `at ${p.weight} kg` : "add weight in Strava"}
          />
          <Stat
            label="eFTP (90 d)"
            value={p.eftp ?? "–"}
            unit="W"
            delta={change !== null ? { text: `${Math.abs(change)} W on 20 min vs prior 90 d`, good: change === 0 ? null : change > 0 } : undefined}
          />
        </div>
      </Card>

      <Card title="Power curve" subtitle="Best average power (W) for each duration">
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

      <Card title="Monthly bests" subtitle="Best 1, 5 and 20 min power (W) per month">
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
