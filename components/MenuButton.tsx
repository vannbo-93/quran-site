/** @format */

"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  getLastReadSnapshot,
  parseLastRead,
  subscribeLastRead,
} from "@/lib/lastRead";

const LINKS = [
  { href: "/", label: "فهرس السور", en: "Surahs" },
  { href: "/juz", label: "الأجزاء", en: "Juz" },
  { href: "/search", label: "البحث", en: "Search" },
  { href: "/about", label: "عن الموقع والمصادر", en: "About" },
];

// Dropdown under the MENU button
export function MenuButton() {
  const [open, setOpen] = useState(false);
  const boxRef = useRef<HTMLDivElement | null>(null);
  const pathname = usePathname();
  const last = parseLastRead(
    useSyncExternalStore(subscribeLastRead, getLastReadSnapshot, () => ""),
  );

  // Close on outside click or Escape
  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: PointerEvent) => {
      if (!boxRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  return (
    <div ref={boxRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-haspopup="menu"
        aria-controls="site-menu"
        className={`flex items-center gap-2 rounded-md border px-4 py-2 tracking-widest transition hover:bg-white/20 ${
          open
            ? "border-accent/60 bg-white/15 text-accent"
            : "border-white/15 bg-white/10"
        }`}>
        <span className="text-base leading-none">{open ? "✕" : "☰"}</span> MENU
      </button>

      {open && (
        <div
          id="site-menu"
          role="menu"
          dir="rtl"
          className="absolute right-0 top-full mt-2 w-72 max-w-[calc(100vw-2rem)] rounded-2xl border border-white/15 bg-black p-1.5 shadow-[0_10px_40px_rgba(0,0,0,0.8)]">
          {last && (
            <>
              <Link
                href={`/surah/${last.surah}#ayah-${last.ayah}`}
                role="menuitem"
                onClick={() => setOpen(false)}
                className="group flex items-center justify-between gap-3 rounded-xl px-3 py-2.5 transition hover:bg-white/5">
                <span>
                  <span className="block font-arabic text-[11px] text-white/40">
                    تابع القراءة
                  </span>
                  <span className="font-arabic text-sm font-light transition group-hover:text-accent">
                    {last.surahName
                      ? `سورة ${last.surahName}`
                      : `السورة ${last.surah}`}
                    <span className="text-white/50"> · الآية {last.ayah}</span>
                  </span>
                </span>
                <span
                  aria-hidden
                  className="text-white/40 transition group-hover:text-accent">
                  ←
                </span>
              </Link>
              <div aria-hidden className="mx-2 my-1 h-px bg-white/10" />
            </>
          )}

          {LINKS.map((link) => {
            const active = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                role="menuitem"
                onClick={() => setOpen(false)}
                aria-current={active ? "page" : undefined}
                className={`group flex items-center justify-between gap-3 rounded-xl px-3 py-2.5 transition ${
                  active ? "bg-white/10" : "hover:bg-white/5"
                }`}>
                <span
                  className={`font-arabic text-base font-light transition ${
                    active
                      ? "text-accent"
                      : "text-white/80 group-hover:text-accent"
                  }`}>
                  {link.label}
                </span>
                <span
                  dir="ltr"
                  className="font-serif text-sm italic text-white/30">
                  {link.en}
                </span>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
