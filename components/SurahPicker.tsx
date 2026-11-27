"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

type Item = { id: number; name_ar: string; name_en: string };

// Arabic: no tashkeel/tatweel, one alef, ة→ه, ى→ي
const normArabic = (t: string) =>
  t
    .replace(/[\u064B-\u065F\u0670\u0640]/g, "")
    .replace(/[أإآٱ]/g, "ا")
    .replace(/ة/g, "ه")
    .replace(/ى/g, "ي")
    .replace(/^سوره\s*/, "")
    .trim();
// "Al-Ikhlaas" and "ikhlas" match: letters only, doubled letters collapsed
const normLatin = (t: string) =>
  t
    .toLowerCase()
    .replace(/[^a-z]/g, "")
    .replace(/(.)\1+/g, "$1");
const toLatinDigits = (t: string) => t.replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - 0x0660));

// Number: exact match first, then numbers starting with it. Text: Arabic or English name.
function filterSurahs(surahs: Item[], query: string) {
  const q = toLatinDigits(query).trim();
  if (!q) return surahs;
  if (/^\d+$/.test(q)) {
    const exact = surahs.filter((s) => String(s.id) === q);
    return [...exact, ...surahs.filter((s) => String(s.id) !== q && String(s.id).startsWith(q))];
  }
  const ar = normArabic(q);
  const en = normLatin(q).replace(/h$/, ""); // "baqarah" → "baqara"
  return surahs.filter((s) => (ar && normArabic(s.name_ar).includes(ar)) || (en && normLatin(s.name_en).includes(en)));
}

// "السور" button: a list of all surahs (7 visible, scroll for the rest),
// with a box on top to filter by number or name. Enter opens the first result.
export function SurahPicker({ surahs }: { surahs: Item[] }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const boxRef = useRef<HTMLDivElement | null>(null);
  const listRef = useRef<HTMLUListElement | null>(null);
  const router = useRouter();
  const results = filterSurahs(surahs, query);

  const toggle = () => {
    setQuery(""); // start fresh every time it opens
    setOpen((o) => !o);
  };

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
        onClick={toggle}
        aria-expanded={open}
        aria-controls="surah-picker"
        className={`flex items-center gap-2 rounded-lg border px-3 py-1.5 font-arabic text-sm transition hover:border-accent/50 hover:text-accent ${
          open ? "border-accent/50 text-accent" : "border-white/15 text-white/70"
        }`}
      >
        السور
        <svg
          viewBox="0 0 24 24"
          className={`h-3.5 w-3.5 transition-transform duration-300 ${open ? "rotate-180" : ""}`}
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden
        >
          <path d="m6 9 6 6 6-6" />
        </svg>
      </button>

      {open && (
        <div
          dir="rtl"
          className="absolute right-0 top-full z-40 mt-2 w-72 rounded-xl border border-white/15 bg-black p-1 shadow-[0_10px_40px_rgba(0,0,0,0.8)]"
        >
          <input
            type="search"
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && results[0]) {
                e.preventDefault();
                setOpen(false);
                router.push(`/surah/${results[0].id}`);
              } else if (e.key === "ArrowDown") {
                e.preventDefault();
                listRef.current?.querySelector("a")?.focus();
              }
            }}
            placeholder="رقم السورة أو اسمها"
            aria-label="ابحث عن سورة برقمها أو اسمها"
            aria-controls="surah-picker"
            className="mb-1 w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 font-arabic text-sm text-white outline-none transition placeholder:text-white/30 focus:border-accent/60"
          />

          {results.length === 0 ? (
            <p className="px-3 py-4 text-center font-arabic text-sm text-white/40">لا توجد سورة بهذا الرقم أو الاسم</p>
          ) : (
            <ul
              ref={listRef}
              id="surah-picker"
              aria-label="اختيار سورة"
              // 7 rows of 2.5rem visible, the rest by scrolling
              className="reciter-menu max-h-[17.5rem] overflow-y-auto overscroll-contain"
              onKeyDown={(e) => {
                // Up / down arrows move between surahs
                const links = Array.from(listRef.current?.querySelectorAll("a") ?? []);
                const i = links.indexOf(document.activeElement as HTMLAnchorElement);
                if (e.key === "ArrowDown" && i < links.length - 1) {
                  e.preventDefault();
                  links[i + 1].focus();
                } else if (e.key === "ArrowUp") {
                  e.preventDefault();
                  if (i > 0) links[i - 1].focus();
                  else boxRef.current?.querySelector("input")?.focus();
                }
              }}
            >
              {results.map((s) => (
                <li key={s.id}>
                  <Link
                    href={`/surah/${s.id}`}
                    onClick={() => setOpen(false)}
                    className="flex h-10 items-center gap-3 rounded-lg px-3 font-arabic text-sm text-white/75 transition hover:bg-white/5 hover:text-accent focus-visible:bg-white/5 focus-visible:text-accent focus-visible:outline-none"
                  >
                    <span className="w-7 shrink-0 text-center text-xs tabular-nums text-white/40">{s.id}</span>
                    <span className="flex-1 truncate">{s.name_ar}</span>
                    <span dir="ltr" className="truncate text-xs text-white/30">
                      {s.name_en}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
