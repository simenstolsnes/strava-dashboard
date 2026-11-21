import { cookies } from "next/headers";
import Link from "next/link";
import { OWNER, personByKey } from "@/lib/people";

export const metadata = { title: "Log in" };

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const { error, as } = await searchParams;
  // A friend's personal link (?as=ola), remembered on this device after the first login
  const key = typeof as === "string" ? as : (await cookies()).get("login_as")?.value;
  const person = personByKey(key) ?? personByKey(OWNER);
  const friend = person && person.key !== OWNER ? person.key : null;
  return (
    <main className="flex min-h-dvh flex-col bg-teal px-6 text-white" style={{ paddingTop: "env(safe-area-inset-top)" }}>
      <div className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center">
        {/* A signpost pointing the way in */}
        <div className="relative mb-10 pl-5" aria-hidden>
          <div className="absolute bottom-0 left-1.5 top-0 w-2 rounded-sm" style={{ background: "var(--post)" }} />
          {["Fitness", "Power", "Goals"].map((w, i) => (
            <div
              key={w}
              className="mb-2 flex h-11 items-center pl-3.5 text-sm font-extrabold"
              style={{
                width: `${88 - i * 14}%`,
                background: i === 0 ? "var(--rust)" : "var(--teal-dark)",
                clipPath: "polygon(0 0, calc(100% - 16px) 0, 100% 50%, calc(100% - 16px) 100%, 0 100%)",
              }}
            >
              {w}
            </div>
          ))}
        </div>

        <h1 className="text-2xl font-extrabold tracking-tight">Training</h1>
        <p className="mt-2 text-sm text-teal-ink">Your fitness, power and goals, read from your own Strava history.</p>

        {error && (
          <p role="alert" className="mt-5 rounded-md border border-white/30 bg-teal-dark px-4 py-3 text-sm">
            {String(error)}
          </p>
        )}

        <a
          href={friend ? `/api/auth/login?as=${friend}` : "/api/auth/login"}
          className="mt-8 flex h-12 items-center justify-center rounded-md text-sm font-bold text-white"
          style={{ background: "#fc5200" }}
        >
          Connect with Strava
        </a>
        <p className="mt-3 text-xs text-teal-ink">Private. Read-only access to your activities.</p>
        {friend && (
          <p className="mt-6 text-xs text-teal-ink">
            Logging in with the <span className="font-semibold capitalize text-white">{friend}</span> link.{" "}
            <Link href={`/login?as=${OWNER}`} className="font-semibold text-white underline underline-offset-4">
              Not you?
            </Link>
          </p>
        )}
      </div>
    </main>
  );
}
