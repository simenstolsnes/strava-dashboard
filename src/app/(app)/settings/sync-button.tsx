"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function SyncButton() {
  const router = useRouter();
  const [state, setState] = useState<"idle" | "busy" | string>("idle");

  async function run() {
    setState("busy");
    try {
      const res = await fetch("/api/sync", { method: "POST" });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? res.statusText);
      setState(
        `Fetched ${body.fetched} · analysed ${body.processed}` +
          (body.garminDays != null ? ` · ${body.garminDays} Garmin days` : body.garminError ? ` · Garmin failed: ${body.garminError}` : "") +
          (body.rateLimited ? " · Strava rate limit hit, try again in 15 min" : body.remaining ? " · more pending, tap again" : ""),
      );
      router.refresh();
    } catch (e) {
      setState(`Sync failed: ${e instanceof Error ? e.message : e}`);
    }
  }

  return (
    <div>
      <button
        onClick={run}
        disabled={state === "busy"}
        className="rounded-lg bg-teal px-4 py-2 text-sm font-semibold text-white hover:bg-teal-dark disabled:opacity-60"
      >
        {state === "busy" ? "Syncing…" : "Sync now"}
      </button>
      {state !== "idle" && state !== "busy" && <p className="mt-2 text-xs text-ink-2">{state}</p>}
    </div>
  );
}
