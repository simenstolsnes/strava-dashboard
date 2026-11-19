import Link from "next/link";
import type { ReactNode } from "react";

export function Card({ title, subtitle, action, children, className = "" }: {
  title?: ReactNode;
  subtitle?: ReactNode;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={`rounded-2xl border border-line bg-surface p-4 ${className}`}>
      {(title || action) && (
        <header className="mb-3 flex items-start justify-between gap-3">
          <div>
            {title && <h2 className="text-[15px] font-semibold text-ink">{title}</h2>}
            {subtitle && <p className="mt-0.5 text-xs text-muted">{subtitle}</p>}
          </div>
          {action}
        </header>
      )}
      {children}
    </section>
  );
}

export function Stat({ label, value, unit, delta, hint }: {
  label: string;
  value: ReactNode;
  unit?: string;
  delta?: { text: string; good: boolean | null };
  hint?: string;
}) {
  return (
    <div className="min-w-0">
      <p className="truncate text-xs text-muted">{label}</p>
      <p className="mt-0.5 text-2xl font-semibold leading-tight text-ink">
        {value}
        {unit && <span className="ml-1 text-sm font-normal text-ink-2">{unit}</span>}
      </p>
      {delta && (
        <p className={`mt-0.5 text-xs ${delta.good === null ? "text-ink-2" : delta.good ? "text-good" : "text-critical"}`}>
          {delta.good === null ? "" : delta.good ? "▲ " : "▼ "}
          {delta.text}
        </p>
      )}
      {hint && <p className="mt-0.5 text-xs text-muted">{hint}</p>}
    </div>
  );
}

export function PageTitle({ children, sub }: { children: ReactNode; sub?: ReactNode }) {
  return (
    <div className="mb-4">
      <h1 className="text-2xl font-bold tracking-tight text-ink">{children}</h1>
      {sub && <p className="mt-1 text-sm text-ink-2">{sub}</p>}
    </div>
  );
}

export function Empty({ children }: { children: ReactNode }) {
  return <p className="rounded-xl bg-surface-2 p-4 text-sm text-ink-2">{children}</p>;
}

/** Ordered zone distribution as one segmented bar plus labelled rows. */
export function ZoneBars({ seconds, names }: { seconds: number[]; names?: string[] }) {
  const total = seconds.reduce((s, x) => s + x, 0);
  if (!total) return <Empty>No zone data yet.</Empty>;
  const fmt = (s: number) => {
    const h = Math.floor(s / 3600);
    const m = Math.round((s % 3600) / 60);
    return h ? `${h}h ${m}m` : `${m}m`;
  };
  return (
    <div>
      <div className="flex h-3 w-full gap-[2px] overflow-hidden rounded-full" role="img" aria-label="Zone distribution">
        {seconds.map((s, i) =>
          s ? <div key={i} style={{ width: `${(s / total) * 100}%`, background: `var(--z${i + 1})` }} title={`Z${i + 1}: ${fmt(s)}`} /> : null,
        )}
      </div>
      <ul className="mt-3 space-y-1.5">
        {seconds.map((s, i) => (
          <li key={i} className="flex items-center gap-2 text-sm">
            <span className="h-2.5 w-2.5 shrink-0 rounded-sm" style={{ background: `var(--z${i + 1})` }} />
            <span className="w-24 text-ink-2">{names?.[i] ?? `Zone ${i + 1}`}</span>
            <span className="tabular ml-auto text-ink">{fmt(s)}</span>
            <span className="tabular w-11 text-right text-muted">{Math.round((s / total) * 100)}%</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function Progress({ pct, expected }: { pct: number; expected?: number | null }) {
  const ahead = expected == null || pct >= expected;
  return (
    <div className="relative h-2 w-full rounded-full bg-surface-2">
      <div
        className="h-2 rounded-full"
        style={{ width: `${Math.max(2, pct)}%`, background: pct >= 100 ? "var(--good)" : "var(--s1)" }}
      />
      {expected != null && expected < 100 && (
        <div
          className="absolute -top-1 h-4 w-0.5 rounded bg-ink-2"
          style={{ left: `${expected}%` }}
          title={ahead ? "On track" : "Behind schedule"}
        />
      )}
    </div>
  );
}

export function SportDot({ group }: { group: "ride" | "run" | "strength" | "other" }) {
  const color = { ride: "var(--s1)", run: "var(--s2)", strength: "var(--s3)", other: "var(--s4)" }[group];
  return <span className="inline-block h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: color }} aria-hidden />;
}

export function TextLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link href={href} className="text-sm font-medium text-accent">
      {children}
    </Link>
  );
}
