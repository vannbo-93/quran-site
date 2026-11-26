import { RECITERS } from "@/lib/reciters";

export function ReciterList({ value, onChange }: { value: string; onChange: (id: string) => void }) {
  return (
    <ul role="listbox" aria-label="اختيار القارئ" className="reciter-menu max-h-[50vh] overflow-y-auto">
      {RECITERS.map((r) => (
        <li key={r.id}>
          <button
            type="button"
            role="option"
            aria-selected={r.id === value}
            onClick={() => onChange(r.id)}
            className={`flex w-full items-center justify-between gap-2 rounded-xl px-3 py-2 font-arabic text-sm transition ${
              r.id === value ? "bg-white/10 text-accent" : "text-white/70 hover:bg-white/5 hover:text-white"
            }`}
          >
            <span>{r.name}</span>
            <span className="flex items-center gap-2">
              {r.kind === "surah" && (
                <span className="rounded-full border border-white/15 px-2 py-0.5 text-[10px] text-white/40">
                  سورة كاملة
                </span>
              )}
              {r.id === value && <span aria-hidden>✓</span>}
            </span>
          </button>
        </li>
      ))}
    </ul>
  );
}
