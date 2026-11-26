// Menu above the toolbar, centered, so it never overflows a phone screen.
// The outer element positions it; .glass would override "absolute" on the same element.
export function Panel({ children }: { children: React.ReactNode }) {
  return (
    <div className="absolute bottom-full left-1/2 mb-4 w-[min(18rem,calc(100vw-2rem))] -translate-x-1/2">
      <div className="rounded-2xl border border-white/15 bg-black p-1.5 shadow-[0_10px_40px_rgba(0,0,0,0.8)]">
        {children}
      </div>
    </div>
  );
}
