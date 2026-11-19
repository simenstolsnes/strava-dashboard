import { NextResponse } from "next/server";
import { authorizeUrl } from "@/lib/strava";

export async function GET(request: Request) {
  const origin = new URL(request.url).origin;
  const state = crypto.randomUUID();
  const res = NextResponse.redirect(authorizeUrl(`${origin}/api/auth/callback`, state));
  res.cookies.set("oauth_state", state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 600,
  });
  return res;
}
