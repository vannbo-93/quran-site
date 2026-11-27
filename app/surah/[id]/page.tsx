/** @format */

import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Reader } from "@/components/reader/Reader";
import { TajweedText } from "@/components/TajweedText";
import { BookmarkIcon } from "@/components/BookmarkIcon";
import { SurahBookmarkButton } from "@/components/SurahBookmarkButton";
import {
  displayText,
  getBasmala,
  getSurahs,
  getSurahWithAyahs,
  toArabicDigits,
  type Ayah,
  type Surah,
} from "@/lib/quran";
import { SITE_NAME } from "@/lib/site";

// Pre-render all 114 surahs at build time
export function generateStaticParams() {
  return Array.from({ length: 114 }, (_, i) => ({ id: String(i + 1) }));
}

type Params = Promise<{ id: string }>;

// Title, description and share image for each surah
export async function generateMetadata({
  params,
}: {
  params: Params;
}): Promise<Metadata> {
  const { id } = await params;
  const surahId = Number(id);
  const surah = (await getSurahs()).find((s) => s.id === surahId);
  if (!surah) return {};

  const title = `سورة ${surah.name_ar} — ${surah.name_en}`;
  const description = `اقرأ سورة ${surah.name_ar} (${surah.ayah_count} آية، ${
    surah.revelation_place === "makkah" ? "مكية" : "مدنية"
  }) واستمع إليها، مع الترجمة الإنجليزية والتفسير الميسر وألوان التجويد.`;
  const image = {
    url: `/og/surah-${surah.id}.jpg?v=2`,
    width: 1200,
    height: 630,
    alt: `سورة ${surah.name_ar}`,
  };

  return {
    title,
    description,
    alternates: { canonical: `/surah/${surah.id}` },
    // openGraph is replaced, not merged, so the site-wide fields are repeated here
    openGraph: {
      type: "website",
      siteName: SITE_NAME,
      locale: "ar_AR",
      title,
      description,
      url: `/surah/${surah.id}`,
      images: [image],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [image.url],
    },
  };
}

const playLabel = (n: number) => "تشغيل الآية " + n;

// Shell renders instantly; surah content streams in
export default function SurahPage({ params }: { params: Params }) {
  return (
    <main className="mx-auto max-w-7xl px-4 pt-10 pb-16 sm:px-6">
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
        <div className="mt-5 flex justify-center">
          <SurahBookmarkButton
            surah={surah.id}
            name={surah.name_ar}
            nameEn={surah.name_en}
          />
        </div>
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
              aria-label={playLabel(a.ayah_number)}
              className="ayah glass">
              <span className="ayah-body">
                <span className="ayah-text">
                  <AyahText surahId={surahId} ayah={a} basmala={basmala} />
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
              <span className="ayah-num">
                {toArabicDigits(a.ayah_number)}
                {/* Mushaf mode: small save button above the ayah number */}
                <button
                  type="button"
                  data-bookmark
                  className="ayah-bookmark-mushaf"
                  aria-label={`حفظ الآية ${a.ayah_number}`}
                  title="حفظ الآية">
                  <BookmarkIcon className="h-3 w-3" />
                </button>
              </span>
              {/* Cards mode: save + share, side by side */}
              <span className="ayah-actions">
                <button
                  type="button"
                  data-bookmark
                  className="ayah-bookmark"
                  aria-label={`حفظ الآية ${a.ayah_number}`}
                  title="حفظ الآية">
                  <BookmarkIcon />
                </button>
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

// Displayed text (basmala removed from ayah 1) with its tajweed spans
function AyahText({
  surahId,
  ayah,
  basmala,
}: {
  surahId: number;
  ayah: Ayah;
  basmala: string;
}) {
  const shown = displayText(surahId, ayah, basmala);
  const shift = Array.from(ayah.text_uthmani).length - Array.from(shown).length;
  return <TajweedText text={shown} annotations={ayah.tajweed} shift={shift} />;
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
