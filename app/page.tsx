import Link from "next/link";
import { getSurahs } from "@/lib/quran";
import { surahMeaning } from "@/lib/surahMeanings";
import { SearchBox } from "@/components/SearchBox";
import { ContinueReading } from "@/components/ContinueReading";
import { SurahPicker } from "@/components/SurahPicker";

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
          <p dir="ltr" className="relative font-serif text-xl italic text-white/60 transition duration-500 group-hover:text-white/80">
            The Noble Quran
          </p>
        </div>
      </section>

      {/* Continue reading (only for returning visitors) + search */}
      <ContinueReading />
      <div className="mb-14">
        <SearchBox />
      </div>

      {/* Section header */}
      <div dir="ltr" className="mb-8 flex items-end justify-between border-b border-white/10 pb-4">
        <h2 className="text-4xl font-medium tracking-tight md:text-5xl">Surahs</h2>
        <SurahPicker surahs={surahs.map(({ id, name_ar, name_en }) => ({ id, name_ar, name_en }))} />
      </div>

      {/* Surah grid: 1 / 2 / 3 per row */}
      <ul dir="ltr" className="grid grid-cols-1 gap-3 pb-20 sm:grid-cols-2 lg:grid-cols-3">
        {surahs.map((s) => (
          <li key={s.id}>
            <Link
              href={`/surah/${s.id}`}
              className="glass group flex items-center gap-4 overflow-hidden rounded-xl px-4 py-3.5 transition duration-300 hover:-translate-y-1 hover:shadow-[0_0_40px_rgba(56,189,248,0.25)]"
            >
              {/* glow that appears on hover */}
              <span
                aria-hidden
                className="pointer-events-none absolute -top-16 -left-16 h-36 w-36 rounded-full bg-accent/0 blur-2xl transition duration-500 group-hover:bg-accent/40"
              />

              {/* Number in a diamond */}
              <span className="relative grid h-12 w-12 shrink-0 place-items-center">
                <span
                  aria-hidden
                  className="absolute inset-1.5 rotate-45 rounded-lg border border-white/10 bg-white/10 transition duration-300 group-hover:border-accent/50 group-hover:bg-accent/15"
                />
                <span className="relative text-sm font-semibold tabular-nums transition group-hover:text-accent">
                  {s.id}
                </span>
              </span>

              {/* English name + meaning */}
              <span className="relative min-w-0 flex-1">
                <span className="block truncate font-semibold transition group-hover:text-accent">{s.name_en}</span>
                <span className="block truncate text-xs text-white/40">{surahMeaning(s.id)}</span>
              </span>

              {/* Arabic name + ayah count */}
              <span className="relative shrink-0 text-right">
                <span dir="rtl" className="block font-arabic text-lg leading-tight text-white/90">
                  {s.name_ar}
                </span>
                <span className="block text-xs text-white/40">{s.ayah_count} Ayahs</span>
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </main>
  );
}
