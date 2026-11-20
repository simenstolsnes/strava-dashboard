import { NextResponse, type NextRequest } from "next/server";
import { createSessionToken, SESSION_COOKIE, sessionCookieOptions, verifyHandoffToken } from "@/lib/session";
import { isPreviewDeployment } from "@/lib/preview";

/**
 * Preview deployments only: accept the short-lived token production issued
 * after Strava login, and start a session on this preview's domain.
 */
export async function GET(request: NextRequest) {
  if (!isPreviewDeployment()) return NextResponse.json({ error: "Not available" }, { status: 404 });

  const origin = request.nextUrl.origin;
  const athleteId = await verifyHandoffToken(request.nextUrl.searchParams.get("token"), origin);
  if (!athleteId) {
    return NextResponse.redirect(new URL(`/login?error=${encodeURIComponent("Login hand-off expired. Please try again.")}`, request.url));
  }
  const res = NextResponse.redirect(new URL("/", request.url));
  res.cookies.set(SESSION_COOKIE, await createSessionToken(athleteId), sessionCookieOptions);
  return res;
}
