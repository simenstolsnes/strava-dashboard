"use server";

import { revalidatePath } from "next/cache";
import { currentAthlete } from "@/lib/auth";
import { db, check } from "@/lib/db";

export async function saveFtp(formData: FormData) {
  const athleteId = await currentAthlete();
  if (!athleteId) throw new Error("Not logged in");
  const raw = String(formData.get("ftp") ?? "").trim();
  const ftp = raw ? Math.round(Number(raw)) : null;
  if (ftp !== null && (!Number.isFinite(ftp) || ftp < 50 || ftp > 600)) throw new Error("FTP must be 50–600 W");
  check(await db().from("athlete").update({ ftp_override: ftp }).eq("id", athleteId));
  revalidatePath("/", "layout");
}

export async function saveCompare(formData: FormData) {
  const athleteId = await currentAthlete();
  if (!athleteId) throw new Error("Not logged in");
  const value = formData.get("compare");
  if (value !== "on" && value !== "off") throw new Error("Invalid choice");
  check(await db().from("athlete").update({ compare_enabled: value === "on" }).eq("id", athleteId));
  revalidatePath("/", "layout");
}
