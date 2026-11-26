/** @format */

import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Reader } from "@/components/reader/Reader";
import {
  displayText,
  getBasmala,
  getSurahs,
  getSurahWithAyahs,
  toArabicDigits,
  type Surah,
} from "@/lib/quran";

// Pre-render all 114 surahs at build time
export function generateStaticParams() {
  return Array.from({ length: 114 }, (_, i) => ({ id: String(i + 1) }));
}

type Params = Promise<{ id: string }>;

// Shell renders instantly; surah content streams in
export default function SurahPage({ params }: { params: Params }) {
  return (
    <main className="mx-auto max-w-7xl px-4 pt-10 pb-48 sm:px-6">
      <Suspense fallback={<SurahSkeleton />}>
        <SurahContent params={params} />
      </Suspense>
    </main>
  );
}

async function SurahContent({ params }: { params: Params }) {
  const { id } = await params;
  const surahId = Number(id);
  if (!Number.isInteger(surahId) || surahId < 1 || surahId > 114) notFound();

  const [result, basmala, allSurahs] = await Promise.all([
    getSurahWithAyahs(surahId),
    getBasmala(),
    getSurahs(),
  ]);
  if (!result) notFound();
  const { surah, ayahs } = result;

  const prev = allSurahs[surahId - 2];
  const next = allSurahs[surahId];
  const showBasmala = surahId !== 1 && surahId !== 9;

  return (
    <>
      <Link
        href="/"
        className="text-sm text-white/40 transition hover:text-accent">
        → فهرس السور
      </Link>

      {/* Surah header */}
      <header className="group mt-8 mb-14 text-center">
        <div
          dir="ltr"
          className="flex items-center justify-center gap-3 text-xs uppercase tracking-widest text-white/40">
          <span className="tabular-nums">
            {String(surah.id).padStart(3, "0")}
          </span>
          <span aria-hidden>·</span>
          <span>
            {surah.revelation_place === "makkah" ? "Meccan" : "Medinan"}
          </span>
          <span aria-hidden>·</span>
          <span>{surah.ayah_count} Ayahs</span>
        </div>
        <h1 className="glow-text mt-4 font-quran text-6xl leading-[1.6] md:text-7xl">
          سورة {surah.name_ar}
        </h1>
        <p
          dir="ltr"
          className="mt-1 text-3xl font-medium tracking-tight md:text-4xl">
          <span className="font-serif font-normal italic text-white/50">
            Surah
          </span>{" "}
          {surah.name_en}
        </p>
      </header>

      <Reader>
        {showBasmala && (
          <div className="group mb-10 text-center">
            <p className="basmala glow-text font-quran">{basmala}</p>
          </div>
        )}

        <div
          className="quran-text font-quran"
          data-surah={surahId}
          data-surah-name={surah.name_ar}>
          {ayahs.map((a) => (
            <span
              key={a.id}
              id={`ayah-${a.ayah_number}`}
              data-ayah={a.ayah_number}
              role="button"
              tabIndex={0}
              aria-label={`تشغيل الآية ${a.ayah_number}`}
              className="ayah glass">
              <span className="ayah-body">
                <span className="ayah-text">
                  {displayText(surahId, a, basmala)}
                </span>
                {a.translation && (
                  <span dir="ltr" lang="en" className="ayah-translation">
                    {a.translation}
                  </span>
                )}
                {a.tafsir && (
                  <span className="ayah-tafsir">
                    <span className="ayah-tafsir-label">التفسير الميسر</span>
                    {a.tafsir}
                  </span>
                )}
              </span>
              <span className="ayah-num">{toArabicDigits(a.ayah_number)}</span>
              <button
                type="button"
                data-share
                className="ayah-share"
                aria-label={`مشاركة الآية ${a.ayah_number}`}
                title="مشاركة الآية">
                <svg
                  viewBox="0 0 24 24"
                  className="h-4 w-4"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden>
                  <circle cx="18" cy="5" r="3" />
                  <circle cx="6" cy="12" r="3" />
                  <circle cx="18" cy="19" r="3" />
                  <path d="m8.6 13.5 6.8 4M15.4 6.5l-6.8 4" />
                </svg>
              </button>
            </span>
          ))}
        </div>
      </Reader>

      {/* Previous / next */}
      <nav className="mt-20 grid grid-cols-2 gap-4">
        {prev ? <NavCard surah={prev} label="السورة السابقة" /> : <span />}
        {next ? <NavCard surah={next} label="السورة التالية" end /> : <span />}
      </nav>
    </>
  );
}

function NavCard({
  surah,
  label,
  end = false,
}: {
  surah: Surah;
  label: string;
  end?: boolean;
}) {
  return (
    <Link
      href={`/surah/${surah.id}`}
      className={`glass group block rounded-2xl p-5 transition duration-300 hover:-translate-y-1 ${end ? "text-left" : ""}`}>
      <p className="text-xs text-white/40">{label}</p>
      <p className="mt-2 font-arabic text-xl transition group-hover:text-accent">
        {surah.name_ar}
      </p>
      <p
        dir="ltr"
        className={`text-sm text-white/40 ${end ? "" : "text-right"}`}>
        {surah.name_en}
      </p>
    </Link>
  );
}

// Placeholder shown while the surah loads
function SurahSkeleton() {
  return (
    <div className="animate-pulse">
      <div className="mx-auto mt-16 mb-4 h-3 w-48 rounded bg-white/10" />
      <div className="mx-auto mb-3 h-14 w-64 rounded bg-white/10" />
      <div className="mx-auto mb-16 h-8 w-52 rounded bg-white/5" />
      <div className="space-y-6">
        {Array.from({ length: 6 }, (_, i) => (
          <div key={i} className="h-7 rounded bg-white/5" />
        ))}
      </div>
    </div>
  );
}
