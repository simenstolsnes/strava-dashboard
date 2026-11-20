import { NextResponse, type NextRequest } from "next/server";
import { authorizeUrl } from "@/lib/strava";
import { isAllowedPreviewOrigin, isPreviewDeployment, productionOrigin } from "@/lib/preview";

const shortCookie = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/",
  maxAge: 600,
};

export async function GET(request: NextRequest) {
  const origin = request.nextUrl.origin;

  // Preview deployments can't receive Strava's redirect (one callback domain),
  // so log in through production, which hands the session back afterwards.
  const prod = productionOrigin();
  if (isPreviewDeployment() && prod && prod !== origin) {
    return NextResponse.redirect(`${prod}/api/auth/login?next=${encodeURIComponent(origin)}`);
  }

  const state = crypto.randomUUID();
  const res = NextResponse.redirect(authorizeUrl(`${origin}/api/auth/callback`, state));
  res.cookies.set("oauth_state", state, shortCookie);

  // Remember which preview asked for the login (only this project's previews)
  const next = request.nextUrl.searchParams.get("next");
  if (isAllowedPreviewOrigin(next)) res.cookies.set("auth_next", next, shortCookie);
  else res.cookies.delete("auth_next");
  return res;
}
