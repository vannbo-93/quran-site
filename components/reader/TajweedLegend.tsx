import { useEffect, useRef } from "react";
import { TAJWEED_LEGEND } from "@/lib/tajweed";

// Tajweed color key, stuck under the navbar. It never disappears:
// the bar folds and unfolds, and its tab (with the arrow) always stays visible.
export function TajweedLegend({
  open,
  colors,
  onToggleOpen,
  onToggleColors,
}: {
  open: boolean;
  colors: boolean;
  onToggleOpen: () => void;
  onToggleColors: () => void;
}) {
  const barRef = useRef<HTMLDivElement | null>(null);

  // Sit exactly under the sticky navbar, whatever its height
  useEffect(() => {
    const place = () => {
      const nav = document.querySelector("header.sticky");
      if (barRef.current) barRef.current.style.top = `${nav instanceof HTMLElement ? nav.offsetHeight : 0}px`;
    };
    place();
    window.addEventListener("resize", place);
    return () => window.removeEventListener("resize", place);
  }, []);

  return (
    <div ref={barRef} className="pointer-events-none sticky z-30 -mx-4 mb-8 sm:-mx-6">
      {open && (
        <div id="tajweed-legend" className="tj-bar pointer-events-auto">
          <div className="flex items-center gap-6 overflow-x-auto px-4 py-2 sm:px-6 lg:justify-center">
            <ul
              aria-label="ألوان التجويد"
              className={`flex items-center gap-x-6 font-arabic text-sm whitespace-nowrap transition-opacity ${
                colors ? "" : "opacity-40"
              }`}
            >
              {TAJWEED_LEGEND.map((item) => (
                <li key={item.group} className="flex items-center gap-2">
                  <span aria-hidden className={`tj-dot tj-dot-${item.group}`} />
                  <span>{item.ar}</span>
                </li>
              ))}
            </ul>

            <button
              type="button"
              onClick={onToggleColors}
              aria-pressed={colors}
              className="shrink-0 rounded-full border border-current/20 px-3 py-0.5 font-arabic text-xs whitespace-nowrap opacity-70 transition hover:opacity-100"
            >
              {colors ? "إيقاف التلوين" : "تشغيل التلوين"}
            </button>
          </div>
        </div>
      )}

      {/* The tab: always visible, folds / unfolds the bar */}
      <div className="flex justify-center">
        <button
          type="button"
          onClick={onToggleOpen}
          aria-expanded={open}
          aria-controls="tajweed-legend"
          className={`tj-tab pointer-events-auto flex items-center gap-1.5 px-3 py-1 font-arabic text-xs transition hover:opacity-90 ${
            open ? "rounded-b-lg" : "mt-1 rounded-lg"
          }`}
        >
          ألوان التجويد
          <svg
            viewBox="0 0 24 24"
            className={`h-3.5 w-3.5 transition-transform duration-300 ${open ? "rotate-180" : ""}`}
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden
          >
            <path d="m6 9 6 6 6-6" />
          </svg>
        </button>
      </div>
    </div>
  );
}
