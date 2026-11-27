import type { Metadata } from "next";
import Link from "next/link";
import { getSurahs } from "@/lib/quran";
import { surahMeaning } from "@/lib/surahMeanings";
import { SearchBox } from "@/components/SearchBox";
import { ContinueReading } from "@/components/ContinueReading";
import { SurahPicker } from "@/components/SurahPicker";
import { SITE_DESCRIPTION, SITE_NAME, SITE_URL } from "@/lib/site";

export const metadata: Metadata = {
  // Longer than the H1 on purpose: search results show this line
  title: { absolute: "القرآن الكريم — اقرأ واستمع مع الترجمة والتفسير وألوان التجويد" },
  description: SITE_DESCRIPTION,
  alternates: { canonical: "/" },
};

// Tells search engines what the site is, and that it has a search page
const jsonLd = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  name: SITE_NAME,
  alternateName: "The Noble Quran",
  url: SITE_URL,
  inLanguage: ["ar", "en"],
  description: SITE_DESCRIPTION,
  potentialAction: {
    "@type": "SearchAction",
    target: { "@type": "EntryPoint", urlTemplate: `${SITE_URL}/search?q={search_term_string}` },
    "query-input": "required name=search_term_string",
  },
};

export default async function HomePage() {
  const surahs = await getSurahs();

  return (
    <main className="mx-auto max-w-7xl px-4 sm:px-6">
      <script
        type="application/ld+json"
        // "<" escaped so the JSON can never close the script tag
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }}
      />
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
            {/* Styles live in globals.css (.surah-card): 114 cards, so short markup keeps the page light */}
            <Link href={`/surah/${s.id}`} className="surah-card glass">
              <span className="surah-num">{s.id}</span>
              <span className="surah-names">
                <span className="surah-en">{s.name_en}</span>
                <span className="surah-meaning">{surahMeaning(s.id)}</span>
              </span>
              <span className="surah-ar">
                <span dir="rtl" className="surah-ar-name">
                  {s.name_ar}
                </span>
                <span className="surah-count">{s.ayah_count} Ayahs</span>
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </main>
  );
}
