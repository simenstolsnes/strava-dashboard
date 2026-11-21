"use server";

import { revalidatePath } from "next/cache";
import { currentAthlete } from "@/lib/auth";
import { db, check } from "@/lib/db";
import { processActivity } from "@/lib/sync";

/** The logged-in athlete, if the activity is theirs (nobody edits someone else's sessions). */
async function owning(activityId: number): Promise<number> {
  const athleteId = await currentAthlete();
  if (!athleteId) throw new Error("Not logged in");
  const row = check(
    await db().from("activities").select("id").eq("id", activityId).eq("athlete_id", athleteId).maybeSingle(),
  );
  if (!row) throw new Error("Activity not found");
  return athleteId;
}

export async function saveNote(activityId: number, formData: FormData) {
  await owning(activityId);
  const feeling = Number(formData.get("feeling")) || null;
  const text = String(formData.get("text") ?? "").slice(0, 2000) || null;
  check(
    await db().from("notes").upsert({ activity_id: activityId, feeling, text, updated_at: new Date().toISOString() }),
  );
  revalidatePath(`/activities/${activityId}`);
}

export async function reprocess(activityId: number) {
  const athleteId = await owning(activityId);
  await processActivity(athleteId, activityId, { withDetail: true });
  revalidatePath(`/activities/${activityId}`);
}
