import { notFound } from "next/navigation";
import { requireAthlete } from "@/lib/auth";
import { getActivityDetail, sportGroup } from "@/lib/queries";
import { Card, Icon, PageTitle, Stat, ZoneBars } from "@/components/ui";
import { ActivityCurveChart, StreamChart } from "@/components/charts";
import { duration, km, kmh, longDate, pace } from "@/lib/format";
import { CURVE_DURATIONS } from "@/lib/metrics";
import { reprocess, saveNote } from "./actions";
import { RouteMapLazy } from "@/components/route-map-lazy";

// Leaflet draws with SVG attributes, which cannot read CSS variables
const ROUTE_COLOR = { ride: "#008c83", run: "#a54f16", strength: "#6a5acd", other: "#b8860b" } as const;

export const metadata = { title: "Activity" };

const FEELINGS = ["Rough", "Heavy", "OK", "Good", "Great"];

export default async function ActivityPage({ params }: PageProps<"/activities/[id]">) {
  await requireAthlete();
  const id = Number((await params).id);
  if (!Number.isFinite(id)) notFound();
  const d = await getActivityDetail(id);
  if (!d) notFound();

  const { activity: a, extra, streams, metrics } = { ...d, metrics: d.activity.metrics };
  const g = sportGroup(a.sport_type);
  const isRun = g === "run";
  const hasPower = !!a.device_watts && !!metrics?.normalized_power;
  const intensity = hasPower && d.ftp ? metrics!.normalized_power! / d.ftp : null;

  // Build chart rows from downsampled streams
  const rows =
    streams?.time?.map((t, i) => {
      const v = streams.velocity?.[i];
      return {
        time: t,
        heartrate: streams.heartrate?.[i] ?? null,
        watts: streams.watts?.[i] ?? null,
        speed: v != null ? (isRun ? (v > 2 ? 1000 / v : null) : v * 3.6) : null,
        altitude: streams.altitude?.[i] ?? null,
      };
    }) ?? [];

  const curve = metrics?.power_curve
    ? CURVE_DURATIONS.filter((s) => metrics.power_curve![s]).map((s) => ({
        seconds: s,
        activity: metrics.power_curve![s] ?? null,
        best90: d.best90[s] ?? null,
      }))
    : [];

  const save = saveNote.bind(null, a.id);
  const resync = reprocess.bind(null, a.id);

  return (
    <>
      <PageTitle wide sub={`${longDate(a.start_date_local)} · ${a.sport_type.replace(/([a-z])([A-Z])/g, "$1 $2")}`}>{a.name}</PageTitle>
      <div className="max-w-3xl space-y-4">

      {extra.description && <p className="-mt-2 whitespace-pre-line text-sm text-ink-2">{extra.description}</p>}

      <Card>
        <div className="grid grid-cols-3 gap-x-3 gap-y-4">
          {a.distance > 0 && <Stat label="Distance" value={km(a.distance, 2).replace(" km", "")} unit="km" />}
          <Stat label="Moving time" value={duration(a.moving_time)} />
          {a.distance > 0 && (isRun ? <Stat label="Pace" value={pace(a.average_speed).replace(" /km", "")} unit="/km" /> : <Stat label="Speed" value={kmh(a.average_speed).replace(" km/h", "")} unit="km/h" />)}
          {a.total_elevation_gain > 0 && <Stat label="Elevation" value={Math.round(a.total_elevation_gain)} unit="m" />}
          {a.average_heartrate && <Stat label="Avg HR" value={Math.round(a.average_heartrate)} unit="bpm" hint={a.max_heartrate ? `max ${Math.round(a.max_heartrate)}` : undefined} />}
          {a.suffer_score != null && (
            <Stat
              label="Rel. effort"
              value={Math.round(a.suffer_score)}
              info="Strava’s Relative Effort: how hard the session was for your heart, from time spent in each heart-rate zone (higher zones count much more). It is the load behind your fitness and fatigue numbers."
            />
          )}
          {hasPower && <Stat label="Avg power" value={Math.round(a.average_watts ?? 0)} unit="W" hint={extra.max_watts ? `max ${Math.round(extra.max_watts)}` : undefined} />}
          {hasPower && (
            <Stat
              label="Normalized"
              value={Math.round(metrics!.normalized_power!)}
              unit="W"
              info="Normalized Power: the steady power that would have cost your body the same as this variable ride. Surges count more than easy spells, so for intervals it sits well above average power."
            />
          )}
          {intensity && (
            <Stat
              label="Intensity"
              value={intensity.toFixed(2)}
              hint={`FTP ${d.ftp} W`}
              info="Intensity Factor: Normalized Power divided by your FTP. Around 0.65 is easy endurance, 0.75–0.85 tempo, 0.95–1.05 a hard hour at threshold."
            />
          )}
          {d.tss != null && (
            <Stat
              label="TSS"
              value={d.tss}
              info="Training Stress Score: load from duration and intensity. One hour at FTP = 100. Calculated with your current FTP, so it updates if your FTP changes."
            />
          )}
          {extra.kilojoules && (
            <Stat
              label="Work"
              value={Math.round(extra.kilojoules)}
              unit="kJ"
              info="Mechanical work you put into the pedals. Because muscles are about 24 % efficient, kJ of work is roughly the kcal you burned."
            />
          )}
          {extra.average_cadence && <Stat label="Cadence" value={Math.round(isRun ? extra.average_cadence * 2 : extra.average_cadence)} unit={isRun ? "spm" : "rpm"} />}
          {extra.kcal && (
            <Stat
              label="Calories"
              value={extra.kcal.kcal}
              unit="kcal"
              hint={extra.kcal.estimated ? "estimated from work" : undefined}
              info={
                extra.kcal.estimated
                  ? "Strava had no calorie figure for this ride, so this uses the work you did: kJ of mechanical work ≈ kcal burned (about 24 % muscle efficiency cancels the 4.184 kJ/kcal conversion)."
                  : hasPower
                    ? "Strava’s estimate from the mechanical work you did with your power meter: the most accurate source available."
                    : "Strava’s estimate from heart rate, your weight, age and sex (and speed for runs). Heart-rate based estimates can be off by 10–25 %."
              }
            />
          )}
          {metrics?.decoupling != null && a.moving_time >= 1800 && (
            <Stat
              label="Decoupling"
              value={`${metrics.decoupling.toFixed(1)}`}
              unit="%"
              hint="lower = steadier"
              info="How much your output per heartbeat dropped from the first to the second half. Under 5 % on a steady session means a solid aerobic base; intervals and hills make it meaningless."
            />
          )}
          {metrics?.hrrc != null && (
            <Stat
              label="HRRc"
              value={`−${metrics.hrrc}`}
              unit="bpm"
              hint={metrics.hrrc_from ? `in 60 s from ${metrics.hrrc_from}` : undefined}
              info={`Heart-rate recovery: the largest drop in heart rate over 60 seconds, starting at or above your threshold (${d.threshold ?? "–"} bpm, bottom of Strava zone 4). A faster or bigger drop means better recovery.`}
            />
          )}
        </div>
      </Card>

      {extra.mapPolyline && !a.trainer && !/Virtual/.test(a.sport_type) && (
        <Card title="Route" subtitle="Teal dot = start, dark dot = finish. Pinch or use + / − to zoom.">
          <RouteMapLazy polyline={extra.mapPolyline} color={ROUTE_COLOR[g]} />
        </Card>
      )}

      {rows.length > 0 && (
        <Card title="Streams" subtitle="Tap or hover to inspect; the charts share one cursor">
          <div className="space-y-4">
            {streams?.heartrate && <StreamChart data={rows} dataKey="heartrate" label="Heart rate" unit="bpm" />}
            {streams?.watts && (
              <StreamChart
                data={rows}
                dataKey="watts"
                label="Power"
                unit="W"
                reference={d.ftp ? { y: d.ftp, label: `FTP ${d.ftp}` } : undefined}
              />
            )}
            {streams?.velocity && a.distance > 0 && (
              isRun
                ? <StreamChart data={rows} dataKey="speed" label="Pace" unit="/km" valueFormat="pace" reversed />
                : <StreamChart data={rows} dataKey="speed" label="Speed" unit="km/h" valueFormat="decimal" />
            )}
            {streams?.altitude && a.total_elevation_gain > 0 && <StreamChart data={rows} dataKey="altitude" label="Elevation" unit="m" height={90} />}
          </div>
        </Card>
      )}

      {metrics?.hr_zone_seconds && (
        <Card title="Heart-rate zones">
          <ZoneBars seconds={metrics.hr_zone_seconds} />
        </Card>
      )}

      {hasPower && metrics?.power_zone_seconds && (
        <Card title="Power zones">
          <ZoneBars seconds={metrics.power_zone_seconds} />
        </Card>
      )}

      {hasPower && curve.length > 0 && (
        <Card title="Power curve" subtitle="This activity against your best of the last 90 days">
          <ActivityCurveChart data={curve} />
        </Card>
      )}

      {extra.laps.length > 1 && (
        <Card title="Laps">
          <div className="-mx-4 overflow-x-auto px-4">
            <table className="num w-full min-w-[420px] text-sm">
              <thead>
                <tr className="text-left text-xs text-muted">
                  <th className="pb-2 font-normal">#</th>
                  <th className="pb-2 font-normal">Time</th>
                  <th className="pb-2 font-normal">Dist</th>
                  <th className="pb-2 font-normal">{isRun ? "Pace" : "Speed"}</th>
                  <th className="pb-2 font-normal">HR</th>
                  {hasPower && <th className="pb-2 font-normal">Power</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {extra.laps.map((l, i) => (
                  <tr key={i}>
                    <td className="py-1.5 text-muted">{i + 1}</td>
                    <td className="py-1.5 text-ink">{duration(l.moving_time)}</td>
                    <td className="py-1.5 text-ink-2">{km(l.distance, 2)}</td>
                    <td className="py-1.5 text-ink-2">{isRun ? pace(l.average_speed) : kmh(l.average_speed)}</td>
                    <td className="py-1.5 text-ink-2">{l.average_heartrate ? Math.round(l.average_heartrate) : "–"}</td>
                    {hasPower && <td className="py-1.5 font-semibold text-ink">{l.average_watts ? `${Math.round(l.average_watts)} W` : "–"}</td>}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      <Card title="How did it feel?" subtitle="Private notes, only stored in your dashboard">
        <form action={save} className="space-y-3">
          <fieldset className="flex gap-2">
            <legend className="sr-only">Feeling</legend>
            {FEELINGS.map((f, i) => (
              <label key={i} className="flex-1 cursor-pointer">
                <input type="radio" name="feeling" value={i + 1} defaultChecked={d.note?.feeling === i + 1} className="peer sr-only" />
                <span className="block rounded-md border border-line px-2.5 py-2 text-center text-xs font-semibold text-ink-2 peer-checked:border-teal peer-checked:bg-teal peer-checked:text-white peer-focus-visible:outline-2 peer-focus-visible:outline-rust">
                  {f}
                </span>
              </label>
            ))}
          </fieldset>
          <textarea
            name="text"
            defaultValue={d.note?.text ?? ""}
            rows={3}
            placeholder="Legs, sleep, weather, what you'd change next time…"
            className="w-full rounded-lg border border-line bg-plate p-3 text-sm text-ink placeholder:text-muted"
          />
          <button className="rounded-lg bg-teal px-4 py-2 text-sm font-semibold text-white hover:bg-teal-dark">Save note</button>
        </form>
      </Card>

      <div className="flex items-center justify-between text-sm">
        <a href={`https://www.strava.com/activities/${a.id}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 font-semibold text-teal">
          View on Strava <Icon name="external" size={14} />
        </a>
        <form action={resync}>
          <button className="text-muted">Re-sync from Strava</button>
        </form>
      </div>
      </div>
    </>
  );
}
