import Link from "next/link";
import { requireAthlete } from "@/lib/auth";
import { getActivityList, GROUP_LABEL, type SportGroup } from "@/lib/queries";
import { Empty, PageTitle } from "@/components/ui";
import { ActivityRow } from "@/components/activity-row";

export const metadata = { title: "Activities" };

const GROUPS: SportGroup[] = ["ride", "run", "strength", "other"];
const PAGE = 60;

export default async function ActivitiesPage({ searchParams }: PageProps<"/activities">) {
  const me = await requireAthlete();
  const sp = await searchParams;
  const sport = GROUPS.includes(sp.sport as SportGroup) ? (sp.sport as SportGroup) : null;
  const shown = Math.max(PAGE, Number(sp.n) || PAGE);
  const all = await getActivityList(me, sport);
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
        className={`shrink-0 rounded-full border px-3 py-1.5 text-sm ${active ? "border-teal bg-teal font-semibold text-white" : "border-line bg-plate text-ink-2 hover:border-teal"}`}
      >
        {label}
      </Link>
    );
  };

  return (
    <>
      <PageTitle wide sub={`${all.length} activities synced`}>Activities</PageTitle>
      <div className="max-w-3xl space-y-4">
      <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1">
        {chip(null, "All")}
        {GROUPS.map((g) => chip(g, GROUP_LABEL[g]))}
      </div>

      {!list.length && <Empty>No activities here yet.</Empty>}

      {list.length > 0 && (
        <div className="overflow-clip rounded-[10px] border border-line bg-plate">
          {[...months].map(([month, acts]) => (
            <section key={month} aria-label={month}>
              {/* Guide header: stays pinned while you scroll through its month */}
              <header className="sticky top-12 z-[5] flex items-baseline justify-between border-b border-line bg-rock px-4 py-2">
                <h2 className="label" style={{ color: "var(--ink)" }}>
                  {new Date(`${month}-01T00:00:00Z`).toLocaleDateString("en-GB", { month: "long", year: "numeric", timeZone: "UTC" })}
                </h2>
                <p className="num text-xs text-ink-2">
                  {acts.length} sessions · {(acts.reduce((s, a) => s + a.moving_time, 0) / 3600).toFixed(1)} h
                </p>
              </header>
              <ul className="divide-y divide-hairline px-3">
                {acts.map((a) => (
                  <ActivityRow key={a.id} a={a} />
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}

      {all.length > shown && (
        <Link
          href={`/activities?${new URLSearchParams({ ...(sport ? { sport } : {}), n: String(shown + PAGE) })}`}
          className="block rounded-lg border border-line py-3 text-center text-sm font-medium text-ink"
          scroll={false}
        >
          Show more
        </Link>
      )}
      </div>
    </>
  );
}
