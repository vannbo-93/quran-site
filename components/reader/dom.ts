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

// Scroll only when the ayah leaves the comfortable reading zone.
// instant: jump straight there (after a seek) instead of a smooth scroll.
export function keepInView(el: HTMLElement, instant = false) {
  const rect = el.getBoundingClientRect();
  const zoneTop = window.innerHeight * 0.2;
  const zoneBottom = window.innerHeight * 0.65; // leave room for the floating controls
  if (rect.top >= zoneTop && rect.bottom <= zoneBottom) return;
  window.scrollTo({ top: window.scrollY + rect.top - window.innerHeight * 0.3, behavior: instant ? "instant" : "smooth" });
}
