import { db, check } from "./db";
import { env } from "./env";

const API = "https://www.strava.com/api/v3";
const OAUTH = "https://www.strava.com/oauth";

export const SCOPES = "read,activity:read_all,profile:read_all";

export class RateLimitError extends Error {
  constructor(public retryAfterSeconds: number) {
    super("Strava rate limit reached");
  }
}

/** Most recent rate-limit usage seen, e.g. { short: [12, 100], daily: [140, 1000] } */
export const rateLimit = { short: [0, 100], daily: [0, 1000] };

type TokenResponse = {
  access_token: string;
  refresh_token: string;
  expires_at: number;
  athlete?: { id: number; firstname: string; lastname: string };
};

export function authorizeUrl(redirectUri: string, state: string) {
  const params = new URLSearchParams({
    client_id: env("STRAVA_CLIENT_ID"),
    redirect_uri: redirectUri,
    response_type: "code",
    approval_prompt: "auto",
    scope: SCOPES,
    state,
  });
  return `${OAUTH}/authorize?${params}`;
}

async function tokenRequest(body: Record<string, string>): Promise<TokenResponse> {
  const res = await fetch(`${OAUTH}/token`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      client_id: env("STRAVA_CLIENT_ID"),
      client_secret: env("STRAVA_CLIENT_SECRET"),
      ...body,
    }),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`Strava token request failed (${res.status}): ${await res.text()}`);
  return res.json();
}

export async function saveTokens(athleteId: number, t: TokenResponse) {
  check(
    await db().from("strava_tokens").upsert({
      athlete_id: athleteId,
      access_token: t.access_token,
      refresh_token: t.refresh_token,
      expires_at: t.expires_at,
      updated_at: new Date().toISOString(),
    }),
  );
}

export async function exchangeCode(code: string) {
  return tokenRequest({ code, grant_type: "authorization_code" });
}

async function accessToken(athleteId: number): Promise<string> {
  const row = check(
    await db().from("strava_tokens").select("*").eq("athlete_id", athleteId).maybeSingle(),
  ) as { access_token: string; refresh_token: string; expires_at: number } | null;
  if (!row) throw new Error("No Strava tokens stored. Log in to the dashboard first.");

  // Refresh a little before expiry
  if (row.expires_at - 120 > Date.now() / 1000) return row.access_token;
  const fresh = await tokenRequest({ refresh_token: row.refresh_token, grant_type: "refresh_token" });
  await saveTokens(athleteId, fresh);
  return fresh.access_token;
}

function readRateLimit(res: Response) {
  // Strava reports read limits separately; fall back to the overall ones.
  const usage = res.headers.get("x-readratelimit-usage") ?? res.headers.get("x-ratelimit-usage");
  const limit = res.headers.get("x-readratelimit-limit") ?? res.headers.get("x-ratelimit-limit");
  if (usage && limit) {
    const [u15, uDay] = usage.split(",").map(Number);
    const [l15, lDay] = limit.split(",").map(Number);
    rateLimit.short = [u15, l15];
    rateLimit.daily = [uDay, lDay];
  }
}

export async function stravaGet<T>(
  athleteId: number,
  path: string,
  query: Record<string, string | number | boolean> = {},
): Promise<T> {
  const token = await accessToken(athleteId);
  const qs = new URLSearchParams(Object.entries(query).map(([k, v]) => [k, String(v)]));
  const res = await fetch(`${API}${path}${qs.size ? `?${qs}` : ""}`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });
  readRateLimit(res);
  if (res.status === 429) {
    // Short-term window resets on the quarter hour
    const now = new Date();
    const wait = (15 - (now.getUTCMinutes() % 15)) * 60 - now.getUTCSeconds() + 5;
    throw new RateLimitError(wait);
  }
  if (!res.ok) throw new Error(`Strava GET ${path} failed (${res.status}): ${await res.text()}`);
  return res.json();
}

// ---- Strava payload types (only the fields we use) ----

export type StravaActivity = {
  id: number;
  athlete: { id: number };
  name: string;
  description?: string | null;
  sport_type: string;
  start_date: string;
  start_date_local: string;
  distance: number;
  moving_time: number;
  elapsed_time: number;
  total_elevation_gain: number;
  average_speed: number;
  max_speed: number;
  has_heartrate?: boolean;
  average_heartrate?: number;
  max_heartrate?: number;
  average_watts?: number;
  weighted_average_watts?: number;
  max_watts?: number;
  kilojoules?: number;
  device_watts?: boolean;
  average_cadence?: number;
  suffer_score?: number | null;
  calories?: number;
  trainer?: boolean;
  commute?: boolean;
  workout_type?: number | null;
  gear_id?: string | null;
  laps?: Array<{
    name: string;
    elapsed_time: number;
    moving_time: number;
    distance: number;
    average_speed: number;
    average_heartrate?: number;
    max_heartrate?: number;
    average_watts?: number;
    average_cadence?: number;
  }>;
};

export type StreamSet = Partial<
  Record<
    "time" | "heartrate" | "watts" | "velocity_smooth" | "altitude" | "cadence" | "distance" | "moving",
    { data: number[] }
  >
>;

export type StravaZones = {
  heart_rate?: { custom_zones: boolean; zones: { min: number; max: number }[] };
  power?: { zones: { min: number; max: number }[] };
};

export type StravaAthlete = {
  id: number;
  firstname: string;
  lastname: string;
  weight?: number | null;
  ftp?: number | null;
};

export const strava = {
  athlete: (id: number) => stravaGet<StravaAthlete>(id, "/athlete"),
  zones: (id: number) => stravaGet<StravaZones>(id, "/athlete/zones"),
  activities: (id: number, opts: { after?: number; before?: number; page?: number; per_page?: number }) =>
    stravaGet<StravaActivity[]>(id, "/athlete/activities", { per_page: 200, ...opts }),
  activity: (id: number, activityId: number) => stravaGet<StravaActivity>(id, `/activities/${activityId}`),
  streams: (id: number, activityId: number) =>
    stravaGet<StreamSet>(id, `/activities/${activityId}/streams`, {
      keys: "time,heartrate,watts,velocity_smooth,altitude,cadence,distance,moving",
      key_by_type: true,
    }),
};
