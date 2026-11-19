"use client";

import { useState } from "react";
import { createGoal } from "./actions";
import { Icon } from "@/components/ui";

export type Preset = {
  kind: "volume" | "power_best" | "ftp" | "fitness";
  sport?: "run" | "ride" | "all";
  measure?: "distance" | "time" | "sessions";
  period?: "week" | "month" | "year";
  duration_s?: number;
  target?: number;
};

const input = "w-full rounded-lg border border-line bg-plate px-3 py-2 text-sm text-ink placeholder:text-muted";

export function GoalForm({ preset, startOpen = false }: { preset?: Preset; startOpen?: boolean }) {
  const [kind, setKind] = useState<string>(preset?.kind ?? "volume");
  const [measure, setMeasure] = useState<string>(preset?.measure ?? "distance");
  const [open, setOpen] = useState(startOpen);

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-line bg-plate py-3 text-sm font-semibold text-teal hover:border-teal"
      >
        <Icon name="plus" size={16} />
        Add goal
      </button>
    );
  }

  const unit = kind === "volume" ? (measure === "distance" ? "km" : measure === "time" ? "hours" : "sessions") : kind === "fitness" ? "fitness" : "watts";

  return (
    <form action={async (fd) => { await createGoal(fd); setOpen(false); }} className="space-y-3 rounded-[10px] border border-line bg-plate p-4">
      <label className="block text-xs text-muted">
        Type
        <select name="kind" value={kind} onChange={(e) => setKind(e.target.value)} className={`${input} mt-1`}>
          <option value="volume">Volume (distance, time or sessions)</option>
          <option value="power_best">Power for a duration</option>
          <option value="ftp">FTP</option>
          <option value="fitness">Fitness level</option>
        </select>
      </label>

      {kind === "volume" && (
        <div className="grid grid-cols-3 gap-2">
          <label className="text-xs text-muted">
            Sport
            <select name="sport" defaultValue={preset?.sport ?? "all"} className={`${input} mt-1`}>
              <option value="all">All</option>
              <option value="run">Run</option>
              <option value="ride">Ride</option>
            </select>
          </label>
          <label className="text-xs text-muted">
            Measure
            <select name="measure" value={measure} onChange={(e) => setMeasure(e.target.value)} className={`${input} mt-1`}>
              <option value="distance">Distance</option>
              <option value="time">Time</option>
              <option value="sessions">Sessions</option>
            </select>
          </label>
          <label className="text-xs text-muted">
            Per
            <select name="period" defaultValue={preset?.period ?? "week"} className={`${input} mt-1`}>
              <option value="week">Week</option>
              <option value="month">Month</option>
              <option value="year">Year</option>
            </select>
          </label>
        </div>
      )}

      {kind === "power_best" && (
        <label className="block text-xs text-muted">
          Duration
          <select name="duration_s" defaultValue={String(preset?.duration_s ?? 1200)} className={`${input} mt-1`}>
            <option value="5">5 s</option>
            <option value="60">1 min</option>
            <option value="300">5 min</option>
            <option value="1200">20 min</option>
            <option value="3600">60 min</option>
          </select>
        </label>
      )}

      <div className="grid grid-cols-2 gap-2">
        <label className="text-xs text-muted">
          Target ({unit})
          <input name="target" type="number" step="any" min="0" required inputMode="decimal" defaultValue={preset?.target} className={`${input} mt-1`} />
        </label>
        <label className="text-xs text-muted">
          Deadline (optional)
          <input name="deadline" type="date" className={`${input} mt-1`} />
        </label>
      </div>

      <label className="block text-xs text-muted">
        Name (optional)
        <input name="title" maxLength={80} placeholder="e.g. Sub-45 10k build" className={`${input} mt-1`} />
      </label>

      <div className="flex gap-2">
        <button className="rounded-lg bg-teal px-4 py-2 text-sm font-semibold text-white hover:bg-teal-dark">Save goal</button>
        <button type="button" onClick={() => setOpen(false)} className="rounded-lg px-4 py-2 text-sm text-ink-2">
          Cancel
        </button>
      </div>
    </form>
  );
}
