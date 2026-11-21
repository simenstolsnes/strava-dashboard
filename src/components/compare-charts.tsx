"use client";

import { useState } from "react";
import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { AXIS, CURSOR, GRID, Legend, makeTip, type Series } from "./charts";

export type RaceRow = { date: string } & Record<string, number | string>;
export type Racer = { id: number; name: string; color: string };

const dateLabel = (d: string | number) =>
  new Date(`${d}T00:00:00Z`).toLocaleDateString("en-GB", { day: "numeric", month: "short", timeZone: "UTC" });

/** Running totals through the period, one line per person: who is ahead, and since when. */
export function RaceChart({ rows, racers }: { rows: RaceRow[]; racers: Racer[] }) {
  const [metric, setMetric] = useState<"h" | "km">("h");
  const series: Series[] = racers.map((r) => ({
    key: `${metric}_${r.id}`,
    label: r.name,
    color: r.color,
    format: (v) => (metric === "h" ? `${v.toFixed(1)} h` : `${Math.round(v)} km`),
  }));
  const tabs = [
    { key: "h", label: "Training hours" },
    { key: "km", label: "Ride km" },
  ] as const;
  return (
    <>
      <div className="mb-3 flex gap-2" role="tablist" aria-label="Measure">
        {tabs.map((t) => (
          <button
            key={t.key}
            role="tab"
            aria-selected={metric === t.key}
            onClick={() => setMetric(t.key)}
            className={`rounded-full border px-3 py-1.5 text-xs font-semibold ${
              metric === t.key ? "border-teal bg-teal text-white" : "border-line bg-plate text-ink-2 hover:text-ink"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>
      <Legend series={series} />
      <ResponsiveContainer width="100%" height={220}>
        <LineChart data={rows} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
          {GRID}
          <XAxis dataKey="date" {...AXIS} tickFormatter={dateLabel} minTickGap={24} />
          <YAxis
            {...AXIS}
            axisLine={false}
            width={40}
            tickFormatter={(v) => (metric === "h" ? `${v}h` : String(Math.round(v)))}
          />
          <Tooltip cursor={CURSOR} content={makeTip(series, (l) => dateLabel(l))} />
          {series.map((s) => (
            <Line
              key={s.key}
              dataKey={s.key}
              stroke={s.color}
              strokeWidth={2}
              dot={false}
              type="stepAfter"
              isAnimationActive={false}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </>
  );
}
