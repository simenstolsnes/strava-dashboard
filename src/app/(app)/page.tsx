import { requireAthlete } from "@/lib/auth";
import { formZone, getOverview, getProfile } from "@/lib/queries";
import { Card, Empty, PageTitle, Stat, TextLink, ZoneBars } from "@/components/ui";
import { FitnessChart, FormChart, SportHoursChart } from "@/components/charts";
import { hours, km } from "@/lib/format";
import { ActivityRow } from "@/components/activity-row";

export const metadata = { title: "Today" };

export default async function TodayPage() {
  await requireAthlete();
  const [o, profile] = await Promise.all([getOverview(), getProfile()]);

  if (!o.now) {
    return (
      <>
        <PageTitle>Welcome 👋</PageTitle>
        <Empty>
          No activities yet. Your latest workouts are being imported. Refresh in a minute, or run the backfill
          script to import your full history (see README).
        </Empty>
      </>
    );
  }

  const zone = formZone(o.now.form);
  const fitDelta = o.weekAgo ? o.now.fitness - o.weekAgo.fitness : 0;
  const pctOf = (cur: number, avg: number) => (avg ? Math.round((cur / avg) * 100) : null);
  const loadPct = pctOf(o.thisWeek.load, o.avg4.load);

  return (
    <div className="space-y-4">
      <PageTitle sub={new Date().toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", timeZone: "Europe/Oslo" })}>
        Hi {profile.name.split(" ")[0] || "there"}
      </PageTitle>

      <Card>
        <div className="grid grid-cols-3 gap-3">
          <Stat
            label="Fitness"
            value={o.now.fitness.toFixed(0)}
            delta={{ text: `${Math.abs(fitDelta).toFixed(1)} this week`, good: fitDelta === 0 ? null : fitDelta > 0 }}
          />
          <Stat label="Fatigue" value={o.now.fatigue.toFixed(0)} />
          <Stat label="Form" value={o.now.form.toFixed(0)} hint={zone.label} />
        </div>
        <p className="mt-3 text-xs text-muted">
          Estimated from Relative Effort (Strava) with TSS as fallback. Fitness = 42-day load, fatigue = 7-day load.
        </p>
      </Card>

      {o.advice.length > 0 && (
        <Card title="Suggestions" subtitle="Rule-based on your form, ramp rate and intensity mix. Ask Claude for a full plan.">
          <ul className="space-y-3">
            {o.advice.map((a) => (
              <li key={a.title} className="flex gap-3">
                <span
                  className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full"
                  style={{ background: a.tone === "warn" ? "var(--warning)" : a.tone === "good" ? "var(--good)" : "var(--s1)" }}
                  aria-hidden
                />
                <div>
                  <p className="text-sm font-semibold text-ink">
                    {a.tone === "warn" ? "⚠ " : ""}
                    {a.title}
                  </p>
                  <p className="text-sm text-ink-2">{a.text}</p>
                </div>
              </li>
            ))}
          </ul>
        </Card>
      )}

      <Card title="This week" subtitle="Compared with your average of the previous 4 weeks">
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <Stat label="Time" value={hours(o.thisWeek.time)} hint={`avg ${hours(o.avg4.time)}`} />
          <Stat label="Distance" value={km(o.thisWeek.distance, 0)} hint={`avg ${km(o.avg4.distance, 0)}`} />
          <Stat label="Sessions" value={o.thisWeek.count} hint={`avg ${o.avg4.count.toFixed(1)}`} />
          <Stat label="Load" value={Math.round(o.thisWeek.load)} hint={loadPct !== null ? `${loadPct}% of avg` : undefined} />
        </div>
      </Card>

      <Card title="Fitness & fatigue" subtitle="Last 6 months">
        <FitnessChart data={o.series} />
      </Card>

      <Card title="Form" subtitle="Fitness − fatigue. Negative = building, positive = fresh">
        <FormChart data={o.series} />
      </Card>

      <Card title="Weekly hours" subtitle="Last 12 weeks by sport">
        <SportHoursChart data={o.weekly} by="week" />
      </Card>

      {o.zoneTotals.length > 0 && (
        <Card title="Heart-rate zones" subtitle="Last 28 days, all sports">
          <ZoneBars seconds={o.zoneTotals} />
        </Card>
      )}

      <Card title="Latest activities" action={<TextLink href="/activities">All</TextLink>}>
        <ul className="-mx-1 divide-y divide-line">
          {o.recent.map((a) => (
            <ActivityRow key={a.id} a={a} />
          ))}
        </ul>
      </Card>
    </div>
  );
}
