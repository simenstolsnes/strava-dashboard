import { requireAthlete } from "@/lib/auth";
import { day, getActivities, getGoals, getPowerData, sportGroup } from "@/lib/queries";
import { addDays, today } from "@/lib/time";
import { PageTitle, Progress, Signpost, type Arm } from "@/components/ui";
import { deleteGoal } from "./actions";
import { GoalForm, type Preset } from "./goal-form";

export const metadata = { title: "Goals" };

/** Example goals grounded in the athlete's current numbers. */
async function examples(): Promise<Array<{ id: string; title: string; meta: string; preset: Preset }>> {
  const [power, acts] = await Promise.all([getPowerData(), getActivities()]);
  const out: Array<{ id: string; title: string; meta: string; preset: Preset }> = [];
  const round5 = (x: number) => Math.round(x / 5) * 5;

  if (power.ftp.ftp) {
    const t = round5(power.ftp.ftp * 1.05);
    out.push({ id: "ftp", title: `FTP ${t} W`, meta: `now ${power.ftp.ftp} W`, preset: { kind: "ftp", target: t } });
  }
  const p20 = power.curve.find((c) => c.seconds === 1200)?.last90;
  if (p20) {
    const t = round5(p20 * 1.05);
    out.push({ id: "p20", title: `20 min at ${t} W`, meta: `best ${p20} W`, preset: { kind: "power_best", duration_s: 1200, target: t } });
  }
  const since = addDays(today(), -28);
  const runKm = acts.filter((a) => day(a) >= since && sportGroup(a.sport_type) === "run").reduce((s, a) => s + a.distance, 0) / 1000 / 4;
  if (runKm > 0) {
    const t = Math.max(10, Math.round((runKm * 1.2) / 5) * 5);
    out.push({
      id: "run",
      title: `Run ${t} km a week`,
      meta: `now ${runKm.toFixed(0)} km`,
      preset: { kind: "volume", sport: "run", measure: "distance", period: "week", target: t },
    });
  }
  return out;
}

export default async function GoalsPage({ searchParams }: PageProps<"/goals">) {
  await requireAthlete();
  const [goals, ex, sp] = await Promise.all([getGoals(), examples(), searchParams]);
  const chosen = ex.find((e) => e.id === sp.example)?.preset;

  const arms: Arm[] = goals.length
    ? goals.map((g) => ({ tone: g.pct >= 100 ? "done" : "goal", label: g.pct >= 100 ? "Done" : "Goal", title: g.title, meta: g.left }))
    : [
        { tone: "goal", label: "Goal", title: "Set your first goal", href: "/goals?example=new#goal-form" },
        ...ex.map((e) => ({ tone: "example" as const, label: "Try", title: e.title, meta: e.meta, href: `/goals?example=${e.id}#goal-form` })),
      ];

  return (
    <>
      <PageTitle wide sub="Targets that update automatically from your training">Goals</PageTitle>
      <div className="max-w-3xl space-y-4">

      <Signpost
        arms={arms}
        note={goals.length ? undefined : "Suggestions are based on your current numbers. Tap one to start from it."}
      />

      {goals.length > 0 && (
        <ul className="divide-y divide-hairline rounded-[10px] border border-line bg-plate">
          {goals.map((g) => {
            const behind = g.expectedPct != null && g.pct < g.expectedPct;
            return (
              <li key={g.id} className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h2 className="text-sm font-bold text-ink">{g.title}</h2>
                    <p className="mt-0.5 text-xs text-muted">
                      {g.note}
                      {g.deadline &&
                        ` · by ${new Date(g.deadline).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}`}
                    </p>
                  </div>
                  <form action={deleteGoal.bind(null, g.id)}>
                    <button className="rounded px-1 text-xs text-muted hover:text-critical" aria-label={`Remove goal ${g.title}`}>
                      Remove
                    </button>
                  </form>
                </div>
                <div className="mb-2 mt-3 flex items-baseline justify-between">
                  <p className="num text-2xl font-extrabold text-ink">
                    {g.current}
                    <span className="text-xs font-semibold text-ink-2">
                      {" "}
                      / {g.target} {g.unit}
                    </span>
                  </p>
                  <p className={`num text-sm font-semibold ${g.pct >= 100 ? "text-good" : "text-ink-2"}`}>
                    {g.pct >= 100 ? "Reached" : `${Math.round(g.pct)}%`}
                  </p>
                </div>
                <Progress pct={g.pct} expected={g.expectedPct} />
                {g.expectedPct != null && g.pct < 100 && (
                  <p className="mt-2 text-xs text-muted">
                    {behind ? "Behind pace" : "On pace"}: {Math.round(g.expectedPct)}% of the {g.period} has passed (orange tick).
                  </p>
                )}
              </li>
            );
          })}
        </ul>
      )}

      <div id="goal-form">
        <GoalForm key={String(sp.example ?? "")} preset={chosen} startOpen={!!sp.example} />
      </div>
      </div>
    </>
  );
}
