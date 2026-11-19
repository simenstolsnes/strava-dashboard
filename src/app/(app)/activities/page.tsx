import Link from "next/link";
import { requireAthlete } from "@/lib/auth";
import { getActivityList, GROUP_LABEL, type SportGroup } from "@/lib/queries";
import { Card, Empty, PageTitle } from "@/components/ui";
import { ActivityRow } from "@/components/activity-row";

export const metadata = { title: "Activities" };

const GROUPS: SportGroup[] = ["ride", "run", "strength", "other"];
const PAGE = 60;

export default async function ActivitiesPage({ searchParams }: PageProps<"/activities">) {
  await requireAthlete();
  const sp = await searchParams;
  const sport = GROUPS.includes(sp.sport as SportGroup) ? (sp.sport as SportGroup) : null;
  const shown = Math.max(PAGE, Number(sp.n) || PAGE);
  const all = await getActivityList(sport);
  const list = all.slice(0, shown);

  // Group by month for scanning
  const months = new Map<string, typeof list>();
  for (const a of list) {
    const key = a.start_date_local.slice(0, 7);
    months.set(key, [...(months.get(key) ?? []), a]);
  }

  const chip = (value: SportGroup | null, label: string) => {
    const active = value === sport;
    return (
      <Link
        key={label}
        href={value ? `/activities?sport=${value}` : "/activities"}
        className={`shrink-0 rounded-full border px-3 py-1.5 text-sm ${active ? "border-transparent bg-ink text-page" : "border-line text-ink-2"}`}
      >
        {label}
      </Link>
    );
  };

  return (
    <div className="space-y-4">
      <PageTitle sub={`${all.length} activities synced`}>Activities</PageTitle>
      <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1">
        {chip(null, "All")}
        {GROUPS.map((g) => chip(g, GROUP_LABEL[g]))}
      </div>

      {!list.length && <Empty>No activities here yet.</Empty>}

      {[...months].map(([month, acts]) => (
        <Card
          key={month}
          title={new Date(`${month}-01T00:00:00Z`).toLocaleDateString("en-GB", { month: "long", year: "numeric", timeZone: "UTC" })}
          subtitle={`${acts.length} activities · ${(acts.reduce((s, a) => s + a.moving_time, 0) / 3600).toFixed(1)} h`}
        >
          <ul className="-mx-1 divide-y divide-line">
            {acts.map((a) => (
              <ActivityRow key={a.id} a={a} />
            ))}
          </ul>
        </Card>
      ))}

      {all.length > shown && (
        <Link
          href={`/activities?${new URLSearchParams({ ...(sport ? { sport } : {}), n: String(shown + PAGE) })}`}
          className="block rounded-xl border border-line py-3 text-center text-sm font-medium text-ink"
          scroll={false}
        >
          Show more
        </Link>
      )}
    </div>
  );
}
