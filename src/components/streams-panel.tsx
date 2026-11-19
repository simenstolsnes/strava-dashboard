"use client";

import { useEffect, useRef, useState } from "react";
import { StreamChart, STREAM_PLOT } from "./charts";

export type LapView = {
  start: number; // stream seconds
  end: number;
  elapsed: number;
  moving: number;
  distance: number; // m
  avgHr: number | null;
  maxHr: number | null;
  watts: number | null;
  speed: number; // m/s
  cadence: number | null;
};

type Zone = { min: number; max: number };

const dur = (s: number) => {
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = Math.round(s % 60);
  return h ? `${h}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}` : `${m}:${String(sec).padStart(2, "0")}`;
};
const paceOf = (mps: number) => {
  if (!mps) return "–";
  const s = 1000 / mps;
  return `${Math.floor(s / 60)}:${String(Math.round(s % 60)).padStart(2, "0")}`;
};
const zoneOf = (hr: number | null, zones: Zone[] | null) => {
  if (!hr || !zones?.length) return null;
  const i = zones.findIndex((z) => z.max === -1 || hr < z.max);
  return `Z${(i === -1 ? zones.length - 1 : i) + 1}`;
};

/** Stream charts with an optional lap overlay: a strip of lap stats aligned to the time axis. */
export function StreamsPanel({
  rows,
  show,
  isRun,
  ftp,
  laps,
  hrZones,
}: {
  rows: Array<Record<string, number | null>>;
  show: { heartrate: boolean; watts: boolean; speed: boolean; altitude: boolean };
  isRun: boolean;
  ftp: number | null;
  laps: LapView[];
  hrZones: Zone[] | null;
}) {
  const [on, setOn] = useState(false);
  const [sel, setSel] = useState<number | null>(null);
  const strip = useRef<HTMLDivElement>(null);
  const [plotWidth, setPlotWidth] = useState(0);

  useEffect(() => {
    const el = strip.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setPlotWidth(e.contentRect.width));
    ro.observe(el);
    return () => ro.disconnect();
  }, [on]);

  const t0 = Number(rows[0]?.time ?? 0);
  const t1 = Number(rows.at(-1)?.time ?? 1);
  const span = Math.max(1, t1 - t0);
  const hasLaps = laps.length > 1;
  const bands = on && hasLaps ? laps.map((l) => ({ start: l.start, end: l.end })) : undefined;
  const pickTime = on && hasLaps ? (t: number) => setSel(laps.findIndex((l) => t >= l.start && t < l.end)) : undefined;
  const lap = sel != null && sel >= 0 ? laps[sel] : null;

  const chartProps = { data: rows, laps: bands, selectedLap: on ? sel : null, onPickTime: pickTime };

  return (
    <div>
      {hasLaps && (
        <div className="mb-3 flex items-center justify-between gap-3">
          <p className="text-xs text-ink-2">{on ? "Tap a lap, in the strip or a chart, for its numbers." : `${laps.length} laps recorded`}</p>
          <button
            type="button"
            role="switch"
            aria-checked={on}
            onClick={() => {
              setOn(!on);
              setSel(null);
            }}
            className="flex items-center gap-2 rounded-md px-1 py-1 text-sm font-semibold text-ink"
          >
            Laps
            <span className={`relative h-6 w-10 rounded-full transition-colors ${on ? "bg-teal" : "bg-rock-2"}`} aria-hidden>
              <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-plate shadow-sm transition-[left] ${on ? "left-[18px]" : "left-0.5"}`} />
            </span>
          </button>
        </div>
      )}

      {on && hasLaps && (
        <div style={{ paddingLeft: STREAM_PLOT.left, paddingRight: STREAM_PLOT.right }}>
          <div ref={strip} className="relative h-[84px] overflow-hidden rounded-sm border border-line bg-plate" role="listbox" aria-label="Laps">
            {laps.map((l, i) => {
              const left = Math.max(0, ((l.start - t0) / span) * 100);
              const width = Math.max(0, ((Math.min(l.end, t1) - Math.max(l.start, t0)) / span) * 100);
              const px = (width / 100) * plotWidth;
              const active = i === sel;
              const z = zoneOf(l.avgHr, hrZones);
              return (
                <button
                  key={i}
                  type="button"
                  role="option"
                  aria-selected={active}
                  aria-label={`Lap ${i + 1}: ${dur(l.elapsed)}${l.avgHr ? `, ${Math.round(l.avgHr)} bpm` : ""}${l.watts ? `, ${Math.round(l.watts)} W` : ""}`}
                  onClick={() => setSel(active ? null : i)}
                  className={`absolute inset-y-0 overflow-hidden border-l border-line px-1 pt-1 text-center first:border-l-0 ${
                    active ? "bg-teal text-white" : i % 2 ? "bg-rock/60 text-ink" : "text-ink"
                  }`}
                  style={{ left: `${left}%`, width: `${width}%` }}
                >
                  {px >= 14 && <span className={`block text-xs font-bold leading-tight ${active ? "" : "text-ink-2"}`}>{i + 1}</span>}
                  {px >= 58 && (
                    <span className="num block text-xs leading-tight">
                      <span className="block font-semibold">{dur(l.elapsed)}</span>
                      {l.avgHr && (
                        <span className="block">
                          {Math.round(l.avgHr)}
                          {px >= 78 && z ? ` · ${z}` : ""}
                        </span>
                      )}
                      {l.watts ? (
                        <span className="block font-semibold">{Math.round(l.watts)} W</span>
                      ) : (
                        <span className="block">{isRun ? paceOf(l.speed) : (l.speed * 3.6).toFixed(1)}</span>
                      )}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {on && lap && (
        <div className="mt-3 rounded-md border border-teal bg-plate p-3" aria-live="polite">
          <p className="label" style={{ color: "var(--teal)" }}>
            Lap {sel! + 1} of {laps.length}
          </p>
          <dl className="num mt-2 grid grid-cols-3 gap-x-3 gap-y-2.5 sm:grid-cols-6">
            <Fact label="Time" value={dur(lap.elapsed)} />
            <Fact label="Distance" value={(lap.distance / 1000).toFixed(2)} unit="km" />
            <Fact label={isRun ? "Pace" : "Speed"} value={isRun ? paceOf(lap.speed) : (lap.speed * 3.6).toFixed(1)} unit={isRun ? "/km" : "km/h"} />
            {lap.avgHr && <Fact label="Avg HR" value={String(Math.round(lap.avgHr))} unit={`bpm${zoneOf(lap.avgHr, hrZones) ? ` · ${zoneOf(lap.avgHr, hrZones)}` : ""}`} />}
            {lap.maxHr && <Fact label="Max HR" value={String(Math.round(lap.maxHr))} unit="bpm" />}
            {lap.watts ? (
              <Fact label="Power" value={String(Math.round(lap.watts))} unit={ftp ? `W · ${Math.round((lap.watts / ftp) * 100)} % FTP` : "W"} />
            ) : lap.cadence ? (
              <Fact label="Cadence" value={String(Math.round(isRun ? lap.cadence * 2 : lap.cadence))} unit={isRun ? "spm" : "rpm"} />
            ) : null}
          </dl>
        </div>
      )}

      <div className="mt-4 space-y-4">
        {show.heartrate && <StreamChart {...chartProps} dataKey="heartrate" label="Heart rate" unit="bpm" />}
        {show.watts && (
          <StreamChart {...chartProps} dataKey="watts" label="Power" unit="W" reference={ftp ? { y: ftp, label: `FTP ${ftp}` } : undefined} />
        )}
        {show.speed &&
          (isRun ? (
            <StreamChart {...chartProps} dataKey="speed" label="Pace" unit="/km" valueFormat="pace" reversed />
          ) : (
            <StreamChart {...chartProps} dataKey="speed" label="Speed" unit="km/h" valueFormat="decimal" />
          ))}
        {show.altitude && <StreamChart {...chartProps} dataKey="altitude" label="Elevation" unit="m" height={90} />}
      </div>
    </div>
  );
}

function Fact({ label, value, unit }: { label: string; value: string; unit?: string }) {
  return (
    <div className="min-w-0">
      <dt className="label">{label}</dt>
      <dd className="mt-0.5 text-sm font-extrabold text-ink">
        {value}
        {unit && <span className="ml-1 text-xs font-semibold text-ink-2">{unit}</span>}
      </dd>
    </div>
  );
}
