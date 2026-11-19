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
import type { ReactNode } from "react";

// ---------- shared chrome ----------

const AXIS = { stroke: "var(--axis)", tickLine: false, tick: { fill: "var(--muted)", fontSize: 11 } } as const;
const GRID = <CartesianGrid stroke="var(--grid)" vertical={false} />;
const CURSOR = { stroke: "var(--muted)", strokeWidth: 1 };

export type Series = { key: string; label: string; color: string; format?: (v: number) => string };

type TipProps = {
  active?: boolean;
  label?: string | number;
  payload?: ReadonlyArray<{ payload?: Record<string, unknown> }>;
};

/** Tooltip: value first (strong), series name second, keyed by a short line. */
function makeTip(series: Series[], labelFormat: (l: string | number, row?: Record<string, unknown>) => ReactNode) {
  return function Tip({ active, label, payload }: TipProps) {
    if (!active || !payload?.length) return null;
    const row = payload[0]?.payload;
    return (
      <div className="rounded-lg border border-line bg-surface px-3 py-2 text-xs shadow-lg">
        <p className="mb-1 text-muted">{labelFormat(label ?? "", row)}</p>
        {series.map((s) => {
          const v = row?.[s.key];
          if (v == null) return null;
          return (
            <p key={s.key} className="flex items-center gap-2">
              <span className="inline-block h-0.5 w-3 rounded" style={{ background: s.color }} />
              <span className="tabular font-semibold text-ink">{s.format ? s.format(Number(v)) : String(v)}</span>
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
          <span
            className={shape === "line" ? "inline-block h-0.5 w-3.5 rounded" : "inline-block h-2.5 w-2.5 rounded-sm"}
            style={{ background: s.color }}
          />
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

export function FitnessChart({ data }: { data: { date: string; fitness: number; fatigue: number }[] }) {
  const series: Series[] = [
    { key: "fitness", label: "Fitness", color: "var(--s1)", format: (v) => v.toFixed(0) },
    { key: "fatigue", label: "Fatigue", color: "var(--s2)", format: (v) => v.toFixed(0) },
  ];
  return (
    <>
      <Legend series={series} />
      <ResponsiveContainer width="100%" height={200}>
        <ComposedChart data={data} margin={{ top: 4, right: 4, left: -24, bottom: 0 }}>
          {GRID}
          <XAxis dataKey="date" {...AXIS} tickFormatter={dayLabel} minTickGap={40} />
          <YAxis {...AXIS} axisLine={false} width={48} />
          <Tooltip cursor={CURSOR} content={makeTip(series, (l) => dayLabel(l))} />
          <Area dataKey="fitness" stroke="var(--s1)" strokeWidth={2} fill="var(--s1)" fillOpacity={0.1} dot={false} isAnimationActive={false} />
          <Line dataKey="fatigue" stroke="var(--s2)" strokeWidth={2} dot={false} isAnimationActive={false} />
        </ComposedChart>
      </ResponsiveContainer>
    </>
  );
}

export function FormChart({ data }: { data: { date: string; form: number }[] }) {
  const series: Series[] = [{ key: "form", label: "Form", color: "var(--s7)", format: (v) => v.toFixed(0) }];
  const min = Math.min(-35, ...data.map((d) => d.form));
  const max = Math.max(30, ...data.map((d) => d.form));
  return (
    <>
      <ResponsiveContainer width="100%" height={150}>
        <LineChart data={data} margin={{ top: 4, right: 4, left: -24, bottom: 0 }}>
          <ReferenceArea y1={-30} y2={-10} fill="var(--good)" fillOpacity={0.08} />
          <ReferenceArea y1={min} y2={-30} fill="var(--critical)" fillOpacity={0.08} />
          {GRID}
          <ReferenceLine y={0} stroke="var(--axis)" />
          <XAxis dataKey="date" {...AXIS} tickFormatter={dayLabel} minTickGap={40} />
          <YAxis {...AXIS} axisLine={false} width={48} domain={[Math.floor(min), Math.ceil(max)]} />
          <Tooltip cursor={CURSOR} content={makeTip(series, (l) => dayLabel(l))} />
          <Line dataKey="form" stroke="var(--s7)" strokeWidth={2} dot={false} isAnimationActive={false} />
        </LineChart>
      </ResponsiveContainer>
      <p className="mt-1 text-xs text-muted">
        Green band: optimal training (−10 to −30). Red band: high fatigue (below −30).
      </p>
    </>
  );
}

// ---------- Stacked hours by sport ----------

const SPORT_SERIES: Series[] = [
  { key: "ride", label: "Ride", color: "var(--s1)", format: (v) => `${v.toFixed(1)} h` },
  { key: "run", label: "Run", color: "var(--s2)", format: (v) => `${v.toFixed(1)} h` },
  { key: "strength", label: "Strength & HIIT", color: "var(--s3)", format: (v) => `${v.toFixed(1)} h` },
  { key: "other", label: "Other", color: "var(--s4)", format: (v) => `${v.toFixed(1)} h` },
];

export function SportHoursChart({ data, by }: { data: Array<Record<string, number | string>>; by: "week" | "month" }) {
  const xKey = by;
  const fmt = by === "week" ? dayLabel : monthLabel;
  return (
    <>
      <Legend series={SPORT_SERIES} shape="rect" />
      <ResponsiveContainer width="100%" height={200}>
        <BarChart data={data} margin={{ top: 4, right: 4, left: -24, bottom: 0 }} barCategoryGap="25%">
          {GRID}
          <XAxis dataKey={xKey} {...AXIS} tickFormatter={fmt} minTickGap={8} />
          <YAxis {...AXIS} axisLine={false} width={48} unit="h" />
          <Tooltip
            cursor={{ fill: "var(--surface-2)" }}
            content={makeTip(SPORT_SERIES, (l) => (by === "week" ? `Week of ${dayLabel(l)}` : monthLabel(l)))}
          />
          {SPORT_SERIES.map((s) => (
            <Bar key={s.key} dataKey={s.key} stackId="h" fill={s.color} stroke="var(--surface)" strokeWidth={2} maxBarSize={24} isAnimationActive={false} />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </>
  );
}

// ---------- Power ----------

const curveLabel = (s: number) => (s < 60 ? `${s}s` : s < 3600 ? `${s / 60}m` : `${s / 3600}h`);

export function PowerCurveChart({
  data,
  weight,
}: {
  data: { seconds: number; last90: number | null; prev90: number | null; allTime: number | null }[];
  weight: number | null;
}) {
  const w = (v: number) => (weight ? `${v} W · ${(v / weight).toFixed(2)} W/kg` : `${v} W`);
  const series: Series[] = [
    { key: "last90", label: "Last 90 days", color: "var(--s1)", format: w },
    { key: "prev90", label: "90 days before", color: "var(--s2)", format: w },
    { key: "allTime", label: "All synced", color: "var(--s3)", format: w },
  ];
  const rows = data.map((d) => ({ ...d, label: curveLabel(d.seconds) }));
  return (
    <>
      <Legend series={series} />
      <ResponsiveContainer width="100%" height={240}>
        <LineChart data={rows} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
          {GRID}
          <XAxis dataKey="label" {...AXIS} interval="preserveStartEnd" minTickGap={4} />
          <YAxis {...AXIS} axisLine={false} width={52} unit=" W" />
          <Tooltip cursor={CURSOR} content={makeTip(series, (l) => `Best ${l}`)} />
          {series.map((s) => (
            <Line
              key={s.key}
              dataKey={s.key}
              stroke={s.color}
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4, stroke: "var(--surface)", strokeWidth: 2 }}
              connectNulls
              isAnimationActive={false}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </>
  );
}

export function MonthlyPowerChart({ data }: { data: { month: string; p1m: number | null; p5m: number | null; p20m: number | null }[] }) {
  const series: Series[] = [
    { key: "p1m", label: "1 min", color: "var(--s1)", format: (v) => `${v} W` },
    { key: "p5m", label: "5 min", color: "var(--s2)", format: (v) => `${v} W` },
    { key: "p20m", label: "20 min", color: "var(--s3)", format: (v) => `${v} W` },
  ];
  return (
    <>
      <Legend series={series} />
      <ResponsiveContainer width="100%" height={200}>
        <LineChart data={data} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
          {GRID}
          <XAxis dataKey="month" {...AXIS} tickFormatter={monthLabel} />
          <YAxis {...AXIS} axisLine={false} width={52} unit=" W" />
          <Tooltip cursor={CURSOR} content={makeTip(series, (l) => monthLabel(l))} />
          {series.map((s) => (
            <Line
              key={s.key}
              dataKey={s.key}
              stroke={s.color}
              strokeWidth={2}
              dot={{ r: 3, fill: s.color, stroke: "var(--surface)", strokeWidth: 2 }}
              connectNulls
              isAnimationActive={false}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
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
  kind: "pace" | "watts";
}) {
  const fmt = kind === "pace"
    ? (v: number) => `${Math.floor(v / 60)}:${String(Math.round(v % 60)).padStart(2, "0")} /km`
    : (v: number) => `${Math.round(v)} W`;
  const series: Series[] = [
    { key: "value", label, color: "var(--s1)", format: fmt },
    { key: "trend", label: "6-week trend", color: "var(--ink-2)", format: fmt },
  ];
  const rows = data.map((d) => ({ ...d, t: new Date(`${d.date}T00:00:00Z`).getTime() }));
  return (
    <>
      <Legend series={[{ ...series[0], label: "Session" }, series[1]]} />
      <ResponsiveContainer width="100%" height={200}>
        <ComposedChart data={rows} margin={{ top: 4, right: 8, left: -8, bottom: 0 }}>
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
            domain={["auto", "auto"]}
            tickFormatter={(v) => fmt(v).replace(" /km", "")}
          />
          <Tooltip cursor={CURSOR} content={makeTip(series, (_, row) => `${row?.name ?? ""} · ${dayLabel(String(row?.date))}`)} />
          <Scatter dataKey="value" fill="var(--s1)" fillOpacity={0.55} isAnimationActive={false} />
          <Line dataKey="trend" stroke="var(--ink-2)" strokeWidth={2} dot={false} isAnimationActive={false} />
        </ComposedChart>
      </ResponsiveContainer>
    </>
  );
}

// ---------- Activity streams (small multiples sharing a crosshair) ----------

export function StreamChart({
  data,
  dataKey,
  label,
  unit,
  color = "var(--s1)",
  format,
  reference,
  reversed = false,
  height = 120,
}: {
  data: Array<Record<string, number | null>>;
  dataKey: string;
  label: string;
  unit: string;
  color?: string;
  format?: (v: number) => string;
  reference?: { y: number; label: string };
  reversed?: boolean;
  height?: number;
}) {
  const f = format ?? ((v: number) => `${Math.round(v)} ${unit}`);
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
        <ComposedChart data={data} syncId="activity" margin={{ top: 4, right: 4, left: -16, bottom: 0 }}>
          {GRID}
          <XAxis dataKey="time" type="number" domain={["dataMin", "dataMax"]} {...AXIS} tickFormatter={minutes} minTickGap={40} />
          <YAxis {...AXIS} axisLine={false} width={52} domain={["auto", "auto"]} reversed={reversed} tickFormatter={(v) => f(v).replace(/ .*/, "")} />
          {reference && <ReferenceLine y={reference.y} stroke="var(--muted)" label={{ value: reference.label, fill: "var(--muted)", fontSize: 10, position: "insideTopRight" }} />}
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
    { key: "activity", label: "This activity", color: "var(--s1)", format: (v) => `${v} W` },
    { key: "best90", label: "90-day best", color: "var(--s2)", format: (v) => `${v} W` },
  ];
  const rows = data.map((d) => ({ ...d, label: curveLabel(d.seconds) }));
  return (
    <>
      <Legend series={series} />
      <ResponsiveContainer width="100%" height={200}>
        <LineChart data={rows} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
          {GRID}
          <XAxis dataKey="label" {...AXIS} interval="preserveStartEnd" />
          <YAxis {...AXIS} axisLine={false} width={52} unit=" W" />
          <Tooltip cursor={CURSOR} content={makeTip(series, (l) => `Best ${l}`)} />
          {series.map((s) => (
            <Line key={s.key} dataKey={s.key} stroke={s.color} strokeWidth={2} dot={false} connectNulls isAnimationActive={false} />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </>
  );
}
