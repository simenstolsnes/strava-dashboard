import Link from "next/link";
import type { ReactNode } from "react";
import { InfoTip } from "./info-tip";

/** White plate on the granite ground. */
export function Card({ title, subtitle, action, info, children, className = "" }: {
  title?: ReactNode;
  subtitle?: ReactNode;
  action?: ReactNode;
  /** Deeper explanation behind an "i" button next to the title */
  info?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={`rounded-[10px] border border-line bg-plate p-4 ${className}`}>
      {(title || action) && (
        <header className="mb-3 flex items-start justify-between gap-3">
          <div className="min-w-0">
            {title && (
              <h2 className="text-sm font-bold text-ink">
                {title}
                {info && <InfoTip label={`About ${typeof title === "string" ? title : "this chart"}`}>{info}</InfoTip>}
              </h2>
            )}
            {subtitle && <p className="mt-0.5 text-xs text-muted">{subtitle}</p>}
          </div>
          {action}
        </header>
      )}
      {children}
    </section>
  );
}

export function Stat({ label, value, unit, delta, hint, info, infoAlign }: {
  label: string;
  info?: ReactNode;
  infoAlign?: "start" | "end";
  value: ReactNode;
  unit?: string;
  delta?: { text: string; good: boolean | null };
  hint?: string;
}) {
  return (
    <div className="min-w-0">
      <p className="label flex items-start">
        <span className="min-w-0 hyphens-auto">{label}</span>
        {info && (
          <InfoTip label={`About ${label}`} align={infoAlign}>
            {info}
          </InfoTip>
        )}
      </p>
      <p className="num mt-1 text-2xl font-extrabold text-ink">
        {value}
        {unit && <span className="ml-1 text-xs font-semibold text-ink-2">{unit}</span>}
      </p>
      {delta && (
        <p className={`mt-1 text-xs ${delta.good === null ? "text-ink-2" : delta.good ? "text-good" : "text-critical"}`}>
          {delta.good !== null && (
            <svg width="9" height="9" viewBox="0 0 10 10" className="mr-1 inline align-baseline" aria-hidden>
              <path d={delta.good ? "M5 1l4 7H1z" : "M5 9L1 2h8z"} fill="currentColor" />
            </svg>
          )}
          {delta.text}
        </p>
      )}
      {hint && <p className="mt-1 text-xs text-muted">{hint}</p>}
    </div>
  );
}

/** Teal band that continues the shell bar; each page's title lives here. */
export function PageTitle({ children, sub, aside, wide = false }: { children: ReactNode; sub?: ReactNode; aside?: ReactNode; wide?: boolean }) {
  return (
    <div className="-mt-4 mb-4 bg-teal pb-5 pt-1 text-white" style={{ marginInline: "calc(50% - 50vw)" }}>
      <div className={`mx-auto flex items-end justify-between gap-3 px-4 ${wide ? "max-w-6xl" : "max-w-3xl"}`}>
        <div className="min-w-0">
          <h1 className="text-2xl font-extrabold tracking-tight">{children}</h1>
          {sub && <p className="mt-1.5 text-xs text-teal-ink">{sub}</p>}
        </div>
        {aside}
      </div>
    </div>
  );
}

export function Empty({ children }: { children: ReactNode }) {
  return <p className="rounded-[10px] border border-dashed border-line bg-plate p-4 text-sm text-ink-2">{children}</p>;
}

// ---------- Icons (authored, nav stroke weight) ----------

export function Icon({ name, size = 16 }: { name: "chevron" | "external" | "plus"; size?: number }) {
  const d = {
    chevron: "M9 6l6 6-6 6",
    external: "M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 01-1 1H5a1 1 0 01-1-1V7a1 1 0 011-1h5",
    plus: "M12 5v14M5 12h14",
  }[name];
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden className="inline-block shrink-0">
      <path d={d} />
    </svg>
  );
}

// ---------- Signpost: the signature ----------

export type Arm = {
  tone: "next" | "goal" | "done" | "example";
  label: string;
  /** Sign lettering: a short noun phrase */
  title: string;
  /** Short numeric meta at the arm's tip */
  meta?: string;
  href?: string;
};

const ARM_BG: Record<Arm["tone"], string> = {
  next: "var(--rust)",
  goal: "var(--teal-dark)",
  done: "var(--good)",
  example: "var(--plate)",
};

/** Guidance and goals as routed arms on a wooden post; `note` reads under the post. */
export function Signpost({ arms, note }: { arms: Arm[]; note?: ReactNode }) {
  return (
    <div>
      <div className="relative pl-5" role="list" aria-label="Signpost: next session and goals">
        <div className="absolute bottom-0 left-1.5 top-0 w-2 rounded-sm" style={{ background: "var(--post)" }} aria-hidden />
        {arms.map((arm, i) => {
          const example = arm.tone === "example";
          const shape = "polygon(0 0, calc(100% - 20px) 0, 100% 50%, calc(100% - 20px) 100%, 0 100%)";
          const body = (
            // Outlined example arms: a teal-dark arm with a white arm inset 2px inside it
            <div className="relative" style={{ clipPath: shape, background: example ? "var(--teal-dark)" : undefined, padding: example ? 2 : 0 }}>
              <div
                className={`flex min-h-[58px] items-center gap-3 py-2.5 pl-3.5 pr-8 transition-[filter] active:brightness-110 ${example ? "text-teal-dark" : "text-white"}`}
                style={{ background: ARM_BG[arm.tone], clipPath: shape }}
              >
                <span className="label w-11 shrink-0" style={{ color: example ? "var(--muted)" : "rgba(255,255,255,.82)" }}>
                  {arm.label}
                </span>
                <span className="min-w-0 flex-1 text-lg font-extrabold leading-tight [text-wrap:balance]">{arm.title}</span>
                {arm.meta ? (
                  <span className={`num shrink-0 text-xs font-semibold ${example ? "text-ink-2" : "text-white/90"}`}>{arm.meta}</span>
                ) : arm.href ? (
                  <Icon name="chevron" size={18} />
                ) : null}
              </div>
            </div>
          );
          return (
            <div key={i} role="listitem" className="mb-2 last:mb-0">
              {arm.href ? (
                <Link href={arm.href} className="block rounded-sm" aria-label={`${arm.label}: ${arm.title}${arm.meta ? `, ${arm.meta}` : ""}`}>
                  {body}
                </Link>
              ) : (
                body
              )}
            </div>
          );
        })}
      </div>
      {note && <p className="mt-2.5 pl-5 text-sm text-ink-2">{note}</p>}
    </div>
  );
}

/** Painted DNT trail-grade square. */
export function GradeMark({ grade, size = 34 }: { grade: "green" | "blue" | "red" | "black"; size?: number }) {
  return (
    <span
      aria-hidden
      className="inline-block shrink-0 rounded-[3px]"
      style={{ width: size, height: size, background: `var(--grade-${grade})`, boxShadow: "0 0 0 3px #fff, 0 0 0 4px var(--border)" }}
    />
  );
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
      <div className="flex h-3 w-full gap-[2px] overflow-hidden rounded-sm" role="img" aria-label="Zone distribution">
        {seconds.map((s, i) =>
          s ? <div key={i} style={{ width: `${(s / total) * 100}%`, background: `var(--z${i + 1})` }} title={`Z${i + 1}: ${fmt(s)}`} /> : null,
        )}
      </div>
      <ul className="mt-3 max-w-md space-y-1.5">
        {seconds.map((s, i) => (
          <li key={i} className="flex items-center gap-2 text-sm">
            <span className="h-2.5 w-2.5 shrink-0 rounded-[2px]" style={{ background: `var(--z${i + 1})` }} />
            <span className="w-24 text-ink-2">{names?.[i] ?? `Zone ${i + 1}`}</span>
            <span className="num ml-auto text-ink">{fmt(s)}</span>
            <span className="num w-11 text-right text-muted">{Math.round((s / total) * 100)}%</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function Progress({ pct, expected }: { pct: number; expected?: number | null }) {
  return (
    <div className="relative h-2 w-full rounded-sm bg-rock-2">
      <div className="h-2 rounded-sm" style={{ width: `${Math.max(2, pct)}%`, background: pct >= 100 ? "var(--good)" : "var(--teal)" }} />
      {expected != null && expected < 100 && (
        <div className="absolute -top-1 h-4 w-0.5 rounded bg-rust" style={{ left: `${expected}%` }} title="Where you should be by now" />
      )}
    </div>
  );
}

export const SPORT_COLOR = { ride: "var(--s-ride)", run: "var(--s-run)", strength: "var(--s-strength)", other: "var(--s-other)" };

export function SportDot({ group }: { group: "ride" | "run" | "strength" | "other" }) {
  return <span className="inline-block h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: SPORT_COLOR[group] }} aria-hidden />;
}

export function TextLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link href={href} className="text-sm font-semibold text-teal underline-offset-4 hover:underline">
      {children}
    </Link>
  );
}
