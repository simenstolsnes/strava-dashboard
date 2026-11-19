import { NextResponse } from "next/server";
import { currentAthlete } from "@/lib/auth";
import { refreshAthlete, syncRecent } from "@/lib/sync";

export const maxDuration = 300;

/** "Sync now" button in Settings. */
export async function POST() {
  const athleteId = await currentAthlete();
  if (!athleteId) return NextResponse.json({ error: "Not logged in" }, { status: 401 });
  await refreshAthlete(athleteId);
  const result = await syncRecent(athleteId, 25);
  return NextResponse.json(result);
}
