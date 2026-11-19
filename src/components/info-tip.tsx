"use client";

import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState, type ReactNode } from "react";

const WIDTH = 288;
const GAP = 12;

/**
 * Small "i" button that explains a measure. Opens on hover (desktop) and on
 * tap/click or keyboard (phone); Escape or a click elsewhere closes it.
 * The panel positions itself inside the viewport wherever the button sits.
 */
export function InfoTip({ children, label = "What does this mean?" }: { children: ReactNode; label?: string; align?: "start" | "end" }) {
  const [open, setOpen] = useState(false);
  const [pinned, setPinned] = useState(false);
  const [pos, setPos] = useState<{ top: number; left: number; width: number } | null>(null);
  const id = useId();
  const wrap = useRef<HTMLSpanElement>(null);
  const btn = useRef<HTMLButtonElement>(null);

  const place = useCallback(() => {
    const r = btn.current?.getBoundingClientRect();
    if (!r) return;
    const width = Math.min(WIDTH, window.innerWidth - GAP * 2);
    const left = Math.min(Math.max(r.left - 8, GAP), window.innerWidth - width - GAP);
    setPos({ top: r.bottom + 6, left, width });
  }, []);

  useLayoutEffect(() => {
    if (open) place();
  }, [open, place]);

  useEffect(() => {
    if (!open) return;
    const close = () => {
      setOpen(false);
      setPinned(false);
    };
    const onDoc = (e: PointerEvent) => {
      if (wrap.current && !wrap.current.contains(e.target as Node)) close();
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && close();
    document.addEventListener("pointerdown", onDoc);
    document.addEventListener("keydown", onKey);
    window.addEventListener("scroll", place, { passive: true });
    window.addEventListener("resize", place);
    return () => {
      document.removeEventListener("pointerdown", onDoc);
      document.removeEventListener("keydown", onKey);
      window.removeEventListener("scroll", place);
      window.removeEventListener("resize", place);
    };
  }, [open, place]);

  return (
    <span
      ref={wrap}
      className="inline-flex align-middle normal-case tracking-normal"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => !pinned && setOpen(false)}
    >
      <button
        ref={btn}
        type="button"
        aria-label={label}
        aria-expanded={open}
        aria-describedby={open ? id : undefined}
        onClick={() => {
          // Click pins it open (hover alone is temporary); a second click closes it.
          const close = open && pinned;
          setOpen(!close);
          setPinned(!close);
        }}
        className={`-my-1 ml-1 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${open ? "text-teal" : "text-muted hover:text-teal"}`}
      >
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
          <circle cx="12" cy="12" r="9.5" />
          <path d="M12 11v6M12 7.5v.5" />
        </svg>
      </button>
      {open && pos && (
        <span
          role="tooltip"
          id={id}
          style={{ top: pos.top, left: pos.left, width: pos.width }}
          className="fixed z-40 block rounded-md border border-line bg-plate p-3 text-left text-xs font-normal leading-relaxed text-ink-2 shadow-[0_6px_20px_rgba(20,33,31,0.14)]"
        >
          {children}
        </span>
      )}
    </span>
  );
}
