/** @format */

"use client";

import { useSyncExternalStore } from "react";
import Link from "next/link";
import {
  getLastReadSnapshot,
  parseLastRead,
  subscribeLastRead,
} from "@/lib/lastRead";

// Shown on the home page only when the visitor has read something before
export function ContinueReading() {
  const last = parseLastRead(
    useSyncExternalStore(subscribeLastRead, getLastReadSnapshot, () => ""),
  );
  if (!last) return null;

  return (
    <Link
      href={`/surah/${last.surah}#ayah-${last.ayah}`}
      className="glass group mx-auto mb-10 flex max-w-xl items-center justify-between gap-4 rounded-2xl p-4 ps-5 transition duration-300 hover:-translate-y-0.5 hover:shadow-[0_0_40px_rgba(56,189,248,0.2)]">
      <div>
        <p className="font-arabic text-xs text-white/40">تابع القراءة</p>
        <p className="mt-1 font-arabic text-lg transition group-hover:text-accent">
          {last.surahName ? `سورة ${last.surahName}` : `السورة ${last.surah}`}
          <span className="text-white/50"> · الآية {last.ayah}</span>
        </p>
      </div>
      <span
        aria-hidden
        className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-white/15 text-white/60 transition group-hover:border-accent/60 group-hover:text-accent">
        ←
      </span>
    </Link>
  );
}
