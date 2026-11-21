"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

/** Header shortcut between your own training and the comparison: shows whichever one you're not on. */
export function ViewSwitch() {
  const onCompare = usePathname().startsWith("/compare");
  const to = onCompare
    ? { href: "/", label: "My training", icon: "M3 12l9-8 9 8M5 10v10h5v-6h4v6h5V10" }
    : { href: "/compare", label: "Compare", icon: "M6 20V10M12 20V4M18 20v-7" };
  return (
    <Link href={to.href} className="flex items-center gap-1.5 rounded-md px-2 py-2 text-xs font-semibold text-teal-ink hover:text-white">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <path d={to.icon} />
      </svg>
      {to.label}
    </Link>
  );
}
