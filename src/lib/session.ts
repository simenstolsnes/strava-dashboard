import { SignJWT, jwtVerify } from "jose";

export const SESSION_COOKIE = "session";
const MAX_AGE = 60 * 60 * 24 * 60; // 60 days

const key = () => new TextEncoder().encode(process.env.SESSION_SECRET ?? "");

export async function createSessionToken(athleteId: number) {
  return new SignJWT({ athleteId })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${MAX_AGE}s`)
    .sign(key());
}

/** Returns the athlete id if the token is valid and belongs to the owner. */
export async function verifySessionToken(token: string | undefined): Promise<number | null> {
  if (!token || (process.env.SESSION_SECRET ?? "").length < 32) return null;
  try {
    const { payload } = await jwtVerify(token, key(), { algorithms: ["HS256"] });
    const id = Number(payload.athleteId);
    return id === Number(process.env.OWNER_ATHLETE_ID) ? id : null;
  } catch {
    return null;
  }
}

/**
 * One-time-ish hand-off token (60 s) that production gives a preview
 * deployment after Strava login. Signed with the shared SESSION_SECRET and
 * marked with a purpose, so a normal session token can't be used in its place.
 */
export async function createHandoffToken(athleteId: number, audience: string) {
  return new SignJWT({ athleteId, purpose: "preview-handoff" })
    .setProtectedHeader({ alg: "HS256" })
    .setAudience(audience)
    .setIssuedAt()
    .setExpirationTime("60s")
    .sign(key());
}

export async function verifyHandoffToken(token: string | null, audience: string): Promise<number | null> {
  if (!token || (process.env.SESSION_SECRET ?? "").length < 32) return null;
  try {
    const { payload } = await jwtVerify(token, key(), { algorithms: ["HS256"], audience });
    const id = Number(payload.athleteId);
    return payload.purpose === "preview-handoff" && id === Number(process.env.OWNER_ATHLETE_ID) ? id : null;
  } catch {
    return null;
  }
}

export const sessionCookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/",
  maxAge: MAX_AGE,
};
