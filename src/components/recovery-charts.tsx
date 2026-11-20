"use client";

import { useMemo, useState, type ReactNode } from "react";
import {
  Area,
  Bar,
  BarChart,
  ComposedChart,
  Line,
  ReferenceArea,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { AXIS, CURSOR, GRID, Legend, makeTip, type Series } from "./charts";
import { Card } from "./ui";
import type { RecoveryDay } from "@/lib/recovery";
import { hmin } from "@/lib/format";

// ---------- formats ----------

const int = (v: number) => Math.round(v).toLocaleString("en-GB");
const clock = (t: number) =>
  new Date(t).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", timeZone: "UTC" });
const day = (d: string | number) =>
  new Date(`${d}T00:00:00Z`).toLocaleDateString("en-GB", { day: "numeric", month: "short", timeZone: "UTC" });
const fullDay = (d: string | number) =>
  new Date(`${d}T00:00:00Z`).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
const monthYear = (d: string | number) =>
  new Date(`${d}T00:00:00Z`).toLocaleDateString("en-GB", { month: "short", year: "2-digit", timeZone: "UTC" });

// ---------- heart rate through one day ----------

export function HeartRateDayChart({
  samples,
  sleep,
  resting,
  dayStart,
  complete,
}: {
  complete: boolean;
  samples: [number, number][];
  sleep: { start: number; end: number }[];
  resting: number | null;
  dayStart: number;
}) {
  const data = samples.map(([t, bpm]) => ({ t, bpm }));
  const dayEnd = dayStart + 24 * 3600 * 1000;
  const ticks = Array.from({ length: 9 }, (_, i) => dayStart + i * 3 * 3600 * 1000);
  const series: Series[] = [{ key: "bpm", label: "Heart rate", color: "var(--teal)", format: (v) => `${Math.round(v)} bpm` }];
  const max = Math.max(...samples.map((s) => s[1]));
  const lastT = samples.at(-1)?.[0] ?? dayEnd;
  const gapAfter = complete && dayEnd - lastT > 2 * 3600 * 1000 ? lastT : null;
  return (
    <>
      <ul className="mb-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-ink-2">
        <li className="flex items-center gap-1.5">
          <span className="inline-block h-0.5 w-4 rounded" style={{ background: "var(--teal)" }} />
          Heart rate
        </li>
        {sleep.length > 0 && (
          <li className="flex items-center gap-1.5">
            <span className="inline-block h-2.5 w-2.5 rounded-[2px]" style={{ background: "var(--teal-dark)", opacity: 0.18 }} />
            Asleep
          </li>
        )}
        {resting && (
          <li className="flex items-center gap-1.5">
            <span className="inline-block w-4" style={{ borderTop: "1px solid var(--ink-2)" }} />
            Resting heart rate
          </li>
        )}
      </ul>
      <ResponsiveContainer width="100%" height={220}>
        <ComposedChart data={data} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
          {sleep.map((w, i) => (
            <ReferenceArea
              key={i}
              x1={Math.max(w.start, dayStart)}
              x2={Math.min(w.end, dayEnd)}
              ifOverflow="hidden"
              fill="var(--teal-dark)"
              fillOpacity={0.12}
              strokeOpacity={0}
            />
          ))}
          {GRID}
          <XAxis dataKey="t" type="number" domain={[dayStart, dayEnd]} ticks={ticks} {...AXIS} tickFormatter={(t) => clock(t).slice(0, 2)} />
          <YAxis {...AXIS} axisLine={false} width={32} domain={[(min: number) => Math.max(30, Math.floor((min - 5) / 10) * 10), Math.ceil((max + 5) / 10) * 10]} />
          {resting && <ReferenceLine y={resting} stroke="var(--ink-2)" strokeWidth={1} />}
          <Tooltip cursor={CURSOR} content={makeTip(series, (l) => clock(Number(l)))} />
          <Area dataKey="bpm" stroke="var(--teal)" strokeWidth={1.5} fill="var(--teal)" fillOpacity={0.1} dot={false} isAnimationActive={false} />
        </ComposedChart>
      </ResponsiveContainer>
      {gapAfter && <p className="mt-1 text-xs text-ink-2">No heart rate after {clock(gapAfter)}: the watch was off or hasn’t synced yet.</p>}
    </>
  );
}

// ---------- trends ----------

const RANGES = {
  "1m": { label: "1 M", name: "month", days: 30 },
  "3m": { label: "3 M", name: "3 months", days: 91 },
  "6m": { label: "6 M", name: "6 months", days: 182 },
  "1y": { label: "1 Y", name: "year", days: 365 },
  all: { label: "All", name: "", days: Infinity },
} as const;
type Range = keyof typeof RANGES;

type Key = Exclude<keyof RecoveryDay, "date">;
type Row = Partial<Record<Key, number | null>> & { date: string } & Record<string, unknown>;

const mean = (xs: (number | null | undefined)[]) => {
  const v = xs.filter((x): x is number => x != null);
  return v.length ? v.reduce((a, b) => a + b, 0) / v.length : null;
};

/** Monday of the week containing `date`. */
const monday = (date: string) => {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() - ((d.getUTCDay() + 6) % 7));
  return d.toISOString().slice(0, 10);
};

const KEYS: Key[] = ["sleep", "deep", "light", "rem", "awake", "score", "rhr", "stress", "bbHigh", "bbLow", "steps", "vo2Run", "vo2Ride"];

/** Average each metric per week, so a year reads as a trend instead of a hedge. */
function weekly(days: RecoveryDay[]): Row[] {
  const groups = new Map<string, RecoveryDay[]>();
  for (const d of days) {
    const w = monday(d.date);
    groups.set(w, [...(groups.get(w) ?? []), d]);
  }
  return [...groups].map(([date, ds]) => {
    const row: Row = { date };
    for (const k of KEYS) row[k] = mean(ds.map((d) => d[k]));
    return row;
  });
}

/** Trailing mean over `n` rows, needing at least half of them. */
function rolling(rows: Row[], key: Key, n: number) {
  return rows.map((_, i) => {
    const win = rows.slice(Math.max(0, i - n + 1), i + 1).map((r) => r[key] as number | null);
    const v = win.filter((x) => x != null);
    return v.length >= Math.ceil(n / 2) ? mean(v) : null;
  });
}

type Summary = { avg: number | null; prev: number | null };
const summary = (shown: RecoveryDay[], prev: RecoveryDay[], key: Key): Summary => ({
  avg: mean(shown.map((d) => d[key])),
  prev: prev.length ? mean(prev.map((d) => d[key])) : null,
});

/** "avg 7h 05m" with the change against the previous period of the same length. */
function Average({
  s,
  format,
  delta,
  higherIsBetter,
  label = "avg",
}: {
  s: Summary;
  format: (v: number) => string;
  delta: (v: number) => string;
  higherIsBetter: boolean;
  label?: string;
}) {
  if (s.avg == null) return null;
  const diff = s.prev == null ? null : s.avg - s.prev;
  const flat = diff == null || Math.abs(diff) < 1e-9 || delta(Math.abs(diff)) === delta(0);
  const good = diff != null && (diff > 0) === higherIsBetter;
  return (
    <div className="shrink-0 text-right">
      <p className="num text-sm font-bold text-ink">
        <span className="mr-1 text-xs font-semibold text-ink-2">{label}</span>
        {format(s.avg)}
      </p>
      {diff != null && (
        <p className={`num text-xs ${flat ? "text-ink-2" : good ? "text-good" : "text-critical"}`}>
          {flat ? "same as before" : `${diff > 0 ? "+" : "−"}${delta(Math.abs(diff))} vs before`}
        </p>
      )}
    </div>
  );
}

export function RecoveryTrends({ days }: { days: RecoveryDay[] }) {
  const [range, setRange] = useState<Range>("3m");
  const r = RANGES[range];

  const { shown, prev, rows, daily } = useMemo(() => {
    const n = Number.isFinite(r.days) ? r.days : days.length;
    const shown = days.slice(-n);
    const prev = Number.isFinite(r.days) ? days.slice(-2 * n, -n) : [];
    const daily = n <= 91;
    return { shown, prev, daily, rows: daily ? (shown as Row[]) : weekly(shown) };
  }, [days, r.days]);

  const withAvg = (key: Key) => {
    const avg = rolling(rows, key, 7);
    return rows.map((row, i) => ({ ...row, [`${key}Avg`]: avg[i] }));
  };

  const tick = daily ? day : monthYear;
  const tipLabel = (l: string | number) => (daily ? fullDay(l) : `Week of ${day(l)}`);
  const unitNote = daily ? "Daily values" : "Weekly averages";
  const vs = r.days === Infinity ? "" : ` Change is against the ${r.name} before.`;
  const xAxis = <XAxis dataKey="date" {...AXIS} tickFormatter={tick} minTickGap={36} />;
  const chartProps = { margin: { top: 4, right: 8, left: 0, bottom: 0 }, syncId: "recovery", syncMethod: "value" as const };

  type Bound = number | string | ((v: number) => number);
  const line = (key: Key, label: string, format: (v: number) => string, yWidth = 32, domain?: [Bound, Bound], ticks?: number[]) => {
    const data = withAvg(key);
    const series: Series[] = [
      { key, label: daily ? label : `${label}, weekly average`, color: "var(--teal)", format },
      ...(daily ? [{ key: `${key}Avg`, label: "7-day average", color: "var(--ink-2)", format, dashed: true }] : []),
    ];
    return (
      <>
        <Legend series={series} />
        <ResponsiveContainer width="100%" height={180}>
          <ComposedChart data={data} {...chartProps}>
            {GRID}
            {xAxis}
            <YAxis {...AXIS} axisLine={false} width={yWidth} domain={(domain ?? ["auto", "auto"]) as [number, number]} ticks={ticks} allowDecimals={false} />
            <Tooltip cursor={CURSOR} content={makeTip(series, tipLabel)} />
            <Line dataKey={key} stroke="var(--teal)" strokeWidth={daily ? 1.5 : 2} dot={false} connectNulls={!daily} isAnimationActive={false} />
            {daily && <Line dataKey={`${key}Avg`} stroke="var(--ink-2)" strokeWidth={2} strokeDasharray="5 4" dot={false} isAnimationActive={false} />}
          </ComposedChart>
        </ResponsiveContainer>
      </>
    );
  };

  const stages: Series[] = [
    { key: "deep", label: "Deep", color: "var(--z7)", format: hmin },
    { key: "light", label: "Light", color: "var(--z4)", format: hmin },
    { key: "rem", label: "REM", color: "var(--z2)", format: hmin },
    { key: "awake", label: "Awake", color: "var(--border)", format: hmin },
  ];
  const vo2Series: Series[] = [
    { key: "vo2Ride", label: "Cycling", color: "var(--s-ride)", format: (v) => v.toFixed(1) },
    { key: "vo2Run", label: "Running", color: "var(--s-run)", format: (v) => v.toFixed(1) },
  ];
  const bbSeries: Series[] = [
    { key: "bbHigh", label: "Highest", color: "var(--teal)", format: int },
    { key: "bbLow", label: "Lowest", color: "var(--ink-2)", format: int },
  ];

  const hasVo2 = shown.some((d) => d.vo2Run != null || d.vo2Ride != null);
  // Carry the last VO2 max forward so the line reads as "your current value" between updates
  const vo2Rows = useMemo(() => {
    // Start from the last values before the window
    const before = days.filter((d) => d.date < (shown[0]?.date ?? ""));
    const start = {
      vo2Run: before.findLast((d) => d.vo2Run != null)?.vo2Run ?? null,
      vo2Ride: before.findLast((d) => d.vo2Ride != null)?.vo2Ride ?? null,
    };
    const out: Row[] = [];
    for (const row of rows) {
      const last = out.at(-1) ?? start;
      out.push({
        ...row,
        vo2Run: (row.vo2Run as number | null) ?? (last.vo2Run as number | null),
        vo2Ride: (row.vo2Ride as number | null) ?? (last.vo2Ride as number | null),
      });
    }
    return out;
  }, [days, shown, rows]);
  const vo2Last = (k: "vo2Run" | "vo2Ride") => vo2Rows.at(-1)?.[k] ?? null;
  const vo2First = (k: "vo2Run" | "vo2Ride") => vo2Rows.find((x) => x[k] != null)?.[k] ?? null;

  const stressTop = Math.min(100, Math.ceil((Math.max(0, ...rows.map((x) => (x.stress as number | null) ?? 0)) + 3) / 10) * 10);
  const stepsMax = Math.max(0, ...rows.map((x) => (x.steps as number | null) ?? 0));
  const stepsStep = stepsMax > 20000 ? 10000 : 5000;
  const stepsTop = Math.max(stepsStep, Math.ceil(stepsMax / stepsStep) * stepsStep);

  return (
    <section aria-label="Trends">
      <div
        className="sticky top-12 z-[5] -mx-4 mb-3 flex flex-wrap items-center justify-between gap-2 bg-rock px-4 py-2"
        style={{ top: "calc(48px + env(safe-area-inset-top))" }}
      >
        <h2 className="text-lg font-extrabold text-ink">Trends</h2>
        <div role="radiogroup" aria-label="Time range" className="flex rounded-lg border border-line bg-plate p-0.5">
          {(Object.keys(RANGES) as Range[]).map((k) => (
            <button
              key={k}
              type="button"
              role="radio"
              aria-checked={range === k}
              onClick={() => setRange(k)}
              className={`num min-w-11 rounded-md px-2.5 py-1.5 text-xs font-semibold ${range === k ? "bg-teal text-white" : "text-ink-2 hover:text-ink"}`}
            >
              {RANGES[k].label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <TrendCard
          title="Sleep"
          subtitle={`${unitNote}, by stage. Garmin’s sleep tracking.${vs}`}
          aside={<Average s={summary(shown, prev, "sleep")} format={hmin} delta={(v) => `${Math.round(v * 60)} min`} higherIsBetter />}
          wide
        >
          <Legend series={stages} shape="rect" />
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={rows} {...chartProps} barCategoryGap={daily ? "15%" : "25%"}>
              {GRID}
              {xAxis}
              <YAxis {...AXIS} axisLine={false} width={32} tickFormatter={(v) => `${v}h`} allowDecimals={false} />
              <Tooltip
                cursor={{ fill: "var(--rock)" }}
                content={makeTip(
                  [{ key: "sleep", label: "Total asleep", color: "var(--ink)", format: hmin }, ...stages],
                  tipLabel,
                )}
              />
              {stages.map((s) => (
                <Bar key={s.key} dataKey={s.key} stackId="s" fill={s.color} maxBarSize={18} isAnimationActive={false} />
              ))}
            </BarChart>
          </ResponsiveContainer>
        </TrendCard>

        <TrendCard
          title="Sleep score"
          subtitle={`0–100, from Garmin. ${unitNote}.`}
          aside={<Average s={summary(shown, prev, "score")} format={int} delta={int} higherIsBetter />}
        >
          {line("score", "Sleep score", int, 32, [(min: number) => Math.max(0, Math.floor((min - 5) / 10) * 10), 100])}
        </TrendCard>

        <TrendCard
          title="Resting heart rate"
          subtitle={`Lower over weeks = fitter or better rested. A jump of 5+ bpm can mean illness, stress or fatigue.`}
          aside={<Average s={summary(shown, prev, "rhr")} format={(v) => `${v.toFixed(0)} bpm`} delta={(v) => `${v.toFixed(1)} bpm`} higherIsBetter={false} />}
        >
          {line("rhr", "Resting HR", (v) => `${v.toFixed(daily ? 0 : 1)} bpm`)}
        </TrendCard>

        <TrendCard
          title="VO2 max"
          subtitle="Garmin’s estimate, updated after runs and rides with heart rate. Higher = fitter."
          aside={
            hasVo2 || vo2Last("vo2Ride") != null ? (
              <div className="shrink-0 text-right">
                {(["vo2Ride", "vo2Run"] as const).map((k) => {
                  const last = vo2Last(k);
                  const first = vo2First(k);
                  if (last == null) return null;
                  const diff = first == null ? 0 : last - first;
                  return (
                    <p key={k} className="num text-xs text-ink-2">
                      {k === "vo2Ride" ? "Cycling" : "Running"} <span className="text-sm font-bold text-ink">{last.toFixed(1)}</span>
                      {Math.abs(diff) >= 0.05 && (
                        <span className={diff > 0 ? "text-good" : "text-critical"}> {diff > 0 ? "+" : "−"}{Math.abs(diff).toFixed(1)}</span>
                      )}
                    </p>
                  );
                })}
              </div>
            ) : null
          }
        >
          {vo2Rows.some((x) => x.vo2Run != null || x.vo2Ride != null) ? (
            <>
              <Legend series={vo2Series} />
              <ResponsiveContainer width="100%" height={180}>
                <ComposedChart data={vo2Rows} {...chartProps}>
                  {GRID}
                  {xAxis}
                  <YAxis
                    {...AXIS}
                    axisLine={false}
                    width={32}
                    domain={[(min: number) => Math.floor(min - 1), (max: number) => Math.ceil(max + 1)]}
                    allowDecimals={false}
                  />
                  <Tooltip cursor={CURSOR} content={makeTip(vo2Series, tipLabel)} />
                  {vo2Series.map((s) => (
                    <Line key={s.key} type="stepAfter" dataKey={s.key} stroke={s.color} strokeWidth={2} dot={false} isAnimationActive={false} />
                  ))}
                </ComposedChart>
              </ResponsiveContainer>
            </>
          ) : (
            <p className="py-6 text-center text-sm text-ink-2">No VO2 max estimate in this period.</p>
          )}
        </TrendCard>

        <TrendCard
          title="Body Battery"
          subtitle="Each day’s highest and lowest charge, 0–100. A high top means you recharged well overnight."
          aside={<Average s={summary(shown, prev, "bbHigh")} label="avg top" format={int} delta={int} higherIsBetter />}
        >
          <Legend series={[{ ...bbSeries[0], label: daily ? "Day’s range, lowest to highest" : "Range, weekly average" }]} shape="rect" />
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={rows.map((x) => ({ ...x, bb: x.bbHigh != null && x.bbLow != null ? [x.bbLow, x.bbHigh] : null }))} {...chartProps} barCategoryGap={daily ? "15%" : "25%"}>
              {GRID}
              {xAxis}
              <YAxis {...AXIS} axisLine={false} width={32} domain={[0, 100]} ticks={[0, 25, 50, 75, 100]} />
              <Tooltip cursor={{ fill: "var(--rock)" }} content={makeTip(bbSeries, tipLabel)} />
              <Bar dataKey="bb" fill="var(--teal)" fillOpacity={0.75} radius={2} maxBarSize={18} isAnimationActive={false} />
            </BarChart>
          </ResponsiveContainer>
        </TrendCard>

        <TrendCard
          title="Stress"
          subtitle="Garmin’s average stress level through the day, 0–100, from heart rate. Under 25 is resting."
          aside={<Average s={summary(shown, prev, "stress")} format={int} delta={int} higherIsBetter={false} />}
        >
          {line("stress", "Stress", int, 32, [0, stressTop], Array.from({ length: stressTop / 10 + 1 }, (_, i) => i * 10))}
        </TrendCard>

        <TrendCard
          title="Steps"
          subtitle={`${unitNote}. Today is left out until the day is over.`}
          aside={<Average s={summary(shown, prev, "steps")} format={int} delta={int} higherIsBetter />}
        >
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={rows} {...chartProps} barCategoryGap={daily ? "15%" : "25%"}>
              {GRID}
              {xAxis}
              <YAxis
                {...AXIS}
                axisLine={false}
                width={36}
                domain={[0, stepsTop]}
                ticks={Array.from({ length: stepsTop / stepsStep + 1 }, (_, i) => i * stepsStep)}
                tickFormatter={(v) => (v >= 1000 ? `${v / 1000}k` : String(v))}
              />
              <Tooltip
                cursor={{ fill: "var(--rock)" }}
                content={makeTip([{ key: "steps", label: daily ? "Steps" : "Steps a day", color: "var(--teal)", format: int }], tipLabel)}
              />
              <Bar dataKey="steps" fill="var(--teal)" maxBarSize={18} isAnimationActive={false} />
            </BarChart>
          </ResponsiveContainer>
        </TrendCard>
      </div>
    </section>
  );
}

function TrendCard({
  title,
  subtitle,
  aside,
  wide = false,
  children,
}: {
  title: string;
  subtitle: string;
  aside: ReactNode;
  wide?: boolean;
  children: ReactNode;
}) {
  return (
    <Card title={title} subtitle={subtitle} action={aside} className={wide ? "lg:col-span-2" : ""}>
      {children}
    </Card>
  );
}
