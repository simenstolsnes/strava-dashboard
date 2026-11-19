import { NextResponse, after, type NextRequest } from "next/server";
import { exchangeCode, saveTokens, SCOPES } from "@/lib/strava";
import { createSessionToken, SESSION_COOKIE, sessionCookieOptions } from "@/lib/session";
import { refreshAthlete, syncRecent } from "@/lib/sync";
import { ownerAthleteId } from "@/lib/env";

export const maxDuration = 300;

function fail(request: NextRequest, reason: string) {
  return NextResponse.redirect(new URL(`/login?error=${encodeURIComponent(reason)}`, request.url));
}

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const code = params.get("code");
  const state = params.get("state");
  if (params.get("error")) return fail(request, "Strava access was denied.");
  if (!code || !state || state !== request.cookies.get("oauth_state")?.value) {
    return fail(request, "Login expired. Please try again.");
  }

  const granted = (params.get("scope") ?? "").split(",");
  const missing = SCOPES.split(",").filter((s) => !granted.includes(s));
  if (missing.length) {
    return fail(request, `Please allow all requested permissions (missing: ${missing.join(", ")}).`);
  }

  const tokens = await exchangeCode(code);
  const athleteId = tokens.athlete?.id;
  if (!athleteId || athleteId !== ownerAthleteId()) {
    return fail(request, "This dashboard is private to its owner.");
  }

  await saveTokens(athleteId, tokens);

  // Pull profile + latest activities after responding so login feels instant.
  after(async () => {
    await refreshAthlete(athleteId);
    await syncRecent(athleteId, 30);
  });

  const res = NextResponse.redirect(new URL("/", request.url));
  res.cookies.set(SESSION_COOKIE, await createSessionToken(athleteId), sessionCookieOptions);
  res.cookies.delete("oauth_state");
  return res;
}
