/** @format */

import Link from "next/link";
import { getSurahs, toArabicDigits } from "@/lib/quran";

export default async function HomePage() {
  const surahs = await getSurahs();

  return (
    <main dir="rtl" className="mx-auto max-w-5xl p-6">
      <h1 className="mb-6 text-3xl font-bold">القرآن الكريم</h1>
      <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {surahs.map((s) => (
          <li key={s.id}>
            <Link
              href={`/surah/${s.id}`}
              className="flex items-center gap-4 rounded-lg border border-neutral-700 p-4 hover:border-emerald-500">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-neutral-800 text-sm">
                {toArabicDigits(s.id)}
              </span>
              <div className="flex-1">
                <p className="text-lg font-semibold">{s.name_ar}</p>
                <p className="text-sm text-neutral-400">
                  {s.revelation_place === "makkah" ? "مكية" : "مدنية"} ·{" "}
                  {toArabicDigits(s.ayah_count)} آية
                </p>
              </div>
              <span dir="ltr" className="text-sm text-neutral-500">
                {s.name_en}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </main>
  );
}
