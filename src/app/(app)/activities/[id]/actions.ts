"use server";

import { revalidatePath } from "next/cache";
import { currentAthlete } from "@/lib/auth";
import { db, check } from "@/lib/db";
import { processActivity } from "@/lib/sync";

export async function saveNote(activityId: number, formData: FormData) {
  if (!(await currentAthlete())) throw new Error("Not logged in");
  const feeling = Number(formData.get("feeling")) || null;
  const text = String(formData.get("text") ?? "").slice(0, 2000) || null;
  check(
    await db().from("notes").upsert({ activity_id: activityId, feeling, text, updated_at: new Date().toISOString() }),
  );
  revalidatePath(`/activities/${activityId}`);
}

export async function reprocess(activityId: number) {
  const athleteId = await currentAthlete();
  if (!athleteId) throw new Error("Not logged in");
  await processActivity(athleteId, activityId, { withDetail: true });
  revalidatePath(`/activities/${activityId}`);
}
