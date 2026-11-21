/**
 * Who may use the dashboard, and the keys to read their data. All from environment variables:
 *
 *   Owner (you):  STRAVA_CLIENT_ID, STRAVA_CLIENT_SECRET, OWNER_ATHLETE_ID, GARMIN_PERSONAL_API_KEY
 *   Friends:      FRIENDS=ola,kari   (short lowercase keys, comma-separated)
 *                 FRIEND_OLA_ATHLETE_ID         their Strava athlete id (only this athlete may log in as "ola")
 *                 FRIEND_OLA_STRAVA_CLIENT_ID   optional: their own Strava API app
 *                 FRIEND_OLA_STRAVA_CLIENT_SECRET
 *                 FRIEND_OLA_GARMIN_API_KEY     optional: Garmin Connect Personal API key
 *
 * Without their own app, a friend logs in through yours with the normal login link (your app
 * needs room for them: Strava's "athlete capacity"). With their own app, they log in once
 * through their personal link, /login?as=ola. Either way the dashboard then holds their tokens.
 */

export const OWNER = "owner";

export type Person = {
  /** "owner" or the friend's key from FRIENDS */
  key: string;
  athleteId: number;
  strava: { clientId: string; clientSecret: string };
  /** A friend with their own Strava app (separate rate limits, separate webhook) */
  ownApp: boolean;
  garminKey: string | null;
};

const read = (name: string) => process.env[name]?.trim() || "";

const ownerApp = () => ({ clientId: read("STRAVA_CLIENT_ID"), clientSecret: read("STRAVA_CLIENT_SECRET") });

function owner(): Person | null {
  const athleteId = Number(read("OWNER_ATHLETE_ID"));
  if (!athleteId) return null;
  return {
    key: OWNER,
    athleteId,
    strava: ownerApp(),
    ownApp: false,
    garminKey: read("GARMIN_PERSONAL_API_KEY") || null,
  };
}

function friend(key: string): Person | null {
  const p = `FRIEND_${key.toUpperCase()}_`;
  const athleteId = Number(read(`${p}ATHLETE_ID`));
  const clientId = read(`${p}STRAVA_CLIENT_ID`);
  const clientSecret = read(`${p}STRAVA_CLIENT_SECRET`);
  if (!athleteId) return null;
  // Both halves of their own app, or neither (then they use yours)
  const ownApp = Boolean(clientId && clientSecret);
  return {
    key,
    athleteId,
    strava: ownApp ? { clientId, clientSecret } : ownerApp(),
    ownApp,
    garminKey: read(`${p}GARMIN_API_KEY`) || null,
  };
}

/** Everyone configured: you first, then friends in the order listed in FRIENDS. */
export function people(): Person[] {
  const keys = read("FRIENDS")
    .split(",")
    .map((k) => k.trim().toLowerCase())
    .filter((k) => /^[a-z0-9]+$/.test(k) && k !== OWNER);
  return [owner(), ...keys.map(friend)].filter((p): p is Person => !!p);
}

export const personByKey = (key: string | null | undefined) => people().find((p) => p.key === (key || OWNER)) ?? null;

export const personByAthlete = (athleteId: number) => people().find((p) => p.athleteId === athleteId) ?? null;
