import Link from "next/link";
import { requireAthlete } from "@/lib/auth";
import { getGoals, getOverview, getProfile, sportGroup, tssOf } from "@/lib/queries";
import { trailGrade } from "@/lib/guidance";
import { keyFacts } from "@/lib/facts";
import { Card, Empty, GradeMark, PageTitle, Signpost, SportDot, Stat, TextLink, ZoneBars, type Arm } from "@/components/ui";
import { FitnessChart, SportHoursChart } from "@/components/charts";
import { km, longDate } from "@/lib/format";
import { ActivityRow } from "@/components/activity-row";

export const metadata = { title: "Today" };

const hm = (s: number) => `${Math.floor(s / 3600)}:${String(Math.round((s % 3600) / 60)).padStart(2, "0")}`;

export default async function TodayPage() {
  const me = await requireAthlete();
  const [o, profile, goals] = await Promise.all([getOverview(me), getProfile(me), getGoals(me)]);
  const first = profile.name.split(" ")[0] || "there";
  const date = new Date().toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short", timeZone: "Europe/Oslo" });

  if (!o.now) {
    return (
      <>
        <PageTitle wide aside={<p className="pb-1 text-xs text-teal-ink">{date}</p>}>
          Hi {first}
        </PageTitle>
        <Empty>No activities yet. Your latest workouts are being imported; refresh in a minute.</Empty>
      </>
    );
  }

  const baseGrade = trailGrade(o.now.form);
  // Form lags a single hard day; don't call it "a good day for a key session" right after one.
  const grade =
    o.sinceHard === 0
      ? { ...baseGrade, text: "You trained hard today. Let it sink in: recover before the next key session." }
      : o.sinceHard === 1 && o.now.form > -10
        ? { ...baseGrade, text: "Hard session yesterday. Keep today easy; a key session fits again tomorrow." }
        : baseGrade;
  const fitDelta = o.weekAgo ? o.now.fitness - o.weekAgo.fitness : 0;
  // Form advice is carried by the signpost and grade; only the extra flags show here.
  const warnings = o.advice.filter((a) => a.title.startsWith("Fitness rising fast") || a.title.includes("zone 1–2"));

  const arms: Arm[] = [];
  if (o.suggestion) {
    arms.push({
      tone: "next",
      label: "Next",
      title: o.suggestion.title,
      meta: o.suggestion.meta || undefined,
      href: o.suggestion.basis ? `/activities/${o.suggestion.basis.id}` : undefined,
    });
  }
  for (const g of goals.slice(0, 3)) {
    arms.push({ tone: g.pct >= 100 ? "done" : "goal", label: "Goal", title: g.title, meta: g.left, href: "/goals" });
  }
  if (!goals.length) arms.push({ tone: "goal", label: "Goal", title: "Set your first goal", href: "/goals" });

  const jf = o.justFinished;

  return (
    <>
      <PageTitle wide aside={<p className="pb-1 text-xs text-teal-ink">{date}</p>}>
        Hi {first}
      </PageTitle>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:items-start">
        {/* Rail: what to do and how you stand */}
        <div className="space-y-4 lg:sticky lg:top-16">
          {jf && (
            <Link href={`/activities/${jf.id}`} className="block rounded-[10px] border-2 border-rust bg-plate p-4">
              <div className="flex items-center gap-2">
                <SportDot group={sportGroup(jf.sport_type)} />
                <p className="label" style={{ color: "var(--rust)" }}>
                  Just finished
                </p>
                <p className="ml-auto text-xs text-muted">{longDate(jf.start_date_local).split(",").slice(-1)[0]}</p>
              </div>
              <p className="mt-1.5 truncate text-lg font-extrabold text-ink">{jf.name}</p>
              <div className="mt-3 grid grid-cols-4 gap-2">
                {keyFacts(jf, tssOf(jf, o.ftp)).map((f) => (
                  <div key={f.label} className="min-w-0">
                    <p className="label truncate">{f.label}</p>
                    <p className="num mt-0.5 text-sm font-extrabold text-ink">
                      {f.value}
                      {f.unit && <span className="ml-0.5 text-xs font-semibold text-ink-2">{f.unit}</span>}
                    </p>
                  </div>
                ))}
              </div>
            </Link>
          )}

          <Signpost arms={arms} note={o.suggestion?.detail} />

          <section className="flex items-center gap-4 rounded-[10px] border border-line bg-plate p-4">
            <GradeMark grade={grade.grade} />
            <div className="min-w-0">
              <p className="text-lg font-extrabold text-ink">
                Form{" "}
                <span className="num">
                  {o.now.form > 0 ? "+" : ""}
                  {o.now.form.toFixed(0)}
                </span>
                <span className="text-ink-2"> · {grade.zone}</span>
              </p>
              <p className="text-sm text-ink-2">{grade.text}</p>
            </div>
          </section>

          {warnings.map((w) => (
            <p key={w.title} className="flex gap-2.5 rounded-[10px] border border-line bg-plate px-4 py-3 text-sm text-ink-2">
              <svg width="16" height="16" viewBox="0 0 16 16" className="mt-0.5 shrink-0" aria-hidden>
                <path d="M8 1.5l7 12.5H1z" fill="none" stroke="var(--rust)" strokeWidth="1.6" strokeLinejoin="round" />
                <path d="M8 6v4M8 11.6v.4" stroke="var(--rust)" strokeWidth="1.6" strokeLinecap="round" />
              </svg>
              <span>
                <strong className="font-bold text-ink">{w.title}.</strong> {w.text}
              </span>
            </p>
          ))}

          <section className="grid grid-cols-3 gap-3 rounded-[10px] border border-line bg-plate p-4">
            <Stat
              label="Fitness"
              value={o.now.fitness.toFixed(0)}
              delta={{ text: `${Math.abs(fitDelta).toFixed(1)} / 7 d`, good: Math.abs(fitDelta) < 0.05 ? null : fitDelta > 0 }}
            />
            <Stat label="Fatigue" value={o.now.fatigue.toFixed(0)} />
            <Stat label="This week" value={hm(o.thisWeek.time)} unit="h" hint={`avg ${hm(o.avg4.time)} h`} />
          </section>
        </div>

        {/* Detail: trends and history */}
        <div className="space-y-4">
          <Card
            title="Fitness and fatigue"
            subtitle="Estimated from Relative Effort (TSS when there’s no heart rate). Dashed = projection."
            info={
              <>
                <p>
                  <strong className="text-ink">Fitness</strong> is your average daily training load over the last 6 weeks
                  (42 days); <strong className="text-ink">fatigue</strong> the same over the last 7 days. Each session’s load
                  is Strava’s Relative Effort, or TSS for rides without heart rate.
                </p>
                <p className="mt-2">
                  <strong className="text-ink">Form</strong> = fitness − fatigue. Negative means you are building (and
                  tired); positive means you are fresh. The dashed lines show where both go if you rest for 7 days.
                </p>
                <p className="mt-2">Same model as Strava’s Fitness &amp; Freshness, calculated here, so values differ a little.</p>
              </>
            }
          >
            <FitnessChart data={o.chart} />
          </Card>

          <Card
            title="Weekly hours"
            subtitle={`This week ${km(o.thisWeek.distance, 0)} in ${o.thisWeek.count} sessions · ${Math.round(o.thisWeek.kcal).toLocaleString("en-GB")} kcal (avg ${Math.round(o.avg4.kcal).toLocaleString("en-GB")}) · load ${Math.round(o.thisWeek.load)}`}
          >
            <SportHoursChart data={o.weekly} by="week" />
          </Card>

          {o.zoneTotals.length > 0 && (
            <Card title="Heart-rate zones" subtitle="Last 28 days, all sports">
              <ZoneBars seconds={o.zoneTotals} />
            </Card>
          )}

          <Card title="Latest sessions" action={<TextLink href="/activities">All</TextLink>}>
            <ul className="-mx-1 divide-y divide-hairline">
              {o.recent.map((a) => (
                <ActivityRow key={a.id} a={a} />
              ))}
            </ul>
          </Card>
        </div>
      </div>
    </>
  );
}
