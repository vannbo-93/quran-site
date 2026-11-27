// Cleaning of mp3quran per-ayah timings.
// The rules below come from a full audit of every reciter (scripts/audit-reciters.mjs).
// scripts/audit-reciters.mjs repeats them: keep both in sync.

import type { Timing } from "@/lib/reciters";

// Shorter than this is a cut in the wrong place, not an ayah
export const MIN_AYAH_MS = 400;

// Returns the timings for ayahs 1..expected, or null when the data can't be trusted
// (then the surah still plays whole, but single ayahs and highlighting are off).
export function cleanTimings(raw: unknown[], expected: number): Timing[] | null {
  const all: Timing[] = raw
    .map((t) => {
      const o = t as { ayah?: unknown; start_time?: unknown; end_time?: unknown };
      return { ayah: Number(o?.ayah), start: Number(o?.start_time), end: Number(o?.end_time) };
    })
    .filter((t) => Number.isInteger(t.ayah) && t.ayah >= 0)
    .filter((t) => Number.isFinite(t.start) && Number.isFinite(t.end) && t.end > t.start);

  // 1) Usually ayah 0 is the intro (isti'adha / basmala) and is skipped.
  //    Some recordings are numbered one step behind: the real ayah 1 is labelled 0
  //    and the last ayah is missing (At-Tawbah by Shuraim, Al-Fatiha by Husary...).
  const numbered = all.filter((t) => t.ayah > 0);
  const lastAyah = Math.max(0, ...numbered.map((t) => t.ayah));
  const shifted = all.some((t) => t.ayah === 0) && numbered.length === expected - 1 && lastAyah === expected - 1;
  let timings = shifted ? all.map((t) => ({ ...t, ayah: t.ayah + 1 })) : numbered;

  // 2) Fragments of a few hundred ms are bad cuts: drop them (that ayah just has no timing)
  timings = timings.filter((t) => t.end - t.start >= MIN_AYAH_MS);

  // 3) The same ayah twice: the numbering can't be trusted
  const seen = new Set<number>();
  for (const t of timings) {
    if (seen.has(t.ayah)) return null;
    seen.add(t.ayah);
  }

  // 4) Ayahs beyond the end of the surah.
  //    One extra right after the last ayah (a closing segment): drop it.
  //    More than that (Yusuf by Shuraim: 116 for 111): the whole numbering is off.
  const extra = timings.filter((t) => t.ayah > expected).map((t) => t.ayah);
  if (extra.length > 0) {
    const complete = Array.from({ length: expected }, (_, i) => i + 1).every((a) => seen.has(a));
    if (extra.length === 1 && extra[0] === expected + 1 && complete) {
      timings = timings.filter((t) => t.ayah <= expected);
    } else {
      return null;
    }
  }

  return timings.length > 0 ? timings.sort((a, b) => a.ayah - b.ayah) : null;
}
