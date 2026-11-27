// Shared by the client (Reader) and the server (lib/audio.ts)

export type Reciter = { id: string; name: string; short: string } & (
  // EveryAyah: one MP3 per ayah (small gap between ayahs when playing a surah)
  | { kind: "ayah"; folder: string }
  // mp3quran: one MP3 per surah + per-ayah timings.
  // Same recording for a single ayah and for the whole surah, no gaps.
  | { kind: "timed"; server: string; readId: number }
  // mp3quran: one MP3 per surah, no timings (whole surah only)
  | { kind: "surah"; server: string; mp3quranId: number }
);

export const RECITERS: Reciter[] = [
  { id: "alafasy", name: "مشاري العفاسي", short: "العفاسي", kind: "timed", server: "https://cdn.mp3quran.net/audio/mishary-alafasy/r1/", readId: 123 },
  { id: "sudais", name: "عبد الرحمن السديس", short: "السديس", kind: "timed", server: "https://cdn.mp3quran.net/audio/abdulrahman-sudais/r1/", readId: 54 },
  { id: "shuraim", name: "سعود الشريم", short: "الشريم", kind: "timed", server: "https://cdn.mp3quran.net/audio/saud-shuraim/r1/", readId: 31 },
  { id: "muaiqly", name: "ماهر المعيقلي", short: "المعيقلي", kind: "ayah", folder: "MaherAlMuaiqly128kbps" },
  { id: "dosari", name: "ياسر الدوسري", short: "الدوسري", kind: "timed", server: "https://cdn.mp3quran.net/audio/yasser-dosari/r1/", readId: 92 },
  { id: "abdulbasit", name: "عبد الباسط عبد الصمد", short: "عبد الباسط", kind: "timed", server: "https://cdn.mp3quran.net/audio/abdulbasit-abdulsamad/r3/", readId: 53 },
  { id: "abdulbasit-mujawwad", name: "عبد الباسط (مجوّد)", short: "عبد الباسط م", kind: "timed", server: "https://cdn.mp3quran.net/audio/abdulbasit-abdulsamad/r1/", readId: 51 },
  { id: "husary", name: "محمود خليل الحصري", short: "الحصري", kind: "timed", server: "https://cdn.mp3quran.net/audio/mahmoud-husary/r1/", readId: 118 },
  { id: "minshawi", name: "محمد صديق المنشاوي", short: "المنشاوي", kind: "timed", server: "https://cdn.mp3quran.net/audio/muhammad-minshawi/r1/", readId: 112 },
  { id: "ajamy", name: "أحمد بن علي العجمي", short: "العجمي", kind: "timed", server: "https://cdn.mp3quran.net/audio/ahmad-ajmi/r1/", readId: 5 },
  { id: "qatami", name: "ناصر القطامي", short: "القطامي", kind: "timed", server: "https://cdn.mp3quran.net/audio/nasser-qatami/r1/", readId: 86 },
  { id: "fares", name: "فارس عباد", short: "فارس عباد", kind: "timed", server: "https://cdn.mp3quran.net/audio/fares-abbad/r1/", readId: 81 },
  { id: "ghamdi", name: "سعد الغامدي", short: "الغامدي", kind: "timed", server: "https://cdn.mp3quran.net/audio/saad-ghamdi/r1/", readId: 30 },
  { id: "humaid", name: "أحمد طالب بن حميد", short: "ابن حميد", kind: "timed", server: "https://cdn.mp3quran.net/audio/ahmad-humaid/r1/", readId: 137 },
  { id: "luhaidan", name: "محمد اللحيدان", short: "اللحيدان", kind: "surah", server: "https://cdn.mp3quran.net/audio/muhammad-luhaidan/r1/", mp3quranId: 107 },
  { id: "islam-sobhi", name: "إسلام صبحي", short: "إسلام صبحي", kind: "surah", server: "https://cdn.mp3quran.net/audio/islam-sobhi/r1/", mp3quranId: 253 },
  { id: "balushi", name: "هزاع البلوشي", short: "البلوشي", kind: "surah", server: "https://cdn.mp3quran.net/audio/hazza-balushi/r1/", mp3quranId: 231 },
];

export const DEFAULT_RECITER = "alafasy";

export const getReciter = (id: string | undefined) =>
  RECITERS.find((r) => r.id === id) ?? RECITERS[0];

export const pad3 = (n: number) => String(n).padStart(3, "0");

export const everyAyahUrl = (folder: string, surah: number, ayah: number) =>
  `https://everyayah.com/data/${folder}/${pad3(surah)}${pad3(ayah)}.mp3`;

export const surahFileUrl = (server: string, surah: number) => `${server}${pad3(surah)}.mp3`;

export type Timing = { ayah: number; start: number; end: number }; // milliseconds
// failed: the audio server couldn't be reached (temporary) — not the same as "not recorded"
export type AudioInfo = { available: boolean; url?: string; timings?: Timing[]; failed?: boolean };
