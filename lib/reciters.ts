/** @format */

// Shared by the client (Reader) and the server (lib/audio.ts)

export type Reciter = { id: string; name: string; short: string } &
  // EveryAyah: one MP3 per ayah
  (| { kind: "ayah"; folder: string }
    // mp3quran: one MP3 per surah + per-ayah timings
    | { kind: "timed"; server: string; readId: number }
    // mp3quran: one MP3 per surah, no timings (whole surah only)
    | { kind: "surah"; server: string; mp3quranId: number }
  );

export const RECITERS: Reciter[] = [
  {
    id: "alafasy",
    name: "مشاري العفاسي",
    short: "العفاسي",
    kind: "ayah",
    folder: "Alafasy_128kbps",
  },
  {
    id: "sudais",
    name: "عبد الرحمن السديس",
    short: "السديس",
    kind: "ayah",
    folder: "Abdurrahmaan_As-Sudais_192kbps",
  },
  {
    id: "shuraim",
    name: "سعود الشريم",
    short: "الشريم",
    kind: "ayah",
    folder: "Saood_ash-Shuraym_128kbps",
  },
  {
    id: "muaiqly",
    name: "ماهر المعيقلي",
    short: "المعيقلي",
    kind: "ayah",
    folder: "MaherAlMuaiqly128kbps",
  },
  {
    id: "dosari",
    name: "ياسر الدوسري",
    short: "الدوسري",
    kind: "ayah",
    folder: "Yasser_Ad-Dussary_128kbps",
  },
  {
    id: "abdulbasit",
    name: "عبد الباسط عبد الصمد",
    short: "عبد الباسط",
    kind: "ayah",
    folder: "Abdul_Basit_Murattal_192kbps",
  },
  {
    id: "abdulbasit-mujawwad",
    name: "عبد الباسط (مجوّد)",
    short: "عبد الباسط م",
    kind: "ayah",
    folder: "Abdul_Basit_Mujawwad_128kbps",
  },
  {
    id: "husary",
    name: "محمود خليل الحصري",
    short: "الحصري",
    kind: "ayah",
    folder: "Husary_128kbps",
  },
  {
    id: "minshawi",
    name: "محمد صديق المنشاوي",
    short: "المنشاوي",
    kind: "ayah",
    folder: "Minshawy_Murattal_128kbps",
  },
  {
    id: "ajamy",
    name: "أحمد بن علي العجمي",
    short: "العجمي",
    kind: "ayah",
    folder: "ahmed_ibn_ali_al_ajamy_128kbps",
  },
  {
    id: "qatami",
    name: "ناصر القطامي",
    short: "القطامي",
    kind: "ayah",
    folder: "Nasser_Alqatami_128kbps",
  },
  {
    id: "fares",
    name: "فارس عباد",
    short: "فارس عباد",
    kind: "ayah",
    folder: "Fares_Abbad_64kbps",
  },
  {
    id: "ghamdi",
    name: "سعد الغامدي",
    short: "الغامدي",
    kind: "timed",
    server: "https://cdn.mp3quran.net/audio/saad-ghamdi/r1/",
    readId: 30,
  },
  {
    id: "humaid",
    name: "أحمد طالب بن حميد",
    short: "ابن حميد",
    kind: "timed",
    server: "https://cdn.mp3quran.net/audio/ahmad-humaid/r1/",
    readId: 137,
  },
  {
    id: "luhaidan",
    name: "محمد اللحيدان",
    short: "اللحيدان",
    kind: "surah",
    server: "https://cdn.mp3quran.net/audio/muhammad-luhaidan/r1/",
    mp3quranId: 107,
  },
  {
    id: "islam-sobhi",
    name: "إسلام صبحي",
    short: "إسلام صبحي",
    kind: "surah",
    server: "https://cdn.mp3quran.net/audio/islam-sobhi/r1/",
    mp3quranId: 253,
  },
  {
    id: "balushi",
    name: "هزاع البلوشي",
    short: "البلوشي",
    kind: "surah",
    server: "https://cdn.mp3quran.net/audio/hazza-balushi/r1/",
    mp3quranId: 231,
  },
];

export const DEFAULT_RECITER = "alafasy";

export const getReciter = (id: string | undefined) =>
  RECITERS.find((r) => r.id === id) ?? RECITERS[0];

export const pad3 = (n: number) => String(n).padStart(3, "0");

export const everyAyahUrl = (folder: string, surah: number, ayah: number) =>
  `https://everyayah.com/data/${folder}/${pad3(surah)}${pad3(ayah)}.mp3`;

export const surahFileUrl = (server: string, surah: number) =>
  `${server}${pad3(surah)}.mp3`;

export type Timing = { ayah: number; start: number; end: number }; // milliseconds
export type AudioInfo = {
  available: boolean;
  url?: string;
  timings?: Timing[];
};
