"use client";

import Link from "next/link";
import { BookmarkIcon } from "@/components/BookmarkIcon";
import { removeAyah, removeSurah, useBookmarks } from "@/lib/bookmarks";

const arabic = (n: number) => n.toLocaleString("ar-EG");

function RemoveButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title="إزالة"
      className="relative grid h-8 w-8 shrink-0 place-items-center rounded-full text-white/30 transition hover:bg-white/5 hover:text-accent"
    >
      <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
        <path d="M6 6l12 12M18 6 6 18" />
      </svg>
    </button>
  );
}

export function BookmarksList() {
  const { ayahs, surahs } = useBookmarks();

  if (ayahs.length === 0 && surahs.length === 0) {
    return (
      <div className="glass mt-10 rounded-2xl p-8 text-center font-arabic">
        <span className="mx-auto grid h-12 w-12 place-items-center rounded-full border border-white/15 text-white/40">
          <BookmarkIcon className="h-5 w-5" />
        </span>
        <p className="mt-4 text-white/70">لا توجد محفوظات بعد</p>
        <p className="mt-2 text-sm leading-relaxed text-white/40">
          اضغط على أيقونة الحفظ بجانب عنوان السورة لحفظها، أو بجانب أي آية لحفظ الآية.
        </p>
        <Link href="/" className="mt-6 inline-block text-sm text-accent underline-offset-4 hover:underline">
          فهرس السور
        </Link>
      </div>
    );
  }

  return (
    <div className="mt-10 space-y-12">
      {surahs.length > 0 && (
        <section>
          <h2 className="mb-4 font-arabic text-xl">
            السور <span className="text-sm text-white/40">({arabic(surahs.length)})</span>
          </h2>
          <ul className="grid gap-3 sm:grid-cols-2">
            {surahs.map((s) => (
              <li key={s.surah} className="glass group flex items-center gap-3 rounded-xl p-2 ps-4">
                <Link href={`/surah/${s.surah}`} className="relative flex min-w-0 flex-1 items-center gap-3 py-1.5">
                  <span className="w-8 shrink-0 text-center text-sm text-white/40 tabular-nums">{s.surah}</span>
                  <span className="min-w-0 flex-1">
                    <span className="block font-arabic text-lg transition group-hover:text-accent">سورة {s.name}</span>
                    <span dir="ltr" className="block truncate text-start text-xs text-white/40">
                      {s.nameEn}
                    </span>
                  </span>
                </Link>
                <RemoveButton label={`إزالة سورة ${s.name}`} onClick={() => removeSurah(s.surah)} />
              </li>
            ))}
          </ul>
        </section>
      )}

      {ayahs.length > 0 && (
        <section>
          <h2 className="mb-4 font-arabic text-xl">
            الآيات <span className="text-sm text-white/40">({arabic(ayahs.length)})</span>
          </h2>
          <ul className="space-y-3">
            {ayahs.map((a) => (
              <li key={`${a.surah}:${a.ayah}`} className="glass group flex items-start gap-3 rounded-xl p-2 ps-5">
                <Link href={`/surah/${a.surah}#ayah-${a.ayah}`} className="relative min-w-0 flex-1 py-3">
                  <p className="line-clamp-2 font-quran text-2xl leading-[2.2]">{a.text}</p>
                  <p className="mt-1 font-arabic text-xs text-white/40 transition group-hover:text-accent">
                    سورة {a.surahName} · الآية {arabic(a.ayah)}
                  </p>
                </Link>
                <RemoveButton
                  label={`إزالة الآية ${a.ayah} من سورة ${a.surahName}`}
                  onClick={() => removeAyah(a.surah, a.ayah)}
                />
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
