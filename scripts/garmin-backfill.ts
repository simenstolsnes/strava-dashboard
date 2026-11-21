/**
 * Import your Garmin wellness history (sleep, resting HR, VO2 max, Body Battery, stress, steps).
 *
 *   npm run garmin-backfill              # last 24 months
 *   npm run garmin-backfill -- --months=60
 *   npm run garmin-backfill -- --as=ola       # a friend (needs FRIEND_OLA_GARMIN_API_KEY)
 *
 * Fetches 28 days per request set, newest first, and is safe to re-run.
 * Heart rate through the day is only stored for the last 14 days.
 */
process.loadEnvFile(".env.local");

import { syncGarminDays, syncGarminHeartRate } from "../src/lib/garmin";
import { addDays, today } from "../src/lib/time";
import { personByKey } from "../src/lib/people";

const months = Number(process.argv.find((a) => a.startsWith("--months="))?.split("=")[1] ?? 24);
const as = process.argv.find((a) => a.startsWith("--as="))?.split("=")[1];
const pause = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function main() {
  const person = personByKey(as);
  if (!person) throw new Error(`Unknown person "${as}". Check FRIENDS and FRIEND_${(as ?? "").toUpperCase()}_* in .env.local.`);
  if (!person.garminKey) throw new Error(`No Garmin API key configured for ${person.key}.`);
  const athleteId = person.athleteId;
  console.log(`Garmin backfill for ${person.key}…`);
  const end = today();
  const start = addDays(end, -Math.round(months * 30.4));
  let total = 0;
  let emptyInARow = 0;
  for (let to = end; to >= start; to = addDays(to, -28)) {
    const from = addDays(to, -27) > start ? addDays(to, -27) : start;
    const n = await syncGarminDays(athleteId, from, to);
    total += n;
    process.stdout.write(`\r  ${from} → ${to}: ${n} days · ${total} total   `);
    // Stop once we are well before the first day Garmin has data for
    emptyInARow = n ? 0 : emptyInARow + 1;
    if (emptyInARow >= 3) {
      console.log("\n  No older data at Garmin.");
      break;
    }
    await pause(500);
  }
  console.log(`\nDaily data: ${total} days stored.`);

  let hr = 0;
  for (let i = 0; i < 14; i++) {
    if (await syncGarminHeartRate(athleteId, addDays(end, -i))) hr++;
    await pause(300);
  }
  console.log(`Heart rate through the day: ${hr} days stored.`);
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
