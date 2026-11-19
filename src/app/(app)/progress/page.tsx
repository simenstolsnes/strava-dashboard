import Link from "next/link";
import { requireAthlete } from "@/lib/auth";
import { getProgress } from "@/lib/queries";
import { Card, Empty, PageTitle } from "@/components/ui";
import { SportHoursChart, TrendChart } from "@/components/charts";
import { shortDate } from "@/lib/format";

export const metadata = { title: "Progress" };

export default async function ProgressPage() {
  await requireAthlete();
  const p = await getProgress();

  return (
    <div className="space-y-4">
      <PageTitle sub="Is your aerobic engine improving? Last 12 months.">Progress</PageTitle>

      <Card
        title={`Running pace at ${p.refHr} bpm`}
        subtitle="Estimated from each run's pace per heartbeat (road runs ≥ 20 min). Lower = fitter."
      >
        {p.runs.length >= 3 ? <TrendChart data={p.runs} label="Pace" kind="pace" /> : <Empty>Not enough runs with heart rate yet.</Empty>}
      </Card>

      <Card
        title={`Cycling power at ${p.refHr} bpm`}
        subtitle="Estimated from each ride's power per heartbeat (rides with power ≥ 20 min). Higher = fitter."
      >
        {p.rides.length >= 3 ? <TrendChart data={p.rides} label="Power" kind="watts" /> : <Empty>Not enough rides with power and heart rate yet.</Empty>}
      </Card>

      <Card title="Monthly hours" subtitle="By sport">
        <SportHoursChart data={p.monthly} by="month" />
      </Card>

      <Card
        title="Aerobic decoupling"
        subtitle="Drift in output per heartbeat from first to second half of sessions over 1 h. Under 5 % on steady sessions = solid aerobic base."
      >
        {p.decoupling.length ? (
          <ul className="divide-y divide-line">
            {p.decoupling.map((d) => (
              <li key={d.id}>
                <Link href={`/activities/${d.id}`} className="flex items-center gap-3 py-2 text-sm">
                  <span className="min-w-0 flex-1 truncate text-ink">{d.name}</span>
                  <span className="text-xs text-muted">{shortDate(d.date)}</span>
                  <span className="tabular w-16 text-right font-semibold text-ink">
                    {d.value > 0 ? "+" : ""}
                    {d.value.toFixed(1)} %
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <Empty>No sessions over an hour with heart rate yet.</Empty>
        )}
        <p className="mt-2 text-xs text-muted">Only meaningful for steady efforts. Intervals and hilly routes will show high values.</p>
      </Card>
    </div>
  );
}
