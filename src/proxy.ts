import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE, verifySessionToken } from "@/lib/session";

// Paths reachable without logging in
const PUBLIC = [
  "/login",
  "/api/auth/",
  "/api/strava/webhook",
  "/api/cron/",
  "/manifest.webmanifest",
  "/icon",
  "/apple-icon",
  "/pwa-icon",
];

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (PUBLIC.some((p) => pathname === p || pathname.startsWith(p))) return NextResponse.next();

  const athleteId = await verifySessionToken(request.cookies.get(SESSION_COOKIE)?.value);
  if (athleteId) return NextResponse.next();

  if (pathname.startsWith("/api/")) {
    return NextResponse.json({ error: "Not logged in" }, { status: 401 });
  }
  return NextResponse.redirect(new URL("/login", request.url));
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
