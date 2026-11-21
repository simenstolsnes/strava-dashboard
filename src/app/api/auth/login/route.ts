import { NextResponse, type NextRequest } from "next/server";
import { authorizeUrl } from "@/lib/strava";
import { isAllowedPreviewOrigin, isPreviewDeployment, productionOrigin } from "@/lib/preview";
import { personByKey } from "@/lib/people";

const shortCookie = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/",
  maxAge: 600,
};

/** `?as=<friend>` picks whose Strava app to log in through; without it, the owner's. */
export async function GET(request: NextRequest) {
  const origin = request.nextUrl.origin;
  const as = request.nextUrl.searchParams.get("as");
  const person = personByKey(as);
  if (!person) {
    return NextResponse.redirect(new URL(`/login?error=${encodeURIComponent("Unknown login link.")}`, request.url));
  }

  // Preview deployments can't receive Strava's redirect (one callback domain),
  // so log in through production, which hands the session back afterwards.
  const prod = productionOrigin();
  if (isPreviewDeployment() && prod && prod !== origin) {
    const qs = new URLSearchParams({ next: origin, ...(as ? { as } : {}) });
    return NextResponse.redirect(`${prod}/api/auth/login?${qs}`);
  }

  const state = crypto.randomUUID();
  const res = NextResponse.redirect(authorizeUrl(person, `${origin}/api/auth/callback`, state));
  res.cookies.set("oauth_state", state, shortCookie);
  res.cookies.set("oauth_as", person.key, shortCookie);

  // Remember which preview asked for the login (only this project's previews)
  const next = request.nextUrl.searchParams.get("next");
  if (isAllowedPreviewOrigin(next)) res.cookies.set("auth_next", next, shortCookie);
  else res.cookies.delete("auth_next");
  return res;
}
