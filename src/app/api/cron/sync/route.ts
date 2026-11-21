import { NextResponse } from "next/server";
import { refreshAthlete, refreshRecentDetails, syncRecent } from "@/lib/sync";
import { garminConfigured, syncGarminRecent } from "@/lib/garmin";
import { people } from "@/lib/people";
import { db, check } from "@/lib/db";

export const maxDuration = 300;

/**
 * Daily safety net (see vercel.json), for everyone who has logged in: catches activities a
 * webhook missed and re-reads the last week's details, since Strava never sends description edits.
 * One person failing (expired key, revoked access) doesn't stop the others.
 */
export async function GET(request: Request) {
  if (request.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const connected = new Set(
    (check(await db().from("strava_tokens").select("athlete_id")) as { athlete_id: number }[]).map((r) => Number(r.athlete_id)),
  );
  const results: Record<string, unknown> = {};
  for (const person of people()) {
    const id = person.athleteId;
    const out: Record<string, unknown> = {};
    if (connected.has(id)) {
      try {
        await refreshAthlete(id);
        Object.assign(out, await syncRecent(id, 40));
        out.detailsRefreshed = await refreshRecentDetails(id, 7);
      } catch (e) {
        out.stravaError = (e as Error).message;
      }
    }
    // Garmin has no webhooks: re-read the last week every day
    if (garminConfigured(id)) {
      Object.assign(out, await syncGarminRecent(id, 7).catch((e: Error) => ({ garminError: e.message })));
    }
    results[person.key] = out;
  }
  return NextResponse.json(results);
}
