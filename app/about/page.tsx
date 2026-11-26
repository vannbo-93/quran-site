/** @format */

import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "عن الموقع والمصادر — القرآن الكريم",
};

const SOURCES = [
  {
    title: "نص القرآن الكريم",
    detail: "الرسم العثماني، رواية حفص عن عاصم. منقول كما هو دون أي تعديل.",
    source: "Tanzil Project",
    href: "https://tanzil.net",
    license: "CC BY 3.0",
  },
  {
    title: "الترجمة الإنجليزية",
    detail: "Saheeh International.",
    source: "Tanzil Project",
    href: "https://tanzil.net/trans/",
    license: "للاستخدام غير التجاري",
  },
  {
    title: "التفسير الميسر",
    detail: "مجمع الملك فهد لطباعة المصحف الشريف. منقول كما هو دون أي تعديل.",
    source: "QuranEnc.com",
    href: "https://quranenc.com/ar/browse/arabic_moyassar",
    license: "وفق شروط QuranEnc",
  },
  {
    title: "التلاوات (آية بآية)",
    detail: "تلاوات القرّاء بملف لكل آية.",
    source: "EveryAyah.com",
    href: "https://everyayah.com",
    license: "",
  },
  {
    title: "التلاوات (سورة كاملة) وتوقيت الآيات",
    detail: "تلاوات السور وتوقيت بداية ونهاية كل آية.",
    source: "MP3Quran.net",
    href: "https://mp3quran.net",
    license: "",
  },
];

export default function AboutPage() {
  return (
    <main className="mx-auto max-w-3xl px-4 pt-12 pb-20 sm:px-6">
      <h1 className="font-arabic text-3xl font-medium">عن الموقع</h1>
      <p className="mt-4 font-arabic leading-loose text-white/70">
        موقع لقراءة القرآن الكريم والاستماع إليه، مع الترجمة الإنجليزية والتفسير
        الميسر. الموقع مجاني وغير تجاري، بلا إعلانات ولا اشتراكات.
      </p>

      <h2 className="mt-12 mb-4 font-arabic text-xl font-medium">
        المصادر والتراخيص
      </h2>
      <ul className="space-y-3">
        {SOURCES.map((s) => (
          <li key={s.title} className="glass rounded-2xl p-5">
            <p className="font-arabic text-lg">{s.title}</p>
            <p className="mt-1 font-arabic text-sm leading-relaxed text-white/60">
              {s.detail}
            </p>
            <p className="mt-3 flex flex-wrap items-center gap-2 text-sm">
              <a
                href={s.href}
                target="_blank"
                rel="noopener noreferrer"
                dir="ltr"
                className="text-white/80 underline decoration-white/20 underline-offset-4 transition hover:text-accent hover:decoration-accent">
                {s.source}
              </a>
              {s.license && (
                <span className="rounded-full border border-white/15 px-2 py-0.5 font-arabic text-xs text-white/50">
                  {s.license}
                </span>
              )}
            </p>
          </li>
        ))}
      </ul>
    </main>
  );
}
