/** @format */

import Form from "next/form";

// Plain GET form to /search: works even before JavaScript loads
export function SearchBox({
  defaultValue = "",
  autoFocus = false,
}: {
  defaultValue?: string;
  autoFocus?: boolean;
}) {
  return (
    <Form
      action="/search"
      role="search"
      className="glass mx-auto flex w-full max-w-xl items-center gap-2 rounded-full p-1.5 ps-5 transition duration-300 focus-within:shadow-[0_0_30px_rgba(56,189,248,0.2)]">
      <SearchIcon className="h-5 w-5 shrink-0 text-white/40" />
      <input
        name="q"
        type="search"
        required
        minLength={2}
        maxLength={100}
        defaultValue={defaultValue}
        autoFocus={autoFocus}
        placeholder="ابحث في القرآن… مثل: الرحمن"
        aria-label="ابحث في القرآن"
        className="min-w-0 flex-1 bg-transparent py-2 font-arabic text-base text-white placeholder:text-white/30 focus:outline-none"
      />
      <button
        type="submit"
        className="shrink-0 rounded-full bg-white/10 px-5 py-2 font-arabic text-sm transition hover:bg-white/20 hover:text-accent">
        بحث
      </button>
    </Form>
  );
}

export function SearchIcon({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      className={className}
      aria-hidden>
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.5-3.5" />
    </svg>
  );
}
