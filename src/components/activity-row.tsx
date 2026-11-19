import Link from "next/link";
import { sportGroup, type Activity } from "@/lib/queries";
import { duration, km, pace, kmh, shortDate } from "@/lib/format";
import { SportDot } from "./ui";

export function ActivityRow({ a }: { a: Activity }) {
  const g = sportGroup(a.sport_type);
  const facts: string[] = [];
  if (a.distance > 0) facts.push(km(a.distance));
  facts.push(duration(a.moving_time));
  if (g === "run" && a.distance > 0) facts.push(pace(a.average_speed));
  if (g === "ride" && a.device_watts && a.weighted_average_watts) facts.push(`${Math.round(a.weighted_average_watts)} W NP`);
  else if (g === "ride" && a.distance > 0) facts.push(kmh(a.average_speed));
  if (a.average_heartrate) facts.push(`${Math.round(a.average_heartrate)} bpm`);

  return (
    <li>
      <Link href={`/activities/${a.id}`} className="flex items-center gap-3 rounded-md px-1 py-2.5 hover:bg-rock/60 active:bg-rock">
        <SportDot group={g} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-ink">{a.name}</p>
          <p className="num truncate text-xs text-ink-2">{facts.join(" · ")}</p>
        </div>
        <div className="shrink-0 text-right">
          <p className="text-xs text-muted">{shortDate(a.start_date_local)}</p>
          {a.suffer_score != null && <p className="num text-xs text-ink-2">RE {Math.round(a.suffer_score)}</p>}
        </div>
      </Link>
    </li>
  );
}
