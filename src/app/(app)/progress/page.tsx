import Link from "next/link";
import { requireAthlete } from "@/lib/auth";
import { getProfile, getProgress } from "@/lib/queries";
import { Card, Empty, PageTitle } from "@/components/ui";
import { SportHoursChart, TrendChart } from "@/components/charts";
import { shortDate } from "@/lib/format";

export const metadata = { title: "Progress" };

function driftLabel(v: number) {
  if (v < 0) return { text: "Negative", tone: "text-ink-2" };
  if (v < 5) return { text: "Steady", tone: "text-good" };
  if (v <= 10) return { text: "Some drift", tone: "text-ink" };
  return { text: "Large drift", tone: "text-critical" };
}

export default async function ProgressPage() {
  const me = await requireAthlete();
  const [p, profile] = await Promise.all([getProgress(me), getProfile(me)]);
  const z2min = profile.hrZones?.[1]?.min;

  const whyHr = (
    <>
      <strong className="text-ink">Why {p.refHr} bpm?</strong> It is the top of your heart-rate zone 2 in Strava
      {z2min ? ` (zone 2 = ${z2min}–${p.refHr} bpm)` : ""}. The top of zone 2 sits close to your aerobic threshold: the
      hardest effort you can hold for hours. Comparing every session at that one heart rate shows whether you go faster
      for the same cost to your heart. Change your zones in Strava → Settings → My Performance and this updates.
    </>
  );

  return (
    <>
      <PageTitle wide sub="Is your aerobic engine improving? Last 12 months.">
        Progress
      </PageTitle>
      <div className="max-w-3xl space-y-4">
        <Card
          title={`Estimated running pace at ${p.refHr} bpm`}
          subtitle="From each road run of 20 min or more. Lower = fitter."
          info={
            <>
              <p>
                <strong className="text-ink">How it is estimated:</strong> for each run we divide average speed by average
                heart rate (the <em>efficiency factor</em>, metres per minute per beat), then work out what pace that
                efficiency gives at {p.refHr} bpm. Trail runs are left out because terrain swamps the signal.
              </p>
              <p className="mt-2">{whyHr}</p>
              <p className="mt-2">Hills, heat, wind and tired legs add noise, so read the dashed 6-week trend, not single runs.</p>
            </>
          }
        >
          {p.runs.length >= 3 ? <TrendChart data={p.runs} label="Pace" kind="pace" /> : <Empty>Not enough runs with heart rate yet.</Empty>}
        </Card>

        <Card
          title={`Estimated cycling power at ${p.refHr} bpm`}
          subtitle="From each ride with a power meter lasting 30 min or more. Higher = fitter."
          info={
            <>
              <p>
                <strong className="text-ink">How it is estimated:</strong> for each ride we divide Normalized Power by average
                heart rate (watts per beat), then work out the power that gives at {p.refHr} bpm.
              </p>
              <p className="mt-2">
                <strong className="text-ink">Why only rides of 30 min or more?</strong> Heart rate lags behind effort and
                needs about 10 minutes to settle, so short rides overstate how efficient you are.
              </p>
              <p className="mt-2">{whyHr}</p>
            </>
          }
        >
          {p.rides.length >= 3 ? (
            <TrendChart data={p.rides} label="Power" kind="watts" />
          ) : (
            <Empty>Not enough rides of 30 min or more with power and heart rate yet.</Empty>
          )}
        </Card>

        <Card
          title="Heart-rate recovery (HRRc)"
          subtitle={
            p.threshold
              ? `Largest 60-second heart-rate drop starting at ${p.threshold} bpm or above. Higher = faster recovery.`
              : "Needs heart-rate zones from Strava."
          }
          info={
            <>
              <p>
                <strong className="text-ink">What it is:</strong> HRRc measures how quickly you recover after a hard
                effort. It is the largest drop in heart rate over 60 seconds, starting from a heart rate of at least
                threshold. The faster or greater the drop, the better your recovery (PEZ Cycling News).
              </p>
              <p className="mt-2">
                <strong className="text-ink">Your threshold:</strong> {p.threshold ?? "–"} bpm, the bottom of your Strava
                zone 4 (“Threshold”). Sessions that never reach it have no HRRc.
              </p>
              <p className="mt-2">
                Compare like with like: a full stop after an interval drops faster than easy pedalling, and heat,
                caffeine and fatigue slow recovery. A rising trend over weeks is the signal.
              </p>
            </>
          }
        >
          {p.hrrc.length >= 3 ? (
            <TrendChart data={p.hrrc} label="HRRc" kind="bpm" />
          ) : (
            <Empty>Not enough sessions reaching threshold yet. Older sessions fill in as the history refresh runs.</Empty>
          )}
        </Card>

        <Card title="Monthly hours" subtitle="By sport">
          <SportHoursChart data={p.monthly} by="month" />
        </Card>

        <Card
          title="Monthly calories"
          subtitle={`Energy burned in training, by sport. Strava’s estimate is available for ${Math.round(p.kcalCoverage * 100)} % of sessions this year.`}
          info={
            <>
              <p>
                <strong className="text-ink">Where the numbers come from:</strong> Strava estimates calories per session.
                With a power meter it uses the mechanical work you did (kJ), which is the most accurate source. Without
                power it uses heart rate together with your weight, age and sex, and for runs your speed. Without heart
                rate or power it falls back to typical values for the sport.
              </p>
              <p className="mt-2">
                <strong className="text-ink">Rule of thumb for rides:</strong> kilojoules of work ≈ kilocalories burned,
                because your muscles are about 24 % efficient, which cancels the 4.184 kJ-per-kcal conversion. Rides
                missing Strava’s number use that estimate here.
              </p>
              <p className="mt-2">Heart-rate based estimates can be off by 10–25 %; treat them as a trend, not a meal plan.</p>
            </>
          }
        >
          <SportHoursChart data={p.calories} by="month" unit="kcal" />
        </Card>

        <Card
          title="Aerobic decoupling"
          subtitle="How much your output per heartbeat drops from the first to the second half of sessions over 1 hour."
          info={
            <>
              <p>
                <strong className="text-ink">What it is:</strong> also called Pw:HR (power) or Pa:HR (pace). We compare
                output per heartbeat in the first half of a session with the second half. If your heart rate drifts up
                while your power or pace stays the same, the ratio falls: that fall, in percent, is the decoupling.
              </p>
              <p className="mt-2">
                <strong className="text-ink">How to read it</strong> (for steady sessions):
              </p>
              <ul className="mt-1 list-disc space-y-0.5 pl-4">
                <li>Under 5 %: a solid aerobic base for that duration and intensity.</li>
                <li>5–10 %: some drift; you are near the edge of your aerobic endurance.</li>
                <li>Over 10 %: large drift; the session was too long or too hard for your current base, or heat, dehydration or low fuel played in.</li>
                <li>Negative: output rose relative to heart rate, typical when you start easy and finish harder.</li>
              </ul>
              <p className="mt-2">
                <strong className="text-ink">How to use it:</strong> ride or run steadily for 1–2 hours at an easy
                pace a few times a month. As your base grows, decoupling stays under 5 % for longer sessions.
              </p>
            </>
          }
        >
          {p.decoupling.length ? (
            <ul className="divide-y divide-hairline">
              {p.decoupling.map((d) => {
                const l = driftLabel(d.value);
                return (
                  <li key={d.id}>
                    <Link href={`/activities/${d.id}`} className="flex items-center gap-3 py-2 text-sm hover:bg-rock/50">
                      <span className="min-w-0 flex-1 truncate text-ink">{d.name}</span>
                      <span className="text-xs text-muted">{shortDate(d.date)}</span>
                      <span className={`w-20 text-right text-xs font-semibold ${l.tone}`}>{l.text}</span>
                      <span className="num w-16 text-right font-semibold text-ink">
                        {d.value > 0 ? "+" : ""}
                        {d.value.toFixed(1)} %
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          ) : (
            <Empty>No sessions over an hour with heart rate yet.</Empty>
          )}
          <p className="mt-2 text-xs text-ink-2">
            Only meaningful for steady efforts. Intervals, hilly routes and group rides will show high or negative values.
          </p>
        </Card>
      </div>
    </>
  );
}
