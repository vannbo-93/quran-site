import { saveLastRead } from "@/lib/lastRead";

// Save an ayah element as the last read position
export function rememberPosition(el: HTMLElement) {
  const holder = el.closest<HTMLElement>("[data-surah]");
  saveLastRead({
    surah: Number(holder?.dataset.surah),
    ayah: Number(el.dataset.ayah),
    surahName: holder?.dataset.surahName ?? "",
  });
}

// The ayah element after this one (skips anything that isn't an ayah)
export function nextAyah(el: HTMLElement | null) {
  let next = el?.nextElementSibling ?? null;
  while (next && !(next instanceof HTMLElement && next.dataset.ayah)) next = next.nextElementSibling;
  return next as HTMLElement | null;
}

// ---------- Follow the recitation without fighting the reader ----------
// When the user scrolls by hand, auto-follow pauses for a few seconds
// instead of pulling the page back to the playing ayah.
const USER_SCROLL_PAUSE_MS = 4000;
const SCROLL_KEYS = new Set(["ArrowUp", "ArrowDown", "PageUp", "PageDown", "Home", "End", " "]);
let lastUserScroll = 0;

if (typeof window !== "undefined") {
  const mark = () => {
    lastUserScroll = performance.now();
  };
  window.addEventListener("wheel", mark, { passive: true });
  window.addEventListener("touchmove", mark, { passive: true });
  window.addEventListener("keydown", (e) => {
    if (SCROLL_KEYS.has(e.key) && !(e.target instanceof HTMLInputElement)) mark();
  });
}

const userIsScrolling = () => performance.now() - lastUserScroll < USER_SCROLL_PAUSE_MS;

// Scroll only when the ayah leaves the comfortable reading zone.
// instant: jump straight there (after a seek or a deep link), even if the user was scrolling.
export function keepInView(el: HTMLElement, instant = false) {
  if (!instant && userIsScrolling()) return;
  const rect = el.getBoundingClientRect();
  const zoneTop = window.innerHeight * 0.2;
  const zoneBottom = window.innerHeight * 0.65; // leave room for the floating controls
  if (rect.top >= zoneTop && rect.bottom <= zoneBottom) return;
  window.scrollTo({ top: window.scrollY + rect.top - window.innerHeight * 0.3, behavior: instant ? "instant" : "smooth" });
}
