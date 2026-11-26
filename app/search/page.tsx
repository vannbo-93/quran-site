/** @format */

import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { SearchBox } from "@/components/SearchBox";
import { displayText, getBasmala } from "@/lib/quran";
import { searchAyahs } from "@/lib/search";

export const metadata: Metadata = { title: "البحث في القرآن" };

type SearchParams = Promise<{ q?: string | string[] }>;

export default function SearchPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  return (
    <main className="mx-auto max-w-3xl px-4 pt-10 pb-24 sm:px-6">
      <h1 className="mb-8 text-center font-arabic text-3xl font-medium">
        البحث في القرآن
      </h1>
      <Suspense fallback={<SearchSkeleton />}>
        <SearchResults searchParams={searchParams} />
      </Suspense>
    </main>
  );
}

async function SearchResults({ searchParams }: { searchParams: SearchParams }) {
  const { q } = await searchParams;
  const query = (Array.isArray(q) ? q[0] : (q ?? "")).trim().slice(0, 100);

  if (query.length < 2) {
    return (
      <>
        <SearchBox defaultValue={query} autoFocus />
        <p className="mt-6 text-center font-arabic text-sm leading-relaxed text-white/40">
          اكتب كلمة أو جزءًا من آية، بالتشكيل أو بدونه.
          <br />
          ويمكنك البحث في الترجمة الإنجليزية أيضًا، مثل: mercy
        </p>
      </>
    );
  }

  const [{ results, total }, basmala] = await Promise.all([
    searchAyahs(query),
    getBasmala(),
  ]);
  const english = /[A-Za-z]/.test(query);

  return (
    <>
      <SearchBox defaultValue={query} />

      <p className="mt-8 mb-4 font-arabic text-sm text-white/50" role="status">
        {total === 0
          ? `لا توجد نتائج لـ «${query}»`
          : total > results.length
            ? `${resultsLabel(total)}، تُعرض أول ${results.length}`
            : resultsLabel(total)}
      </p>

      <ul className="space-y-3">
        {results.map((r) => (
          <li key={r.id}>
            <Link
              href={`/surah/${r.surah_id}#ayah-${r.ayah_number}`}
              className="glass group block rounded-2xl p-5 transition duration-300 hover:-translate-y-0.5 hover:shadow-[0_0_40px_rgba(56,189,248,0.18)]">
              <p className="font-arabic text-xs text-white/40 transition group-hover:text-accent">
                سورة {r.surah_name} · الآية {r.ayah_number}
              </p>
              <p className="mt-2 font-quran text-2xl leading-[2.1]">
                {displayText(r.surah_id, r, basmala)}
              </p>
              {english && r.translation && (
                <p
                  dir="ltr"
                  lang="en"
                  className="mt-2 text-sm leading-relaxed text-white/50">
                  {r.translation}
                </p>
              )}
            </Link>
          </li>
        ))}
      </ul>
    </>
  );
}

// Arabic plural: 1 نتيجة واحدة · 2 نتيجتان · 3–10 نتائج · 11+ نتيجة
function resultsLabel(n: number) {
  if (n === 1) return "نتيجة واحدة";
  if (n === 2) return "نتيجتان";
  if (n <= 10) return `${n} نتائج`;
  return `${n} نتيجة`;
}

function SearchSkeleton() {
  return (
    <div className="animate-pulse space-y-3">
      <div className="mx-auto h-14 max-w-xl rounded-full bg-white/10" />
      {Array.from({ length: 4 }, (_, i) => (
        <div key={i} className="h-28 rounded-2xl bg-white/5" />
      ))}
    </div>
  );
}
