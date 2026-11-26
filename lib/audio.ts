/** @format */

import { cacheLife } from "next/cache";
import {
  getReciter,
  RECITERS,
  surahFileUrl,
  type AudioInfo,
  type Timing,
} from "@/lib/reciters";

const API = "https://mp3quran.net/api/v3";

// Per-ayah start/end times inside the surah file (milliseconds)
async function getTimings(readId: number, surah: number): Promise<Timing[]> {
  "use cache";
  cacheLife("max");
  const res = await fetch(`${API}/ayat_timing?surah=${surah}&read=${readId}`);
  if (!res.ok) return [];
  const data: unknown = await res.json();
  if (!Array.isArray(data)) return [];
  return data
    .filter((t) => Number(t?.ayah) > 0) // ayah 0 = intro / basmala
    .map((t) => ({
      ayah: Number(t.ayah),
      start: Number(t.start_time),
      end: Number(t.end_time),
    }))
    .filter(
      (t) =>
        Number.isFinite(t.start) && Number.isFinite(t.end) && t.end > t.start,
    );
}

// Which surahs a whole-surah reciter has recorded
async function getSurahList(
  mp3quranId: number,
  server: string,
): Promise<number[]> {
  "use cache";
  cacheLife("days");
  const res = await fetch(`${API}/reciters?language=ar&reciter=${mp3quranId}`);
  if (!res.ok) return [];
  const data = await res.json();
  const moshafs: { server?: string; surah_list?: string }[] =
    data?.reciters?.[0]?.moshaf ?? [];
  const moshaf = moshafs.find((m) => m.server === server) ?? moshafs[0];
  return String(moshaf?.surah_list ?? "")
    .split(",")
    .map(Number)
    .filter((n) => Number.isInteger(n) && n >= 1 && n <= 114);
}

export async function getAudioInfo(
  reciterId: string,
  surah: number,
): Promise<AudioInfo | null> {
  if (!RECITERS.some((r) => r.id === reciterId)) return null;
  const reciter = getReciter(reciterId);

  if (reciter.kind === "timed") {
    const timings = await getTimings(reciter.readId, surah);
    return timings.length > 0
      ? { available: true, url: surahFileUrl(reciter.server, surah), timings }
      : { available: false };
  }

  if (reciter.kind === "surah") {
    const surahs = await getSurahList(reciter.mp3quranId, reciter.server);
    return surahs.includes(surah)
      ? { available: true, url: surahFileUrl(reciter.server, surah) }
      : { available: false };
  }

  return { available: true }; // EveryAyah reciters are handled in the browser
}
