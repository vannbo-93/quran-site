/** @format */

import Link from "next/link";
import { getSurahs } from "@/lib/quran";

export default async function HomePage() {
  const surahs = await getSurahs();

  return (
    <main className="mx-auto max-w-7xl px-4 sm:px-6">
      {/* Title: no frame, accent glow only on hover */}
      <section className="flex justify-center pt-12 pb-10">
        <div className="group relative cursor-default px-6 text-center">
          <div
            aria-hidden
            className="absolute -inset-6 rounded-full bg-accent/0 blur-3xl transition duration-700 group-hover:bg-accent/30"
          />
          <h1 className="glow-text relative font-quran text-5xl leading-[1.7] transition duration-500 md:text-6xl">
            القرآن الكريم
          </h1>
          <p
            dir="ltr"
            className="relative font-serif text-xl italic text-white/60 transition duration-500 group-hover:text-white/80">
            The Noble Quran
          </p>
        </div>
      </section>

      {/* Section header */}
      <div
        dir="ltr"
        className="mb-8 flex items-end justify-between border-b border-white/10 pb-4">
        <h2 className="text-4xl font-medium tracking-tight md:text-5xl">
          Surahs{" "}
        </h2>
        <span className="text-sm text-white/40">114</span>
      </div>

      {/* Surah grid: 1 / 2 / 4 per row */}
      <ul className="grid grid-cols-1 gap-4 pb-20 sm:grid-cols-2 lg:grid-cols-4">
        {surahs.map((s) => (
          <li key={s.id}>
            <Link
              href={`/surah/${s.id}`}
              className="glass group block overflow-hidden rounded-2xl p-5 transition duration-300 hover:-translate-y-1 hover:shadow-[0_0_40px_rgba(56,189,248,0.25)]">
              {/* glow that appears on hover */}
              <span
                aria-hidden
                className="pointer-events-none absolute -top-16 -left-16 h-36 w-36 rounded-full bg-accent/0 blur-2xl transition duration-500 group-hover:bg-accent/40"
              />

              <div
                dir="ltr"
                className="relative flex items-center justify-between text-xs text-white/40">
                <span className="tabular-nums">
                  {String(s.id).padStart(3, "0")}
                </span>
                <span className="uppercase tracking-widest">
                  {s.revelation_place === "makkah" ? "Meccan" : "Medinan"}
                </span>
              </div>

              <p
                dir="ltr"
                className="relative mt-6 text-2xl font-medium tracking-tight transition group-hover:text-accent">
                {s.name_en}
              </p>

              <div className="relative mt-2 flex items-baseline justify-between">
                <p className="font-arabic text-xl text-white/80">{s.name_ar}</p>
                <p className="font-arabic text-xs text-white/40">
                  {s.ayah_count} آية
                </p>
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </main>
  );
}
