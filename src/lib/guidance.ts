// Grounded workout suggestions: picked from the kinds of sessions the athlete
// actually does (last 8 weeks), adjusted for current form. Never invents
// session types that aren't in the history.
import type { Activity } from "./queries";
import { daysBetween } from "./time";

export type SessionKind =
  | "indoor-intervals"
  | "ride-intervals"
  | "run-intervals"
  | "easy-run"
  | "long-run"
  | "endurance-ride"
  | "long-ride"
  | "hiit";

const LABEL: Record<SessionKind, string> = {
  "indoor-intervals": "Indoor intervals",
  "ride-intervals": "Ride intervals",
  "run-intervals": "Run intervals",
  "easy-run": "Easy run",
  "long-run": "Long run",
  "endurance-ride": "Endurance ride",
  "long-ride": "Long ride",
  hiit: "HIIT",
};

const INTERVAL_NAME = /\d+\s*[x×]\s*\d+|interval|tempo|threshold|terskel|drag|prog/i;

export function classify(a: Activity): SessionKind | null {
  const s = a.sport_type;
  if (/WeightTraining|Workout|Crossfit|HighIntensity/.test(s)) return "hiit";
  if (/Ride/.test(s)) {
    const indoor = !!a.trainer || s === "VirtualRide";
    if (INTERVAL_NAME.test(a.name)) return indoor ? "indoor-intervals" : "ride-intervals";
    if (indoor) return "indoor-intervals";
    return a.moving_time >= 2.5 * 3600 ? "long-ride" : "endurance-ride";
  }
  if (/Run/.test(s)) {
    if (INTERVAL_NAME.test(a.name) || /\d{3,4}\s*m\b/i.test(a.name)) return "run-intervals";
    return a.distance >= 14000 || a.moving_time >= 80 * 60 ? "long-run" : "easy-run";
  }
  return null;
}

type Habit = { kind: SessionKind; count: number; last: Activity; minutes: number; km: number };

function median(xs: number[]) {
  const s = [...xs].sort((a, b) => a - b);
  return s.length ? s[Math.floor(s.length / 2)] : 0;
}

export function habits(acts: Activity[], today: string): Habit[] {
  const since = new Date(`${today}T00:00:00Z`);
  since.setUTCDate(since.getUTCDate() - 56);
  const by = new Map<SessionKind, Activity[]>();
  for (const a of acts) {
    if (new Date(`${a.start_date_local.slice(0, 10)}T00:00:00Z`) < since) continue;
    const k = classify(a);
    if (k) by.set(k, [...(by.get(k) ?? []), a]);
  }
  return [...by].map(([kind, list]) => ({
    kind,
    count: list.length,
    last: list[0], // activities are newest first
    minutes: Math.round(median(list.map((a) => a.moving_time)) / 60 / 5) * 5,
    km: Math.round(median(list.map((a) => a.distance)) / 100) / 10,
  }));
}

export type Suggestion = {
  /** Short sign lettering, e.g. "Run intervals 6×1000 m" */
  title: string;
  /** Short numeric meta for the arm, e.g. "~45 min" or "31 d ago" */
  meta: string;
  /** The reasoning, shown under the post */
  detail: string;
  basis: { id: number; name: string; date: string } | null;
};

/** Pull an interval spec like "6×1000 m" or "3×6 min" out of a session name. */
function spec(name: string): string | null {
  const m = name.match(/(\d+)\s*[x×]\s*(\d+)\s*(min|km|m|s)?\b/i);
  if (!m) return null;
  return `${m[1]}×${m[2]}${m[3] ? ` ${m[3].toLowerCase()}` : ""}`;
}

const daysAgo = (h: Habit, today: string) => daysBetween(h.last.start_date_local.slice(0, 10), today);
const ago = (h: Habit, today: string) => {
  const d = daysAgo(h, today);
  return d === 0 ? "today" : d === 1 ? "yesterday" : `${d} days ago`;
};

const size = (h: Habit) =>
  h.km >= 1 && !h.kind.includes("intervals") && h.kind !== "hiit" ? `~${h.km} km` : `~${h.minutes} min`;

export type LastHard = { name: string; days: number; sport: "ride" | "run" | "other" } | null;

const dayWord = (d: number) => (d === 0 ? "today" : d === 1 ? "yesterday" : `${d} days ago`);
const sportOf = (kind: SessionKind) => (kind.includes("ride") || kind === "indoor-intervals" ? "ride" : kind.includes("run") ? "run" : "other");

/**
 * Pick the next session from the athlete's own repertoire.
 * - Hard session today → recovery; yesterday → easy endurance.
 * - Otherwise a key session: the interval type with the highest
 *   "how often you do it × days since you last did it", so habits you keep
 *   come round regularly and a rare one doesn't win just by being old.
 */
export function suggest(acts: Activity[], form: number, lastHard: LastHard, today: string): Suggestion {
  const hs = habits(acts, today);
  const pick = (kinds: SessionKind[]) =>
    hs
      .filter((h) => kinds.includes(h.kind))
      // Prefer what you do often, but rotate: the one done least recently wins ties
      .sort((a, b) => b.count - a.count || a.last.start_date_local.localeCompare(b.last.start_date_local))[0];
  const basis = (h: Habit) => ({ id: h.last.id, name: h.last.name, date: h.last.start_date_local });
  const hardNote = lastHard ? `Last hard session: “${lastHard.name}”, ${dayWord(lastHard.days)}.` : "";

  const easy = pick(["easy-run", "endurance-ride"]);
  if (form < -30 || (lastHard && lastHard.days < 1)) {
    const why = lastHard && lastHard.days < 1 ? `You trained hard today (“${lastHard.name}”).` : "Fatigue is high.";
    return easy
      ? {
          title: `Recovery: rest, or ${LABEL[easy.kind].toLowerCase()} in zone 1`,
          meta: size(easy),
          detail: `${why} Take tomorrow off, or keep it in zone 1–2.`,
          basis: basis(easy),
        }
      : { title: "Recovery day", meta: "", detail: `${why} Recovery is the next session.`, basis: null };
  }

  if (form < -10 || (lastHard && lastHard.days < 2)) {
    if (easy) {
      return {
        title: `${LABEL[easy.kind]}, zone 2`,
        meta: size(easy),
        detail: `${hardNote} Keep this one easy, like “${easy.last.name}” (${ago(easy, today)}). Save intervals for when form is above −10.`,
        basis: basis(easy),
      };
    }
  }

  if (form > 5) {
    const long = pick(["long-ride", "long-run"]);
    if (long) {
      return {
        title: LABEL[long.kind],
        meta: size(long),
        detail: `You're fresh. Your last one was “${long.last.name}”, ${ago(long, today)}.`,
        basis: basis(long),
      };
    }
  }

  // Neutral (or fresh without a long-session habit): a key session you already do.
  // Score = how often you do it × days since the last one.
  const key = hs
    .filter((h) => h.kind.includes("intervals"))
    .map((h) => ({ h, score: h.count * Math.max(1, daysAgo(h, today)) }))
    .sort((a, b) => b.score - a.score)[0]?.h;
  if (key) {
    const every = Math.max(1, Math.round(56 / key.count));
    const balance =
      lastHard && lastHard.sport !== "other" && lastHard.sport !== sportOf(key.kind)
        ? ` Your recent hard work was on the ${lastHard.sport === "ride" ? "bike" : "run"}, so this balances it.`
        : "";
    return {
      title: `${LABEL[key.kind]} ${spec(key.last.name) ?? ""}`.trim(),
      meta: `last ${daysAgo(key, today)} d ago`,
      detail: `${hardNote} You do ${LABEL[key.kind].toLowerCase()} about every ${every} days; the last was “${key.last.name}”, ${ago(key, today)}.${balance} Repeat it, or add one rep.`,
      basis: basis(key),
    };
  }
  const any = pick(Object.keys(LABEL) as SessionKind[]);
  return any
    ? { title: LABEL[any.kind], meta: size(any), detail: "Your most common session lately.", basis: basis(any) }
    : { title: "Any easy session", meta: "", detail: "Not enough recent history to tailor a suggestion yet.", basis: null };
}

/** DNT trail grade for current form: green, blue, red, black. */
export function trailGrade(form: number) {
  if (form > 25) return { grade: "green", label: "Green", zone: "Transition", text: "Very rested; fitness is slipping. Time to build again." } as const;
  if (form > 5) return { grade: "green", label: "Green", zone: "Fresh", text: "Fresh legs. A good day for a long or hard session." } as const;
  if (form > -10) return { grade: "blue", label: "Blue", zone: "Neutral", text: "A good day for one key session." } as const;
  if (form > -30) return { grade: "red", label: "Red", zone: "Building", text: "Productive load. Keep most sessions easy." } as const;
  return { grade: "black", label: "Black", zone: "High fatigue", text: "Deep fatigue. Recovery comes first." } as const;
}
