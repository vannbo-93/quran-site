"use client";

import { useEffect } from "react";
import Link from "next/link";

// Shown when a page fails to load (database or network error, a bug…).
// The navbar and footer stay: only the page area is replaced.
export default function ErrorPage({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  useEffect(() => {
    console.error(error); // visible in the browser console and in Vercel's logs
  }, [error]);

  return (
    <main className="mx-auto flex min-h-[70vh] max-w-2xl flex-col items-center justify-center px-4 py-16 text-center sm:px-6">
      <span
        aria-hidden
        className="grid h-16 w-16 place-items-center rounded-full border border-white/15 bg-white/5 text-white/60"
      >
        <svg viewBox="0 0 24 24" className="h-7 w-7" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <path d="M12 8v5M12 16.5v.01" />
          <circle cx="12" cy="12" r="9" />
        </svg>
      </span>

      <h1 className="mt-6 font-arabic text-2xl font-medium md:text-3xl">تعذّر تحميل هذه الصفحة</h1>
      <p dir="ltr" className="mt-1 font-serif text-lg italic text-white/50">
        Something went wrong
      </p>
      <p className="mt-4 max-w-md font-arabic text-sm leading-relaxed text-white/50">
        حدث خطأ مؤقت، غالبًا بسبب الاتصال. أعد المحاولة، وإذا تكرر الخطأ فارجع بعد قليل.
      </p>

      <div className="mt-8 flex flex-wrap justify-center gap-3 font-arabic text-sm">
        <button
          type="button"
          onClick={retry} // reloads the data from the server, then renders again
          className="rounded-full bg-white px-6 py-2.5 font-medium text-black transition hover:bg-accent"
        >
          إعادة المحاولة
        </button>
        <Link href="/" className="glass rounded-full px-6 py-2.5 transition hover:text-accent">
          فهرس السور
        </Link>
      </div>

      {/* Reference to find this error in Vercel's logs */}
      {error.digest && (
        <p dir="ltr" className="mt-8 font-mono text-[11px] text-white/25">
          ref: {error.digest}
        </p>
      )}
    </main>
  );
}
