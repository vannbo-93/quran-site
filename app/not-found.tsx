import type { Metadata } from "next";
import Link from "next/link";
import { SearchBox } from "@/components/SearchBox";

export const metadata: Metadata = {
  title: "الصفحة غير موجودة",
  robots: { index: false },
};

// Shown for any unknown address (and /surah/200, via notFound())
export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-[70vh] max-w-2xl flex-col items-center justify-center px-4 py-16 text-center sm:px-6">
      <div className="group relative cursor-default px-6">
        <div
          aria-hidden
          className="absolute -inset-8 rounded-full bg-accent/0 blur-3xl transition duration-700 group-hover:bg-accent/25"
        />
        <p aria-hidden className="glow-text relative font-quran text-8xl leading-[1.4] md:text-9xl">
          404
        </p>
      </div>

      <h1 className="mt-4 font-arabic text-2xl font-medium md:text-3xl">هذه الصفحة غير موجودة</h1>
      <p dir="ltr" className="mt-1 font-serif text-lg italic text-white/50">
        Page not found
      </p>
      <p className="mt-4 max-w-md font-arabic text-sm leading-relaxed text-white/50">
        ربما كُتب الرابط بشكل خاطئ، أو نُقلت الصفحة. ابحث عن آية أو كلمة، أو عُد إلى فهرس السور.
      </p>

      <div className="mt-8 w-full">
        <SearchBox />
      </div>

      <nav aria-label="روابط مفيدة" className="mt-6 flex flex-wrap justify-center gap-3 font-arabic text-sm">
        <Link href="/" className="glass rounded-full px-5 py-2 transition hover:text-accent">
          فهرس السور
        </Link>
        <Link href="/juz" className="glass rounded-full px-5 py-2 transition hover:text-accent">
          الأجزاء
        </Link>
        <Link href="/bookmarks" className="glass rounded-full px-5 py-2 transition hover:text-accent">
          المحفوظات
        </Link>
      </nav>
    </main>
  );
}
