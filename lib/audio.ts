import { cacheLife } from "next/cache";
import { AYAH_COUNTS } from "@/lib/ayahCounts";
import { cleanTimings } from "@/lib/timings";
import { getReciter, RECITERS, surahFileUrl, type AudioInfo, type Timing } from "@/lib/reciters";

const API = "https://mp3quran.net/api/v3";

// Failures THROW instead of returning an empty result:
// "use cache" keeps whatever is returned, so an empty result after a temporary
// mp3quran error would make that surah "unavailable" until the next deploy.
// A thrown error is not cached: the next request simply tries again.

// Per-ayah start/end times inside the surah file (milliseconds), cleaned (see lib/timings.ts).
// null: mp3quran's timings for this surah can't be trusted → whole surah only.
async function getTimings(readId: number, surah: number): Promise<Timing[] | null> {
  "use cache";
  cacheLife("max");
  const res = await fetch(`${API}/ayat_timing?surah=${surah}&read=${readId}`);
  if (!res.ok) throw new Error(`mp3quran timings ${res.status} (read ${readId}, surah ${surah})`);
  const data: unknown = await res.json();
  if (!Array.isArray(data)) throw new Error(`mp3quran timings: unexpected response (read ${readId}, surah ${surah})`);
  return cleanTimings(data, AYAH_COUNTS[surah - 1]);
}

// Which surahs a whole-surah reciter has recorded
async function getSurahList(mp3quranId: number, server: string): Promise<number[]> {
  "use cache";
  cacheLife("days");
  const res = await fetch(`${API}/reciters?language=ar&reciter=${mp3quranId}`);
  if (!res.ok) throw new Error(`mp3quran reciters ${res.status} (reciter ${mp3quranId})`);
  const data = await res.json();
  const moshafs: { server?: string; surah_list?: string }[] = data?.reciters?.[0]?.moshaf ?? [];
  const moshaf = moshafs.find((m) => m.server === server) ?? moshafs[0];
  return String(moshaf?.surah_list ?? "")
    .split(",")
    .map(Number)
    .filter((n) => Number.isInteger(n) && n >= 1 && n <= 114);
}

export async function getAudioInfo(reciterId: string, surah: number): Promise<AudioInfo | null> {
  if (!RECITERS.some((r) => r.id === reciterId)) return null;
  const reciter = getReciter(reciterId);

  if (reciter.kind === "timed") {
    // Every surah file exists for these reciters (checked by scripts/audit-reciters.mjs).
    // Without trustworthy timings the surah still plays whole.
    const timings = await getTimings(reciter.readId, surah);
    return { available: true, url: surahFileUrl(reciter.server, surah), ...(timings ? { timings } : {}) };
  }

  if (reciter.kind === "surah") {
    const surahs = await getSurahList(reciter.mp3quranId, reciter.server);
    return surahs.includes(surah)
      ? { available: true, url: surahFileUrl(reciter.server, surah) }
      : { available: false };
  }

  return { available: true }; // EveryAyah reciters are handled in the browser
}
