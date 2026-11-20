import { NextResponse } from "next/server";
import { refreshAthlete, refreshRecentDetails, syncRecent } from "@/lib/sync";
import { ownerAthleteId } from "@/lib/env";

export const maxDuration = 300;

/**
 * Daily safety net (see vercel.json): catches activities a webhook missed and
 * re-reads the last week's details, since Strava never sends description edits.
 */
export async function GET(request: Request) {
  if (request.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const athleteId = ownerAthleteId();
  await refreshAthlete(athleteId);
  const result = await syncRecent(athleteId, 40);
  const detailsRefreshed = await refreshRecentDetails(athleteId, 7);
  return NextResponse.json({ ...result, detailsRefreshed });
}
