"use client";

import { useState } from "react";
import { BookmarkIcon } from "@/components/BookmarkIcon";
import { isSurahSaved, toggleSurah, useBookmarks } from "@/lib/bookmarks";

// Bookmark button next to the surah title
export function SurahBookmarkButton({ surah, name, nameEn }: { surah: number; name: string; nameEn: string }) {
  const saved = isSurahSaved(useBookmarks(), surah);
  const [message, setMessage] = useState<string | null>(null);

  function onClick() {
    const now = toggleSurah({ surah, name, nameEn });
    setMessage(now ? "حُفظت السورة" : "أُزيلت من المحفوظات");
    window.setTimeout(() => setMessage(null), 2000);
  }

  return (
    <span className="relative inline-flex">
      <button
        type="button"
        onClick={onClick}
        aria-pressed={saved}
        aria-label={saved ? `إزالة سورة ${name} من المحفوظات` : `حفظ سورة ${name}`}
        title={saved ? "إزالة من المحفوظات" : "حفظ السورة"}
        className={`grid h-10 w-10 place-items-center rounded-full border transition hover:border-accent/60 hover:text-accent ${
          saved ? "border-accent/50 text-accent" : "border-white/15 text-white/50"
        }`}
      >
        <BookmarkIcon filled={saved} className="h-[1.1rem] w-[1.1rem]" />
      </button>
      {message && (
        <span
          role="status"
          className="absolute start-full top-1/2 ms-3 -translate-y-1/2 rounded-full border border-white/15 bg-black px-3 py-1 font-arabic text-xs whitespace-nowrap text-white/80"
        >
          {message}
        </span>
      )}
    </span>
  );
}
