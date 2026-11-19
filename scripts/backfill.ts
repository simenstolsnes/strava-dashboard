/**
 * Import your Strava history into the database.
 *
 *   npm run backfill            # last 24 months
 *   npm run backfill -- --months=60
 *
 * Safe to stop and re-run at any time: it resumes where it left off. Waits
 * automatically when Strava's 15-minute rate limit is reached.
 */
process.loadEnvFile(".env.local");

import { strava } from "../src/lib/strava";
import { upsertSummaries, processPending, refreshAthlete } from "../src/lib/sync";
import { db } from "../src/lib/db";

const months = Number(process.argv.find((a) => a.startsWith("--months="))?.split("=")[1] ?? 24);
const athleteId = Number(process.env.OWNER_ATHLETE_ID);
const sleep = (s: number) => new Promise((r) => setTimeout(r, s * 1000));

function secondsToNextWindow() {
  const now = new Date();
  return (15 - (now.getUTCMinutes() % 15)) * 60 - now.getUTCSeconds() + 10;
}

async function main() {
  console.log(`Refreshing athlete profile and zones…`);
  await refreshAthlete(athleteId);

  const after = Math.floor(Date.now() / 1000) - months * 30.4 * 86400;
  console.log(`Listing activities from the last ${months} months…`);
  let total = 0;
  for (let page = 1; ; page++) {
    const list = await strava.activities(athleteId, { after, page, per_page: 200 });
    await upsertSummaries(list);
    total += list.length;
    process.stdout.write(`\r  ${total} activities`);
    if (list.length < 200) break;
  }
  console.log();

  const countPending = async () =>
    (await db().from("activities").select("id", { count: "exact", head: true }).eq("processed", false)).count ?? 0;

  console.log(`Fetching streams and computing metrics (${await countPending()} to go)…`);
  for (;;) {
    const res = await processPending(athleteId, 25, false);
    const left = await countPending();
    // Use the counters reported by the module that made the requests
    const rl = res.rateLimit;
    console.log(`  +${res.processed}, ${left} left · API usage ${rl.short.join("/")} (15 min), ${rl.daily.join("/")} (day)`);
    if (left === 0) break;
    if (rl.daily[0] >= rl.daily[1] - 5) {
      console.log("Daily Strava limit reached. Run this again tomorrow to continue.");
      return;
    }
    if (res.rateLimited || rl.short[0] >= rl.short[1] - 5) {
      const wait = secondsToNextWindow();
      console.log(`  Rate limit reached, waiting ${Math.ceil(wait / 60)} min…`);
      await sleep(wait);
    }
  }
  console.log("Done ✔");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
