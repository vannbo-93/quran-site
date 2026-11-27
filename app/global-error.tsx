"use client";

import "./globals.css";

// Last resort: the root layout itself failed, so this page brings its own <html> and <body>
// (no navbar, no site fonts). Kept deliberately simple.
export default function GlobalError({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  return (
    <html lang="ar" dir="rtl">
      <body className="grid min-h-screen place-items-center bg-black px-4 text-center text-white">
        <main>
          <h1 className="text-2xl font-medium">تعذّر تحميل الموقع</h1>
          <p className="mt-3 text-sm text-white/50">حدث خطأ غير متوقع. أعد المحاولة بعد قليل.</p>
          <button
            type="button"
            onClick={retry} // reloads the data from the server, then renders again
            className="mt-6 rounded-full bg-white px-6 py-2.5 text-sm font-medium text-black"
          >
            إعادة المحاولة
          </button>
          {error.digest && (
            <p dir="ltr" className="mt-8 font-mono text-[11px] text-white/25">
              ref: {error.digest}
            </p>
          )}
        </main>
      </body>
    </html>
  );
}
