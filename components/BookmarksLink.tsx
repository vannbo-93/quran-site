"use client";

import Link from "next/link";
import { BookmarkIcon } from "@/components/BookmarkIcon";
import { useBookmarks } from "@/lib/bookmarks";

// Navbar button to the saved ayahs and surahs, with a count badge
export function BookmarksLink() {
  const { ayahs, surahs } = useBookmarks();
  const count = ayahs.length + surahs.length;

  return (
    <Link
      href="/bookmarks"
      aria-label={count ? `المحفوظات (${count})` : "المحفوظات"}
      title="المحفوظات"
      className="relative grid h-9 w-9 place-items-center rounded-md border border-white/15 bg-white/10 transition hover:bg-white/20 hover:text-accent"
    >
      <BookmarkIcon className="h-4 w-4" />
      {count > 0 && (
        <span className="absolute -top-1.5 -right-1.5 grid h-4 min-w-4 place-items-center rounded-full bg-accent px-1 text-[10px] leading-none font-semibold text-black tabular-nums">
          {count > 99 ? "99+" : count}
        </span>
      )}
    </Link>
  );
}
