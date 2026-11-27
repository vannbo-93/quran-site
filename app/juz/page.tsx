/** @format */

import type { Metadata } from "next";
import Link from "next/link";
import { getJuzStarts } from "@/lib/juz";
import { toArabicDigits } from "@/lib/quran";

export const metadata: Metadata = {
  title: "الأجزاء", // the layout adds " | القرآن الكريم"
  description:
    "أجزاء القرآن الكريم الثلاثون، وبداية كل جزء: السورة والآية ورقم الصفحة.",
  alternates: { canonical: "/juz" },
};

export default async function JuzPage() {
  const starts = await getJuzStarts();

  return (
    <main className="mx-auto max-w-7xl px-4 pt-12 pb-20 sm:px-6">
      <div
        dir="ltr"
        className="mb-8 flex items-end justify-between border-b border-white/10 pb-4">
        <h1 className="text-4xl font-medium tracking-tight md:text-5xl">
          Juz{" "}
          <span className="font-serif font-normal italic text-white/60">
            Index
          </span>
        </h1>
        <span className="text-sm text-white/40">30</span>
      </div>

      <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {starts.map((j) => (
          <li key={j.juz}>
            <Link
              href={`/surah/${j.surah_id}#ayah-${j.ayah_number}`}
              className="glass group block rounded-2xl p-5 transition duration-300 hover:-translate-y-1 hover:shadow-[0_0_40px_rgba(56,189,248,0.25)]">
              <div
                dir="ltr"
                className="flex items-center justify-between text-xs text-white/40">
                <span className="tabular-nums">
                  {String(j.juz).padStart(2, "0")}
                </span>
                <span className="uppercase tracking-widest">Page {j.page}</span>
              </div>
              <p className="mt-6 font-arabic text-2xl transition group-hover:text-accent">
                الجزء {toArabicDigits(j.juz)}
              </p>
              <p className="mt-1 font-arabic text-sm text-white/50">
                يبدأ من سورة {j.surah_name} · الآية{" "}
                {toArabicDigits(j.ayah_number)}
              </p>
            </Link>
          </li>
        ))}
      </ul>
    </main>
  );
}
