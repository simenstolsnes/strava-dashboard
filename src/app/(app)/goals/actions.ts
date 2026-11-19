"use server";

import { revalidatePath } from "next/cache";
import { currentAthlete } from "@/lib/auth";
import { db, check } from "@/lib/db";

const pick = <T extends string>(v: FormDataEntryValue | null, allowed: readonly T[], fallback: T): T =>
  allowed.includes(v as T) ? (v as T) : fallback;

export async function createGoal(formData: FormData) {
  if (!(await currentAthlete())) throw new Error("Not logged in");
  const kind = pick(formData.get("kind"), ["volume", "power_best", "ftp", "fitness"] as const, "volume");
  const target = Number(formData.get("target"));
  if (!Number.isFinite(target) || target <= 0) throw new Error("Target must be a positive number");

  const row: Record<string, unknown> = {
    title: String(formData.get("title") || "").slice(0, 80),
    kind,
    target,
    deadline: formData.get("deadline") || null,
  };
  if (kind === "volume") {
    row.sport = pick(formData.get("sport"), ["run", "ride", "all"] as const, "all");
    row.measure = pick(formData.get("measure"), ["distance", "time", "sessions"] as const, "distance");
    row.period = pick(formData.get("period"), ["week", "month", "year"] as const, "week");
  }
  if (kind === "power_best") row.duration_s = Number(formData.get("duration_s")) || 1200;

  if (!row.title) {
    const auto: Record<string, string> = {
      volume: `${row.sport === "all" ? "Training" : row.sport === "run" ? "Run" : "Ride"} ${target} ${
        row.measure === "distance" ? "km" : row.measure === "time" ? "h" : "sessions"
      } per ${row.period}`,
      power_best: `${Number(row.duration_s) >= 60 ? `${Number(row.duration_s) / 60} min` : `${row.duration_s} s`} power ${target} W`,
      ftp: `FTP ${target} W`,
      fitness: `Fitness ${target}`,
    };
    row.title = auto[kind];
  }
  check(await db().from("goals").insert(row));
  revalidatePath("/goals");
}

export async function deleteGoal(id: string) {
  if (!(await currentAthlete())) throw new Error("Not logged in");
  check(await db().from("goals").delete().eq("id", id));
  revalidatePath("/goals");
}
