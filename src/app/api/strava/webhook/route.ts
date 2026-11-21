import { NextResponse, after, type NextRequest } from "next/server";
import { deleteActivity, processActivity } from "@/lib/sync";
import { db } from "@/lib/db";
import { personByAthlete } from "@/lib/people";

export const maxDuration = 300;

/** Strava calls this once when the subscription is created, to verify it. */
export function GET(request: NextRequest) {
  const p = request.nextUrl.searchParams;
  if (p.get("hub.mode") === "subscribe" && p.get("hub.verify_token") === process.env.STRAVA_WEBHOOK_VERIFY_TOKEN) {
    return NextResponse.json({ "hub.challenge": p.get("hub.challenge") });
  }
  return NextResponse.json({ error: "Verification failed" }, { status: 403 });
}

type WebhookEvent = {
  object_type: "activity" | "athlete";
  object_id: number;
  aspect_type: "create" | "update" | "delete";
  owner_id: number;
  updates?: Record<string, string>;
};

/**
 * Strava posts here on every new/edited/deleted activity, for every app subscribed (yours and
 * each friend's). Must answer within 2 s.
 */
export async function POST(request: NextRequest) {
  const event = (await request.json()) as WebhookEvent;
  const person = personByAthlete(event.owner_id);
  if (!person) return NextResponse.json({ ok: true });
  const owner = person.athleteId;

  after(async () => {
    if (event.object_type === "athlete") {
      // Deauthorized from Strava settings: drop tokens so nothing keeps syncing.
      if (event.updates?.authorized === "false") {
        await db().from("strava_tokens").delete().eq("athlete_id", owner);
      }
      return;
    }
    if (event.aspect_type === "delete") return deleteActivity(event.object_id);

    // Upload can take a moment to finish processing on Strava's side.
    if (event.aspect_type === "create") await new Promise((r) => setTimeout(r, 10_000));
    // Fetches full detail (inserting the activity if new), streams and metrics.
    await processActivity(owner, event.object_id, { withDetail: true });
  });

  return NextResponse.json({ ok: true });
}
