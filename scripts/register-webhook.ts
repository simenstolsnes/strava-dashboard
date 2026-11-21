/**
 * Tell Strava to notify the deployed app about new activities.
 * Run once after deploying (the app must be live so Strava can verify it):
 *
 *   npm run webhook -- https://your-app.vercel.app
 *   npm run webhook -- --list
 *   npm run webhook -- --delete <id>
 *
 * Add --as=ola to do the same for a friend's Strava app (each app has its own subscription):
 *   npm run webhook -- https://your-app.vercel.app --as=ola
 */
process.loadEnvFile(".env.local");

import { personByKey } from "../src/lib/people";

const API = "https://www.strava.com/api/v3/push_subscriptions";
const as = process.argv.find((a) => a.startsWith("--as="))?.split("=")[1];
const person = personByKey(as);
if (!person) throw new Error(`Unknown person "${as}". Check FRIENDS and FRIEND_${(as ?? "").toUpperCase()}_* in .env.local.`);
const client_id = person.strava.clientId;
const client_secret = person.strava.clientSecret;
const args = process.argv.slice(2).filter((a) => !a.startsWith("--as="));
const arg = args[0];

async function main() {
  if (!arg || arg === "--list") {
    const res = await fetch(`${API}?${new URLSearchParams({ client_id, client_secret })}`);
    console.log(await res.json());
    return;
  }
  if (arg === "--delete") {
    const id = args[1];
    const res = await fetch(`${API}/${id}?${new URLSearchParams({ client_id, client_secret })}`, { method: "DELETE" });
    console.log(res.status === 204 ? `Deleted subscription ${id}` : await res.text());
    return;
  }
  const callback_url = `${arg.replace(/\/$/, "")}/api/strava/webhook`;
  const res = await fetch(API, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      client_id,
      client_secret,
      callback_url,
      verify_token: process.env.STRAVA_WEBHOOK_VERIFY_TOKEN,
    }),
  });
  console.log(res.status, await res.json());
}

main();
