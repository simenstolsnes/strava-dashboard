import { requireAthlete } from "@/lib/auth";
import { getGoals } from "@/lib/queries";
import { Card, Empty, PageTitle, Progress } from "@/components/ui";
import { deleteGoal } from "./actions";
import { GoalForm } from "./goal-form";

export const metadata = { title: "Goals" };

export default async function GoalsPage() {
  await requireAthlete();
  const goals = await getGoals();

  return (
    <div className="space-y-4">
      <PageTitle sub="Targets that update automatically from your training">Goals</PageTitle>

      {!goals.length && (
        <Empty>
          No goals yet. Try “FTP 280 W by March”, “Run 30 km per week” or “20 min power 300 W”.
        </Empty>
      )}

      {goals.map((g) => {
        const behind = g.expectedPct != null && g.pct < g.expectedPct;
        return (
          <Card
            key={g.id}
            title={g.title}
            subtitle={g.note + (g.deadline ? ` · by ${new Date(g.deadline).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}` : "")}
            action={
              <form action={deleteGoal.bind(null, g.id)}>
                <button className="text-xs text-muted" aria-label={`Delete goal ${g.title}`}>
                  Remove
                </button>
              </form>
            }
          >
            <div className="mb-2 flex items-baseline justify-between">
              <p className="tabular text-2xl font-semibold text-ink">
                {g.current}
                <span className="text-sm font-normal text-ink-2">
                  {" "}
                  / {g.target} {g.unit}
                </span>
              </p>
              <p className={`text-sm ${g.pct >= 100 ? "text-good" : behind ? "text-ink-2" : "text-ink-2"}`}>
                {g.pct >= 100 ? "✓ Reached" : `${Math.round(g.pct)}%`}
              </p>
            </div>
            <Progress pct={g.pct} expected={g.expectedPct} />
            {g.expectedPct != null && g.pct < 100 && (
              <p className="mt-2 text-xs text-muted">
                {behind
                  ? `Behind pace: ${Math.round(g.expectedPct)}% of the ${g.period} has passed.`
                  : `On track: ${Math.round(g.expectedPct)}% of the ${g.period} has passed.`}
              </p>
            )}
          </Card>
        );
      })}

      <GoalForm />
    </div>
  );
}
