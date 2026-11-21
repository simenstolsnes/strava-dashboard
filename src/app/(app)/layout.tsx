import Link from "next/link";
import { BottomNav } from "@/components/nav";
import { ViewSwitch } from "@/components/view-switch";

export default function AppLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="min-h-dvh">
      <header className="sticky top-0 z-10 bg-teal text-white" style={{ paddingTop: "env(safe-area-inset-top)" }}>
        <div className="mx-auto flex h-12 max-w-6xl items-center justify-between px-4">
          <Link href="/start" className="flex items-center gap-2 font-bold tracking-tight">
            <svg width="18" height="18" viewBox="0 0 20 20" aria-hidden>
              <rect x="1" y="3" width="18" height="5" rx="1" fill="var(--rust)" />
              <rect x="8" y="3" width="4" height="15" rx="1" fill="var(--rust)" />
            </svg>
            Training
          </Link>
          <div className="flex items-center gap-1">
            <ViewSwitch />
            <Link href="/settings" aria-label="Settings" className="-mr-2 rounded-md p-2 text-teal-ink hover:text-white">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
                <circle cx="12" cy="12" r="3" />
                <path d="M19.4 15a1.7 1.7 0 00.3 1.8l.1.1a2 2 0 11-2.8 2.8l-.1-.1a1.7 1.7 0 00-1.8-.3 1.7 1.7 0 00-1 1.5V21a2 2 0 11-4 0v-.1a1.7 1.7 0 00-1.1-1.5 1.7 1.7 0 00-1.8.3l-.1.1a2 2 0 11-2.8-2.8l.1-.1a1.7 1.7 0 00.3-1.8 1.7 1.7 0 00-1.5-1H3a2 2 0 110-4h.1a1.7 1.7 0 001.5-1.1 1.7 1.7 0 00-.3-1.8l-.1-.1a2 2 0 112.8-2.8l.1.1a1.7 1.7 0 001.8.3H9a1.7 1.7 0 001-1.5V3a2 2 0 114 0v.1a1.7 1.7 0 001 1.5 1.7 1.7 0 001.8-.3l.1-.1a2 2 0 112.8 2.8l-.1.1a1.7 1.7 0 00-.3 1.8V9a1.7 1.7 0 001.5 1H21a2 2 0 110 4h-.1a1.7 1.7 0 00-1.5 1z" />
              </svg>
            </Link>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 pb-28 pt-4">{children}</main>
      <BottomNav />
    </div>
  );
}
