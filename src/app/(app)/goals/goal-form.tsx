"use client";

import { useState } from "react";
import { createGoal } from "./actions";

const input = "w-full rounded-xl border border-line bg-surface-2 px-3 py-2 text-sm text-ink";

export function GoalForm() {
  const [kind, setKind] = useState("volume");
  const [measure, setMeasure] = useState("distance");
  const [open, setOpen] = useState(false);

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} className="w-full rounded-xl border border-dashed border-line py-3 text-sm font-medium text-ink">
        + Add goal
      </button>
    );
  }

  const unit = kind === "volume" ? (measure === "distance" ? "km" : measure === "time" ? "hours" : "sessions") : kind === "fitness" ? "fitness" : "watts";

  return (
    <form action={async (fd) => { await createGoal(fd); setOpen(false); }} className="space-y-3 rounded-2xl border border-line bg-surface p-4">
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
            <select name="sport" className={`${input} mt-1`}>
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
            <select name="period" className={`${input} mt-1`}>
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
          <select name="duration_s" defaultValue="1200" className={`${input} mt-1`}>
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
          <input name="target" type="number" step="any" min="0" required inputMode="decimal" className={`${input} mt-1`} />
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
        <button className="rounded-xl bg-accent px-4 py-2 text-sm font-semibold text-white">Save goal</button>
        <button type="button" onClick={() => setOpen(false)} className="rounded-xl px-4 py-2 text-sm text-ink-2">
          Cancel
        </button>
      </div>
    </form>
  );
}
