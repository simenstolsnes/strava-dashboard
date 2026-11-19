export const metadata = { title: "Log in" };

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const { error } = await searchParams;
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
          href="/api/auth/login"
          className="mt-8 flex h-12 items-center justify-center rounded-md text-sm font-bold text-white"
          style={{ background: "#fc5200" }}
        >
          Connect with Strava
        </a>
        <p className="mt-3 text-xs text-teal-ink">Private to its owner. Read-only access to your activities.</p>
      </div>
    </main>
  );
}
