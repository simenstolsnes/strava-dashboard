import Link from "next/link";
import { requireAthlete } from "@/lib/auth";
import { getRecovery } from "@/lib/recovery";
import { Card, Empty, Icon, PageTitle, Stat } from "@/components/ui";
import { HeartRateDayChart, RecoveryTrends } from "@/components/recovery-charts";
import { hmin } from "@/lib/format";
import { OWNER, personByAthlete } from "@/lib/people";

export const metadata = { title: "Recovery" };
export const maxDuration = 60;

const QUALITY: Record<string, string> = { POOR: "Poor", FAIR: "Fair", GOOD: "Good", EXCELLENT: "Excellent" };

const weekday = (d: string) =>
  new Date(`${d}T00:00:00Z`).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" });
const clock = (local: string) => local.slice(11, 16);

const STAGES = [
  { key: "deep_seconds", label: "Deep", color: "var(--z7)" },
  { key: "light_seconds", label: "Light", color: "var(--z4)" },
  { key: "rem_seconds", label: "REM", color: "var(--z2)" },
  { key: "awake_seconds", label: "Awake", color: "var(--border)" },
] as const;

export default async function RecoveryPage({ searchParams }: PageProps<"/recovery">) {
  const me = await requireAthlete();
  const { day } = await searchParams;
  const r = await getRecovery(me, typeof day === "string" ? day : undefined);
  const key = personByAthlete(me)?.key ?? OWNER;
  const envName = key === OWNER ? "GARMIN_PERSONAL_API_KEY" : `FRIEND_${key.toUpperCase()}_GARMIN_API_KEY`;

  if (!r.configured) {
    return (
      <>
        <PageTitle wide sub="Sleep, heart rate and recovery from Garmin.">Recovery</PageTitle>
        <div className="max-w-3xl">
          <Empty>
            Garmin isn’t connected. Create a Personal API key in Garmin Connect (Settings → Personal API) and add it as{" "}
            <code className="font-semibold text-ink">{envName}</code> in the environment variables.
          </Empty>
        </div>
      </>
    );
  }

  const synced = r.lastSync
    ? `Synced ${new Date(r.lastSync).toLocaleString("en-GB", { timeZone: "Europe/Oslo", weekday: "short", hour: "2-digit", minute: "2-digit" })}`
    : null;

  if (!r.days.length) {
    return (
      <>
        <PageTitle wide sub="Sleep, heart rate and recovery from Garmin.">Recovery</PageTitle>
        <div className="max-w-3xl">
          <Empty>
            No Garmin data stored yet. Run{" "}
            <code className="font-semibold text-ink">npm run garmin-backfill{key === OWNER ? "" : ` -- --as=${key}`}</code> to import your
            history, or tap Sync now in Settings.
          </Empty>
        </div>
      </>
    );
  }

  const n = r.night;
  const stageTotal = n ? STAGES.reduce((s, x) => s + (n[x.key] ?? 0), 0) : 0;
  const sleepDiff = n?.sleep_seconds && r.sleepNormal ? Math.round((n.sleep_seconds - r.sleepNormal) / 60) : null;
  const rhrDiff = r.rhr?.normal != null ? r.rhr.value - r.rhr.normal : null;
  const vo2Delta = (v: { value: number; before: number | null } | null) =>
    v?.before != null && Math.abs(v.value - v.before) >= 0.05
      ? { text: `${v.value > v.before ? "+" : "−"}${Math.abs(v.value - v.before).toFixed(1)} / 90 d`, good: v.value > v.before }
      : undefined;
  const hr = r.hrDay;
  const bbToday = r.today?.body_battery_high;

  return (
    <>
      <PageTitle wide sub="Sleep, heart rate and recovery from Garmin." aside={synced && <p className="pb-1 text-xs text-teal-ink">{synced}</p>}>
        Recovery
      </PageTitle>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:items-start">
        <div className="space-y-4">
          {n ? (
            <section className="rounded-[10px] border border-line bg-plate p-4">
              <div className="flex items-baseline gap-2">
                <h2 className="label">Last night</h2>
                <p className="num ml-auto text-xs text-muted">
                  {weekday(n.date)}
                  {n.sleep_start_local && n.sleep_end_local && ` · ${clock(n.sleep_start_local)}–${clock(n.sleep_end_local)}`}
                </p>
              </div>
              <div className="mt-1.5 flex flex-wrap items-baseline gap-x-3 gap-y-1">
                <p className="num text-2xl font-extrabold text-ink">{hmin(n.sleep_seconds! / 3600)}</p>
                {n.sleep_score != null && (
                  <p className="text-sm text-ink-2">
                    Sleep score <span className="num font-bold text-ink">{n.sleep_score}</span>
                    {n.sleep_quality && QUALITY[n.sleep_quality] && ` · ${QUALITY[n.sleep_quality]}`}
                  </p>
                )}
              </div>

              {stageTotal > 0 && (
                <>
                  <div className="mt-3 flex h-3 w-full gap-[2px] overflow-hidden rounded-sm" role="img" aria-label="Sleep stages">
                    {STAGES.map((s) =>
                      n[s.key] ? <div key={s.key} style={{ width: `${(n[s.key]! / stageTotal) * 100}%`, background: s.color }} /> : null,
                    )}
                  </div>
                  <ul className="mt-3 grid grid-cols-2 gap-x-6 gap-y-1.5">
                    {STAGES.map((s) => (
                      <li key={s.key} className="flex items-center gap-2 text-sm">
                        <span className="h-2.5 w-2.5 shrink-0 rounded-[2px]" style={{ background: s.color }} />
                        <span className="text-ink-2">{s.label}</span>
                        <span className="num ml-auto whitespace-nowrap font-semibold text-ink">{hmin((n[s.key] ?? 0) / 3600).replace(/^0h /, "")}</span>
                      </li>
                    ))}
                  </ul>
                </>
              )}

              <p className="mt-3 border-t border-hairline pt-3 text-sm text-ink-2">
                {sleepDiff != null && r.sleepNormal
                  ? Math.abs(sleepDiff) < 15
                    ? `About your usual ${hmin(r.sleepNormal / 3600)}.`
                    : `${hmin(Math.abs(sleepDiff) / 60).replace(/^0h /, "")} ${sleepDiff > 0 ? "more" : "less"} than your usual ${hmin(r.sleepNormal / 3600)}.`
                  : "Not enough nights yet to know your usual."}
                {bbToday != null && (
                  <>
                    {" "}
                    Body Battery recharged to <span className="num font-semibold text-ink">{bbToday}</span>.
                  </>
                )}
              </p>
            </section>
          ) : (
            <Empty>No sleep recorded last night. Wear the watch to bed and sync it in Garmin Connect.</Empty>
          )}

          <section className="grid grid-cols-3 gap-3 rounded-[10px] border border-line bg-plate p-4">
            <Stat
              label="Resting HR"
              value={r.rhr?.value ?? "–"}
              unit={r.rhr ? "bpm" : undefined}
              delta={
                rhrDiff != null
                  ? Math.abs(rhrDiff) < 1
                    ? { text: "at your normal", good: null }
                    : { text: `${rhrDiff > 0 ? "+" : "−"}${Math.abs(rhrDiff).toFixed(0)} vs normal`, good: rhrDiff < 0 }
                  : undefined
              }
              info={
                <>
                  Garmin’s resting heart rate for {r.rhr ? weekday(r.rhr.date) : "today"}, compared with your median over the 30 days
                  before. A rise of 5 bpm or more for a few days often comes before illness or after too much load.
                </>
              }
            />
            <Stat label="VO2 max ride" value={r.vo2Ride?.value.toFixed(0) ?? "–"} delta={vo2Delta(r.vo2Ride)} />
            <Stat label="VO2 max run" value={r.vo2Run?.value.toFixed(0) ?? "–"} delta={vo2Delta(r.vo2Run)} infoAlign="end" />
          </section>
        </div>

        <Card
          title={hr ? `Heart rate, ${weekday(hr.date)}` : "Heart rate through the day"}
          subtitle={
            hr
              ? [hr.resting && `Resting ${hr.resting}`, hr.min && `lowest ${hr.min}`, hr.max && `highest ${hr.max} bpm`].filter(Boolean).join(" · ")
              : undefined
          }
          action={
            hr && (
              <div className="-mr-1 -mt-1 flex shrink-0">
                <DayLink date={hr.prev} label="Previous day" dir="prev" />
                <DayLink date={hr.next} label="Next day" dir="next" />
              </div>
            )
          }
        >
          {hr ? (
            <HeartRateDayChart samples={hr.samples} sleep={hr.sleep} resting={hr.resting} dayStart={hr.dayStart} complete={hr.complete} />
          ) : (
            <p className="py-6 text-center text-sm text-ink-2">No heart-rate data stored yet; it arrives with the next sync.</p>
          )}
        </Card>
      </div>

      <div className="mt-6">
        <RecoveryTrends days={r.days} />
      </div>
    </>
  );
}

function DayLink({ date, label, dir }: { date: string | null; label: string; dir: "prev" | "next" }) {
  const icon = (
    <span className={dir === "prev" ? "rotate-180" : ""} style={{ display: "inline-flex" }}>
      <Icon name="chevron" size={18} />
    </span>
  );
  return date ? (
    <Link href={`/recovery?day=${date}`} scroll={false} aria-label={label} className="rounded-md p-2 text-teal hover:bg-rock">
      {icon}
    </Link>
  ) : (
    <span aria-hidden className="p-2 text-line">
      {icon}
    </span>
  );
}
