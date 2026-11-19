import { NextResponse } from "next/server";
import { refreshAthlete, syncRecent } from "@/lib/sync";
import { ownerAthleteId } from "@/lib/env";

export const maxDuration = 300;

/** Daily safety net (see vercel.json) in case a webhook was missed. */
export async function GET(request: Request) {
  if (request.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const athleteId = ownerAthleteId();
  await refreshAthlete(athleteId);
  const result = await syncRecent(athleteId, 40);
  return NextResponse.json(result);
}
