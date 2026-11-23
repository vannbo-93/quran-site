/** @format */

import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { quranFont } from "@/lib/fonts";
import {
  displayText,
  getBasmala,
  getSurahWithAyahs,
  toArabicDigits,
} from "@/lib/quran";

// Pre-render all 114 surahs at build time
export function generateStaticParams() {
  return Array.from({ length: 114 }, (_, i) => ({ id: String(i + 1) }));
}

type Params = Promise<{ id: string }>;

// Shell renders instantly; surah content streams in
export default function SurahPage({ params }: { params: Params }) {
  return (
    <main className="mx-auto max-w-3xl px-6 py-10">
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

  const [result, basmala] = await Promise.all([
    getSurahWithAyahs(surahId),
    getBasmala(),
  ]);
  if (!result) notFound();
  const { surah, ayahs } = result;

  return (
    <>
      <nav className="mb-8 flex justify-between text-sm text-white/50">
        {surahId > 1 ? (
          <Link href={`/surah/${surahId - 1}`} className="hover:text-accent">
            → السورة السابقة
          </Link>
        ) : (
          <span />
        )}
        <Link href="/" className="hover:text-accent">
          الفهرس
        </Link>
        {surahId < 114 ? (
          <Link href={`/surah/${surahId + 1}`} className="hover:text-accent">
            السورة التالية ←
          </Link>
        ) : (
          <span />
        )}
      </nav>

      <header className="mb-10 text-center">
        <h1 className="font-arabic text-3xl font-medium">
          سورة {surah.name_ar}
        </h1>
        <p className="mt-2 font-arabic text-sm text-white/50">
          {surah.revelation_place === "makkah" ? "مكية" : "مدنية"} ·{" "}
          {toArabicDigits(surah.ayah_count)} آية
        </p>
      </header>

      <div className={quranFont.className}>
        {surahId !== 1 && surahId !== 9 && (
          <p className="mb-10 text-center text-3xl">{basmala}</p>
        )}
        <p className="text-justify text-3xl leading-[2.4]">
          {ayahs.map((a) => (
            <span key={a.id}>
              {displayText(surahId, a, basmala)}{" "}
              <span className="text-white/40">
                ﴿{toArabicDigits(a.ayah_number)}﴾
              </span>{" "}
            </span>
          ))}
        </p>
      </div>
    </>
  );
}

// Placeholder shown while the surah loads
function SurahSkeleton() {
  return (
    <div className="animate-pulse">
      <div className="mx-auto mb-10 h-8 w-40 rounded bg-white/10" />
      <div className="space-y-6">
        {Array.from({ length: 6 }, (_, i) => (
          <div key={i} className="h-6 rounded bg-white/5" />
        ))}
      </div>
    </div>
  );
}
