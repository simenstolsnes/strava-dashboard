/**
 * Who may use the dashboard, and the keys to read their data. All from environment variables:
 *
 *   Owner (you):  STRAVA_CLIENT_ID, STRAVA_CLIENT_SECRET, OWNER_ATHLETE_ID, GARMIN_PERSONAL_API_KEY
 *   Friends:      FRIENDS=ola,kari   (short lowercase keys, comma-separated)
 *                 FRIEND_OLA_ATHLETE_ID         their Strava athlete id (only this athlete may log in as "ola")
 *                 FRIEND_OLA_STRAVA_CLIENT_ID   their own Strava API app
 *                 FRIEND_OLA_STRAVA_CLIENT_SECRET
 *                 FRIEND_OLA_GARMIN_API_KEY     optional: Garmin Connect Personal API key
 *
 * A friend logs in once through their personal link, /login?as=ola, which approves their
 * own Strava app; after that the dashboard holds their tokens like it does yours.
 */

export const OWNER = "owner";

export type Person = {
  /** "owner" or the friend's key from FRIENDS */
  key: string;
  athleteId: number;
  strava: { clientId: string; clientSecret: string };
  garminKey: string | null;
};

const read = (name: string) => process.env[name]?.trim() || "";

function owner(): Person | null {
  const athleteId = Number(read("OWNER_ATHLETE_ID"));
  if (!athleteId) return null;
  return {
    key: OWNER,
    athleteId,
    strava: { clientId: read("STRAVA_CLIENT_ID"), clientSecret: read("STRAVA_CLIENT_SECRET") },
    garminKey: read("GARMIN_PERSONAL_API_KEY") || null,
  };
}

function friend(key: string): Person | null {
  const p = `FRIEND_${key.toUpperCase()}_`;
  const athleteId = Number(read(`${p}ATHLETE_ID`));
  const clientId = read(`${p}STRAVA_CLIENT_ID`);
  const clientSecret = read(`${p}STRAVA_CLIENT_SECRET`);
  // Half-configured friends are skipped rather than letting anyone in
  if (!athleteId || !clientId || !clientSecret) return null;
  return { key, athleteId, strava: { clientId, clientSecret }, garminKey: read(`${p}GARMIN_API_KEY`) || null };
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
