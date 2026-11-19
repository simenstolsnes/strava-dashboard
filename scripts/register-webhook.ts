/**
 * Tell Strava to notify the deployed app about new activities.
 * Run once after deploying (the app must be live so Strava can verify it):
 *
 *   npm run webhook -- https://your-app.vercel.app
 *   npm run webhook -- --list
 *   npm run webhook -- --delete <id>
 */
process.loadEnvFile(".env.local");

const API = "https://www.strava.com/api/v3/push_subscriptions";
const client_id = process.env.STRAVA_CLIENT_ID!;
const client_secret = process.env.STRAVA_CLIENT_SECRET!;
const arg = process.argv[2];

async function main() {
  if (!arg || arg === "--list") {
    const res = await fetch(`${API}?${new URLSearchParams({ client_id, client_secret })}`);
    console.log(await res.json());
    return;
  }
  if (arg === "--delete") {
    const id = process.argv[3];
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
