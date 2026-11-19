"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "/", label: "Today", icon: "M3 12l9-8 9 8M5 10v10h5v-6h4v6h5V10" },
  { href: "/power", label: "Power", icon: "M13 2L4 14h7l-1 8 9-12h-7l1-8z" },
  { href: "/activities", label: "Activities", icon: "M4 6h16M4 12h16M4 18h10" },
  { href: "/progress", label: "Progress", icon: "M3 17l6-6 4 4 8-8M15 7h6v6" },
  { href: "/goals", label: "Goals", icon: "M12 21a9 9 0 100-18 9 9 0 000 18zm0-4a5 5 0 100-10 5 5 0 000 10zm0-4a1 1 0 100-2 1 1 0 000 2z" },
];

export function BottomNav() {
  const path = usePathname();
  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-20 border-t border-line bg-plate"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <ul className="mx-auto flex max-w-6xl">
        {TABS.map((t) => {
          const active = t.href === "/" ? path === "/" : path.startsWith(t.href);
          return (
            <li key={t.href} className="flex-1">
              <Link
                href={t.href}
                className={`relative flex flex-col items-center gap-1 pb-2 pt-2.5 text-xs font-semibold ${active ? "text-teal" : "text-muted hover:text-ink-2"}`}
                aria-current={active ? "page" : undefined}
              >
                {active && <span className="absolute top-0 h-[3px] w-8 rounded-b bg-rust" aria-hidden />}
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                  <path d={t.icon} />
                </svg>
                {t.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
