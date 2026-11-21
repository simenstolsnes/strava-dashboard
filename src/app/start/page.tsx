import { requireAthlete } from "@/lib/auth";
import { getConnected } from "@/lib/compare";
import { Signpost } from "@/components/ui";

export const metadata = { title: "Training" };

/** Where you land after logging in: your own dashboard, or the comparison. */
export default async function StartPage() {
  const me = await requireAthlete();
  const connected = await getConnected(me);
  const first = connected.find((p) => p.isMe)?.name;
  const others = connected.filter((p) => !p.isMe).map((p) => p.name);

  return (
    <main className="flex min-h-dvh flex-col bg-teal px-6 text-white" style={{ paddingTop: "env(safe-area-inset-top)" }}>
      <div className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center">
        <h1 className="text-2xl font-extrabold tracking-tight">{first ? `Hi, ${first}` : "Training"}</h1>
        <p className="mb-8 mt-2 text-sm text-teal-ink">Which way today?</p>
        <Signpost
          arms={[
            {
              tone: "next",
              label: "Mine",
              title: "My training",
              href: "/",
            },
            {
              tone: "goal",
              label: "Versus",
              title: others.length ? `Compare with ${others.join(", ")}` : "Compare",
              href: "/compare",
            },
          ]}
        />
      </div>
    </main>
  );
}
