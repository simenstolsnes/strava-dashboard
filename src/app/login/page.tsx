export const metadata = { title: "Log in" };

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const { error } = await searchParams;
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center px-6 text-center">
      <svg width="64" height="64" viewBox="0 0 100 100" aria-hidden className="mb-6">
        <rect width="100" height="100" rx="22" fill="#0d0d0d" />
        <path d="M18 70 L36 50 L48 60 L66 32 L84 22" fill="none" stroke="#eb6834" strokeWidth="8" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M18 82 L84 82" stroke="#3987e5" strokeWidth="5" strokeLinecap="round" />
      </svg>
      <h1 className="text-2xl font-bold text-ink">Training dashboard</h1>
      <p className="mt-2 max-w-xs text-sm text-ink-2">Your fitness, power and goals, built on your Strava data.</p>
      {error && (
        <p role="alert" className="mt-4 max-w-xs rounded-xl bg-surface-2 px-4 py-2 text-sm text-critical">
          {String(error)}
        </p>
      )}
      <a
        href="/api/auth/login"
        className="mt-8 rounded-xl px-6 py-3 text-sm font-semibold text-white"
        style={{ background: "#fc5200" }}
      >
        Connect with Strava
      </a>
    </main>
  );
}
