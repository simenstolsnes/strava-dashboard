"use client";

import {
  Area,
  Bar,
  BarChart,
  CartesianGrid,
  ComposedChart,
  Line,
  LineChart,
  ReferenceArea,
  ReferenceLine,
  ResponsiveContainer,
  Scatter,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useState, type ReactNode } from "react";
import Link from "next/link";

// ---------- shared chrome ----------

export const AXIS = { stroke: "var(--border)", tickLine: false, tick: { fill: "var(--muted)", fontSize: 12 } } as const;
export const GRID = <CartesianGrid stroke="var(--hairline)" vertical={false} />;
export const CURSOR = { stroke: "var(--muted)", strokeWidth: 1 };
const compact = (v: number) => (Math.abs(v) >= 1000 ? `${(v / 1000).toFixed(v % 1000 === 0 ? 0 : 2)}k` : String(Math.round(v)));

/** `dashed` marks an estimate: drawn dashed everywhere, measured values stay solid. */
export type Series = { key: string; label: string; color: string; format?: (v: number) => string; dashed?: boolean };

export const lineKey = (s: Series, w = 12) =>
  s.dashed ? (
    <span className="inline-block shrink-0" style={{ width: w, borderTop: `2px dashed ${s.color}` }} />
  ) : (
    <span className="inline-block h-0.5 shrink-0 rounded" style={{ width: w, background: s.color }} />
  );

type TipProps = {
  active?: boolean;
  label?: string | number;
  payload?: ReadonlyArray<{ payload?: Record<string, unknown> }>;
};

/** Tooltip: value first (strong), series name second, keyed by a short line. */
export function makeTip(series: Series[], labelFormat: (l: string | number, row?: Record<string, unknown>) => ReactNode) {
  return function Tip({ active, label, payload }: TipProps) {
    if (!active || !payload?.length) return null;
    const row = payload[0]?.payload;
    return (
      <div className="rounded-lg border border-line bg-plate px-3 py-2 text-xs shadow-lg">
        <p className="mb-1 text-muted">{labelFormat(label ?? "", row)}</p>
        {series.map((s) => {
          const v = row?.[s.key];
          if (v == null) return null;
          return (
            <p key={s.key} className="flex items-center gap-2">
              {lineKey(s)}
              <span className="num font-semibold text-ink">{s.format ? s.format(Number(v)) : String(v)}</span>
              <span className="text-ink-2">{s.label}</span>
            </p>
          );
        })}
      </div>
    );
  };
}

export function Legend({ series, shape = "line" }: { series: Series[]; shape?: "line" | "rect" }) {
  return (
    <ul className="mb-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-ink-2">
      {series.map((s) => (
        <li key={s.key} className="flex items-center gap-1.5">
          {shape === "line" ? lineKey(s, 16) : <span className="inline-block h-2.5 w-2.5 rounded-[2px]" style={{ background: s.color }} />}
          {s.label}
        </li>
      ))}
    </ul>
  );
}

const dayLabel = (d: string | number) =>
  new Date(`${d}T00:00:00Z`).toLocaleDateString("en-GB", { day: "numeric", month: "short", timeZone: "UTC" });
const monthLabel = (m: string | number) =>
  new Date(`${m}-01T00:00:00Z`).toLocaleDateString("en-GB", { month: "short", timeZone: "UTC" });

// ---------- Fitness & fatigue ----------

const FITNESS_RANGES = {
  "4m": { label: "4 months", days: 122 },
  "1y": { label: "1 year", days: 365 },
  "2y": { label: "2 years", days: 730 },
} as const;

const fullDay = (d: string | number) =>
  new Date(`${d}T00:00:00Z`).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });

export function FitnessChart({
  data,
}: {
  data: { date: string; fitness?: number; fatigue?: number; fitnessRest?: number; fatigueRest?: number }[];
}) {
  const series: Series[] = [
    { key: "fitness", label: "Fitness", color: "var(--fitness)", format: (v) => v.toFixed(0) },
    { key: "fatigue", label: "Fatigue", color: "var(--fatigue)", format: (v) => v.toFixed(0) },
    { key: "fitnessRest", label: "Fitness if you rest", color: "var(--fitness)", format: (v) => v.toFixed(0), dashed: true },
    { key: "fatigueRest", label: "Fatigue if you rest", color: "var(--fatigue)", format: (v) => v.toFixed(0), dashed: true },
  ];
  const today = data.find((d) => d.fitnessRest != null && d.fitness != null)?.date;
  const [range, setRange] = useState<keyof typeof FITNESS_RANGES>("4m");
  const from = (() => {
    const d = new Date(`${today ?? data.at(-1)?.date}T00:00:00Z`);
    d.setUTCDate(d.getUTCDate() - FITNESS_RANGES[range].days);
    return d.toISOString().slice(0, 10);
  })();
  const shown = data.filter((d) => d.date >= from);
  const long = range !== "4m";
  const tick = (d: string | number) =>
    long
      ? new Date(`${d}T00:00:00Z`).toLocaleDateString("en-GB", { month: "short", year: "2-digit", timeZone: "UTC" })
      : dayLabel(d);
  return (
    <>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <Legend series={[series[0], series[1], { ...series[2], label: "Next 7 days if you rest", color: "var(--muted)" }]} />
        <div role="radiogroup" aria-label="Time range" className="flex rounded-md border border-line bg-rock/50 p-0.5">
          {(Object.keys(FITNESS_RANGES) as (keyof typeof FITNESS_RANGES)[]).map((k) => (
            <button
              key={k}
              type="button"
              role="radio"
              aria-checked={range === k}
              onClick={() => setRange(k)}
              className={`rounded px-2.5 py-1 text-xs font-semibold ${range === k ? "bg-teal text-white" : "text-ink-2 hover:text-ink"}`}
            >
              {FITNESS_RANGES[k].label}
            </button>
          ))}
        </div>
      </div>
      <ResponsiveContainer width="100%" height={200}>
        <ComposedChart data={shown} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
          {GRID}
          <XAxis dataKey="date" {...AXIS} tickFormatter={tick} minTickGap={40} />
          <YAxis {...AXIS} axisLine={false} width={32} />
          {today && <ReferenceLine x={today} stroke="var(--muted)" strokeWidth={1} />}
          <Tooltip cursor={CURSOR} content={makeTip(series, (l) => fullDay(l))} />
          <Area dataKey="fitness" stroke="var(--fitness)" strokeWidth={2} fill="var(--fitness)" fillOpacity={0.1} dot={false} isAnimationActive={false} />
          <Line dataKey="fatigue" stroke="var(--fatigue)" strokeWidth={2} dot={false} isAnimationActive={false} />
          <Line dataKey="fitnessRest" stroke="var(--fitness)" strokeWidth={2} strokeDasharray="5 4" dot={false} isAnimationActive={false} />
          <Line dataKey="fatigueRest" stroke="var(--fatigue)" strokeWidth={2} strokeDasharray="5 4" dot={false} isAnimationActive={false} />
        </ComposedChart>
      </ResponsiveContainer>
    </>
  );
}

export function FormChart({ data }: { data: { date: string; form: number }[] }) {
  const series: Series[] = [{ key: "form", label: "Form", color: "var(--form)", format: (v) => v.toFixed(0) }];
  const min = Math.min(-35, ...data.map((d) => d.form));
  const max = Math.max(30, ...data.map((d) => d.form));
  return (
    <>
      <ResponsiveContainer width="100%" height={150}>
        <LineChart data={data} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
          <ReferenceArea y1={-30} y2={-10} fill="var(--good)" fillOpacity={0.08} />
          <ReferenceArea y1={min} y2={-30} fill="var(--critical)" fillOpacity={0.08} />
          {GRID}
          <ReferenceLine y={0} stroke="var(--border)" />
          <XAxis dataKey="date" {...AXIS} tickFormatter={dayLabel} minTickGap={40} />
          <YAxis {...AXIS} axisLine={false} width={32} domain={[Math.floor(min), Math.ceil(max)]} />
          <Tooltip cursor={CURSOR} content={makeTip(series, (l) => dayLabel(l))} />
          <Line dataKey="form" stroke="var(--form)" strokeWidth={2} dot={false} isAnimationActive={false} />
        </LineChart>
      </ResponsiveContainer>
      <p className="mt-1 text-xs text-muted">
        Green band: optimal training (−10 to −30). Red band: high fatigue (below −30).
      </p>
    </>
  );
}

// ---------- Stacked totals by sport ----------

const sportSeries = (fmt: (v: number) => string): Series[] => [
  { key: "ride", label: "Ride", color: "var(--s-ride)", format: fmt },
  { key: "run", label: "Run", color: "var(--s-run)", format: fmt },
  { key: "strength", label: "Strength & HIIT", color: "var(--s-strength)", format: fmt },
  { key: "other", label: "Other", color: "var(--s-other)", format: fmt },
];

const kcalFmt = (v: number) => `${Math.round(v).toLocaleString("en-GB")} kcal`;

export function SportHoursChart({
  data,
  by,
  unit = "h",
}: {
  data: Array<Record<string, number | string>>;
  by: "week" | "month";
  unit?: "h" | "kcal";
}) {
  const series = sportSeries(unit === "h" ? (v) => `${v.toFixed(1)} h` : kcalFmt);
  const fmt = by === "week" ? dayLabel : monthLabel;
  return (
    <>
      <Legend series={series} shape="rect" />
      <ResponsiveContainer width="100%" height={200}>
        <BarChart data={data} margin={{ top: 4, right: 4, left: 0, bottom: 0 }} barCategoryGap="25%">
          {GRID}
          <XAxis dataKey={by} {...AXIS} tickFormatter={fmt} minTickGap={8} />
          <YAxis
            {...AXIS}
            axisLine={false}
            width={unit === "h" ? 32 : 40}
            tickFormatter={(v) => (unit === "h" ? `${v}h` : compact(v))}
          />
          <Tooltip
            cursor={{ fill: "var(--rock)" }}
            content={makeTip(series, (l) => (by === "week" ? `Week of ${dayLabel(l)}` : monthLabel(l)))}
          />
          {series.map((s) => (
            <Bar key={s.key} dataKey={s.key} stackId="h" fill={s.color} stroke="var(--plate)" strokeWidth={2} maxBarSize={24} isAnimationActive={false} />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </>
  );
}

// ---------- Power ----------

const curveLabel = (s: number) => (s < 60 ? `${s}s` : s < 3600 ? `${s / 60}m` : `${s / 3600}h`);

export type Holder = { id: number; name: string; date: string } | null;

/** Recharts reports the clicked category index on chart clicks. */
const clickedIndex = (state: unknown): number | null => {
  const st = state as { activeIndex?: unknown; activeTooltipIndex?: unknown } | null;
  const i = Number(st?.activeIndex ?? st?.activeTooltipIndex);
  return Number.isInteger(i) && i >= 0 ? i : null;
};

/** Which activities set the selected best efforts, each linking to the activity. */
function EffortPanel({ title, rows }: { title: string; rows: { series: Series; value: number | null; holder: Holder }[] }) {
  const shown = rows.filter((r) => r.value != null && r.holder);
  return (
    <div className="mt-3 rounded-md border border-line bg-rock/40 p-3" aria-live="polite">
      <p className="label">{title}</p>
      {shown.length ? (
        <ul className="mt-2 space-y-2">
          {shown.map((r) => (
            <li key={r.series.key} className="flex items-center gap-2.5 text-sm">
              {lineKey(r.series, 14)}
              <span className="num w-[4.5rem] shrink-0 font-bold text-ink">{r.series.format!(r.value!).split(" · ")[0]}</span>
              <Link href={`/activities/${r.holder!.id}`} className="min-w-0 flex-1 truncate font-semibold text-teal hover:underline">
                {r.holder!.name}
              </Link>
              <span className="shrink-0 text-xs text-ink-2">{dayLabel(r.holder!.date.slice(0, 10))}</span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-1 text-sm text-ink-2">No efforts for this point.</p>
      )}
    </div>
  );
}

type CurveRow = {
  seconds: number;
  last90: number | null;
  prev90: number | null;
  allTime: number | null;
  holders: { last90: Holder; prev90: Holder; allTime: Holder };
};

export function PowerCurveChart({ data, weight }: { data: CurveRow[]; weight: number | null }) {
  const w = (v: number) => (weight ? `${v} W · ${(v / weight).toFixed(2)} W/kg` : `${v} W`);
  const series: Series[] = [
    { key: "last90", label: "Last 90 days", color: "var(--s-ride)", format: w },
    { key: "prev90", label: "90 days before", color: "var(--ink-2)", format: w },
    { key: "allTime", label: "All synced", color: "var(--s-strength)", format: w },
  ];
  const rows = data.map((d) => ({ ...d, label: curveLabel(d.seconds) }));
  const [sel, setSel] = useState(Math.max(0, rows.findIndex((r) => r.seconds === 1200)));
  const row = rows[Math.min(sel, rows.length - 1)];
  type K = "last90" | "prev90" | "allTime";
  return (
    <>
      <Legend series={series} />
      <ResponsiveContainer width="100%" height={240}>
        <LineChart
          data={rows}
          margin={{ top: 4, right: 8, left: 0, bottom: 0 }}
          onClick={(st) => {
            const i = clickedIndex(st);
            if (i !== null) setSel(i);
          }}
          style={{ cursor: "pointer" }}
        >
          {GRID}
          <XAxis dataKey="label" {...AXIS} interval="preserveStartEnd" minTickGap={4} />
          <YAxis {...AXIS} axisLine={false} width={40} tickFormatter={compact} />
          {row && <ReferenceLine x={row.label} stroke="var(--muted)" strokeDasharray="3 3" />}
          <Tooltip cursor={CURSOR} content={makeTip(series, (l) => `Best ${l} · tap to see the rides`)} />
          {series.map((s) => (
            <Line
              key={s.key}
              dataKey={s.key}
              stroke={s.color}
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 5, stroke: "var(--plate)", strokeWidth: 2 }}
              connectNulls
              isAnimationActive={false}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
      {row && (
        <EffortPanel
          title={`Best ${row.label}: who set it`}
          rows={series.map((s) => ({ series: s, value: row[s.key as K], holder: row.holders[s.key as K] }))}
        />
      )}
    </>
  );
}

type MonthRow = {
  month: string;
  p1m: number | null;
  p5m: number | null;
  p20m: number | null;
  holders: { p1m: Holder; p5m: Holder; p20m: Holder };
};

export function MonthlyPowerChart({ data }: { data: MonthRow[] }) {
  const series: Series[] = [
    { key: "p1m", label: "1 min", color: "var(--s-ride)", format: (v) => `${v} W` },
    { key: "p5m", label: "5 min", color: "var(--s-strength)", format: (v) => `${v} W` },
    { key: "p20m", label: "20 min", color: "var(--ink-2)", format: (v) => `${v} W` },
  ];
  const lastWithData = data.reduce((acc, r, i) => (r.p1m || r.p5m || r.p20m ? i : acc), data.length - 1);
  const [sel, setSel] = useState(lastWithData);
  const row = data[Math.min(sel, data.length - 1)];
  type K = "p1m" | "p5m" | "p20m";
  const monthName = (m: string) =>
    new Date(`${m}-01T00:00:00Z`).toLocaleDateString("en-GB", { month: "long", year: "numeric", timeZone: "UTC" });
  return (
    <>
      <Legend series={series} />
      <ResponsiveContainer width="100%" height={200}>
        <LineChart
          data={data}
          margin={{ top: 4, right: 8, left: 0, bottom: 0 }}
          onClick={(st) => {
            const i = clickedIndex(st);
            if (i !== null) setSel(i);
          }}
          style={{ cursor: "pointer" }}
        >
          {GRID}
          <XAxis dataKey="month" {...AXIS} tickFormatter={monthLabel} />
          <YAxis {...AXIS} axisLine={false} width={40} tickFormatter={compact} />
          {row && <ReferenceLine x={row.month} stroke="var(--muted)" strokeDasharray="3 3" />}
          <Tooltip cursor={CURSOR} content={makeTip(series, (l) => `${monthLabel(l)} · tap to see the rides`)} />
          {series.map((s) => (
            <Line
              key={s.key}
              dataKey={s.key}
              stroke={s.color}
              strokeWidth={2}
              dot={{ r: 3, fill: s.color, stroke: "var(--plate)", strokeWidth: 2 }}
              activeDot={{ r: 5, stroke: "var(--plate)", strokeWidth: 2 }}
              connectNulls
              isAnimationActive={false}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
      {row && (
        <EffortPanel
          title={`Best efforts in ${monthName(row.month)}`}
          rows={series.map((s) => ({ series: s, value: row[s.key as K], holder: row.holders[s.key as K] }))}
        />
      )}
    </>
  );
}

// ---------- Trend (dots + rolling line) ----------

export function TrendChart({
  data,
  label,
  kind,
}: {
  data: { date: string; name: string; value: number; trend: number }[];
  label: string;
  kind: "pace" | "watts" | "bpm";
}) {
  const fmt =
    kind === "pace"
      ? (v: number) => `${Math.floor(v / 60)}:${String(Math.round(v % 60)).padStart(2, "0")} /km`
      : kind === "bpm"
        ? (v: number) => `${Math.round(v)} bpm`
        : (v: number) => `${Math.round(v)} W`;
  const series: Series[] = [
    { key: "value", label, color: "var(--s-ride)", format: fmt },
    { key: "trend", label: "6-week trend (estimate)", color: "var(--ink-2)", format: fmt, dashed: true },
  ];
  // Clamp the axis to the 5th–95th percentile so one odd session can't flatten the trend;
  // out-of-range sessions sit on the edge as hollow marks (the tooltip keeps the real value).
  const sorted = data.map((d) => d.value).sort((a, b) => a - b);
  const q = (p: number) => sorted[Math.min(sorted.length - 1, Math.max(0, Math.round(p * (sorted.length - 1))))] ?? 0;
  const pad = Math.max(1, (q(0.95) - q(0.05)) * 0.2);
  // Round outward to nice steps: 30 s for pace, 25 W for power (doubling until ≤ 6 ticks)
  let step = kind === "pace" ? 30 : kind === "bpm" ? 5 : 25;
  const rawLo = q(0.05) - pad;
  const rawHi = q(0.95) + pad;
  while ((rawHi - rawLo) / step > 5) step *= 2;
  // Heart-rate drops cannot be negative; keep that axis at 0 or above
  const lo = Math.max(kind === "bpm" ? 0 : -Infinity, Math.floor(rawLo / step) * step);
  const hi = Math.ceil(rawHi / step) * step;
  const ticks = Array.from({ length: Math.round((hi - lo) / step) + 1 }, (_, i) => lo + i * step);
  // Off-scale sessions sit just inside the edge so their marker renders whole
  const inset = (hi - lo) * 0.03;
  const rows = data.map((d) => ({
    ...d,
    t: new Date(`${d.date}T00:00:00Z`).getTime(),
    plot: d.value < lo ? lo + inset : d.value > hi ? hi - inset : d.value,
    clamped: d.value < lo || d.value > hi,
  }));
  return (
    <>
      <Legend series={[{ ...series[0], label: "Session (hollow = off the scale)" }, series[1]]} />
      <ResponsiveContainer width="100%" height={200}>
        <ComposedChart data={rows} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
          {GRID}
          <XAxis
            dataKey="t"
            type="number"
            scale="time"
            domain={["dataMin", "dataMax"]}
            {...AXIS}
            tickFormatter={(t) => dayLabel(new Date(t).toISOString().slice(0, 10))}
            minTickGap={40}
          />
          <YAxis
            {...AXIS}
            axisLine={false}
            width={56}
            reversed={kind === "pace"}
            domain={[lo, hi]}
            ticks={ticks}
            allowDataOverflow
            tickFormatter={(v) => fmt(v).replace(" /km", "").replace(" bpm", "")}
          />
          <Tooltip cursor={CURSOR} content={makeTip(series, (_, row) => `${row?.name ?? ""} · ${dayLabel(String(row?.date))}`)} />
          <Scatter
            dataKey="plot"
            isAnimationActive={false}
            shape={(props: { cx?: number; cy?: number; payload?: { clamped?: boolean } }) =>
              props.payload?.clamped ? (
                <circle cx={props.cx} cy={props.cy} r={4} fill="var(--plate)" stroke="var(--s-ride)" strokeWidth={1.5} />
              ) : (
                <circle cx={props.cx} cy={props.cy} r={4} fill="var(--s-ride)" fillOpacity={0.6} />
              )
            }
          />
          <Line dataKey="trend" stroke="var(--ink-2)" strokeWidth={2} strokeDasharray="5 4" dot={false} isAnimationActive={false} />
        </ComposedChart>
      </ResponsiveContainer>
    </>
  );
}

// ---------- Activity streams (small multiples sharing a crosshair) ----------

/** Plot-area insets of the stream charts, so the lap strip can line up with them. */
export const STREAM_PLOT = { left: 52, right: 4 };

export function StreamChart({
  data,
  dataKey,
  label,
  unit,
  color = "var(--s-ride)",
  valueFormat = "round",
  reference,
  reversed = false,
  height = 120,
  laps,
  selectedLap = null,
  onPickTime,
}: {
  data: Array<Record<string, number | null>>;
  dataKey: string;
  label: string;
  unit: string;
  color?: string;
  /** Serializable format choice (functions can't cross the server/client boundary) */
  valueFormat?: "round" | "pace" | "decimal";
  reference?: { y: number; label: string };
  reversed?: boolean;
  height?: number;
  /** Lap boundaries in stream seconds; drawn as alternating bands with divider lines */
  laps?: { start: number; end: number }[];
  selectedLap?: number | null;
  /** Called with the clicked time (s), so a lap can be selected from the chart */
  onPickTime?: (t: number) => void;
}) {
  const f =
    valueFormat === "pace"
      ? (v: number) => `${Math.floor(v / 60)}:${String(Math.round(v % 60)).padStart(2, "0")} ${unit}`
      : valueFormat === "decimal"
        ? (v: number) => `${v.toFixed(1)} ${unit}`
        : (v: number) => `${Math.round(v)} ${unit}`;
  const series: Series[] = [{ key: dataKey, label, color, format: f }];
  const minutes = (s: number | string) => {
    const n = Number(s);
    const h = Math.floor(n / 3600);
    const m = Math.floor((n % 3600) / 60);
    return h ? `${h}:${String(m).padStart(2, "0")}` : `${m}m`;
  };
  return (
    <div>
      <p className="mb-1 text-xs font-medium text-ink-2">{label}</p>
      <ResponsiveContainer width="100%" height={height}>
        <ComposedChart
          data={data}
          syncId="activity"
          margin={{ top: 4, right: STREAM_PLOT.right, left: 0, bottom: 0 }}
          onClick={(st) => {
            const t = Number((st as { activeLabel?: unknown } | null)?.activeLabel);
            if (onPickTime && Number.isFinite(t)) onPickTime(t);
          }}
          style={onPickTime ? { cursor: "pointer" } : undefined}
        >
          {laps?.map((l, i) => (
            <ReferenceArea
              key={`band-${i}`}
              x1={l.start}
              x2={l.end}
              ifOverflow="hidden"
              fill={i === selectedLap ? "var(--teal)" : "var(--rock-2)"}
              fillOpacity={i === selectedLap ? 0.16 : i % 2 ? 0.55 : 0}
              strokeOpacity={0}
            />
          ))}
          {GRID}
          {laps?.slice(1).map((l, i) => (
            <ReferenceLine key={`div-${i}`} x={l.start} stroke="var(--border)" strokeWidth={1} ifOverflow="hidden" />
          ))}
          <XAxis dataKey="time" type="number" domain={["dataMin", "dataMax"]} {...AXIS} tickFormatter={minutes} minTickGap={40} />
          <YAxis {...AXIS} axisLine={false} width={STREAM_PLOT.left} domain={["auto", "auto"]} reversed={reversed} tickFormatter={(v) => f(v).replace(/ .*/, "")} />
          {reference &&<ReferenceLine y={reference.y} stroke="var(--muted)" label={{ value: reference.label, fill: "var(--muted)", fontSize: 12, position: "insideTopRight" }} />}
          <Tooltip cursor={CURSOR} content={makeTip(series, (l) => minutes(l))} />
          <Area dataKey={dataKey} stroke={color} strokeWidth={1.5} fill={color} fillOpacity={0.1} dot={false} connectNulls isAnimationActive={false} />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}

// ---------- Activity power curve vs 90-day best ----------

export function ActivityCurveChart({ data }: { data: { seconds: number; activity: number | null; best90: number | null }[] }) {
  const series: Series[] = [
    { key: "activity", label: "This activity", color: "var(--s-ride)", format: (v) => `${v} W` },
    { key: "best90", label: "90-day best", color: "var(--ink-2)", format: (v) => `${v} W` },
  ];
  const rows = data.map((d) => ({ ...d, label: curveLabel(d.seconds) }));
  return (
    <>
      <Legend series={series} />
      <ResponsiveContainer width="100%" height={200}>
        <LineChart data={rows} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
          {GRID}
          <XAxis dataKey="label" {...AXIS} interval="preserveStartEnd" />
          <YAxis {...AXIS} axisLine={false} width={40} tickFormatter={compact} />
          <Tooltip cursor={CURSOR} content={makeTip(series, (l) => `Best ${l}`)} />
          {series.map((s) => (
            <Line key={s.key} dataKey={s.key} stroke={s.color} strokeWidth={2} dot={false} connectNulls isAnimationActive={false} />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </>
  );
}
