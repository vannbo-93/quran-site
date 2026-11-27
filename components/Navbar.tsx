import Link from "next/link";
import { SearchIcon } from "@/components/SearchBox";
import { MenuButton } from "@/components/MenuButton";
import { ThemeToggle } from "@/components/ThemeToggle";
import { BookmarksLink } from "@/components/BookmarksLink";

export function Navbar() {
  return (
    <header dir="ltr" className="sticky top-0 z-50 border-b border-white/10 bg-black/40 backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 text-xs sm:px-6">
        <Link href="/" className="group flex items-center gap-3">
          <span className="grid h-10 w-10 place-items-center rounded-xl border border-white/20 bg-white/5 font-serif text-3xl italic text-white transition duration-300 group-hover:border-accent/60 group-hover:text-accent group-hover:shadow-[0_0_24px_rgba(56,189,248,0.45)]">
            Q
          </span>
          <span className="text-lg font-medium tracking-[0.2em] sm:text-xl sm:tracking-[0.25em]">QURAN</span>
        </Link>

        <div className="hidden gap-20 leading-relaxed text-white/50 md:flex">
          <p>114 Surahs<br />6236 Ayahs</p>
          <p>Hafs ʿan ʿĀṣim<br />Uthmani Script</p>
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2">
          <Link
            href="/search"
            aria-label="البحث في القرآن"
            className="grid h-9 w-9 place-items-center rounded-md border border-white/15 bg-white/10 transition hover:bg-white/20 hover:text-accent"
          >
            <SearchIcon className="h-4 w-4" />
            <span className="sr-only">البحث</span>
          </Link>
          <BookmarksLink />
          <ThemeToggle />
          <MenuButton />
        </div>
      </div>
    </header>
  );
}
