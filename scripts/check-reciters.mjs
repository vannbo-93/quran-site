/** @format */

// =====================================================================
// Check every mp3quran reciter, surah by surah:
//   - the audio file exists
//   - the ayah timings exist and cover every ayah
//
// Usage:
//   node scripts/check-reciters.mjs            -> all timed reciters
//   node scripts/check-reciters.mjs ghamdi     -> one reciter
// =====================================================================

const API = "https://mp3quran.net/api/v3";
const RECITERS = [
  {
    id: "alafasy",
    name: "مشاري العفاسي",
    server: "https://cdn.mp3quran.net/audio/mishary-alafasy/r1/",
    readId: 123,
  },
  {
    id: "sudais",
    name: "عبد الرحمن السديس",
    server: "https://cdn.mp3quran.net/audio/abdulrahman-sudais/r1/",
    readId: 54,
  },
  {
    id: "shuraim",
    name: "سعود الشريم",
    server: "https://cdn.mp3quran.net/audio/saud-shuraim/r1/",
    readId: 31,
  },
  {
    id: "dosari",
    name: "ياسر الدوسري",
    server: "https://cdn.mp3quran.net/audio/yasser-dosari/r1/",
    readId: 92,
  },
  {
    id: "abdulbasit",
    name: "عبد الباسط عبد الصمد",
    server: "https://cdn.mp3quran.net/audio/abdulbasit-abdulsamad/r3/",
    readId: 53,
  },
  {
    id: "abdulbasit-mujawwad",
    name: "عبد الباسط (مجوّد)",
    server: "https://cdn.mp3quran.net/audio/abdulbasit-abdulsamad/r1/",
    readId: 51,
  },
  {
    id: "husary",
    name: "محمود خليل الحصري",
    server: "https://cdn.mp3quran.net/audio/mahmoud-husary/r1/",
    readId: 118,
  },
  {
    id: "minshawi",
    name: "محمد صديق المنشاوي",
    server: "https://cdn.mp3quran.net/audio/muhammad-minshawi/r1/",
    readId: 112,
  },
  {
    id: "ajamy",
    name: "أحمد بن علي العجمي",
    server: "https://cdn.mp3quran.net/audio/ahmad-ajmi/r1/",
    readId: 5,
  },
  {
    id: "qatami",
    name: "ناصر القطامي",
    server: "https://cdn.mp3quran.net/audio/nasser-qatami/r1/",
    readId: 86,
  },
  {
    id: "fares",
    name: "فارس عباد",
    server: "https://cdn.mp3quran.net/audio/fares-abbad/r1/",
    readId: 81,
  },
  {
    id: "ghamdi",
    name: "سعد الغامدي",
    server: "https://cdn.mp3quran.net/audio/saad-ghamdi/r1/",
    readId: 30,
  },
  {
    id: "humaid",
    name: "أحمد طالب بن حميد",
    server: "https://cdn.mp3quran.net/audio/ahmad-humaid/r1/",
    readId: 137,
  },
];
// Ayahs per surah (Tanzil)
const AYAHS = [
  7, 286, 200, 176, 120, 165, 206, 75, 129, 109, 123, 111, 43, 52, 99, 128, 111,
  110, 98, 135, 112, 78, 118, 64, 77, 227, 93, 88, 69, 60, 34, 30, 73, 54, 45,
  83, 182, 88, 75, 85, 54, 53, 89, 59, 37, 35, 38, 29, 18, 45, 60, 49, 62, 55,
  78, 96, 29, 22, 24, 13, 14, 11, 11, 18, 12, 12, 30, 52, 52, 44, 28, 28, 20,
  56, 40, 31, 50, 40, 46, 42, 29, 19, 36, 25, 22, 17, 19, 26, 30, 20, 15, 21,
  11, 8, 8, 19, 5, 8, 8, 11, 11, 8, 3, 9, 5, 4, 7, 3, 6, 3, 5, 4, 5, 6,
];

const only = process.argv[2];
const list = only ? RECITERS.filter((r) => r.id === only) : RECITERS;
if (list.length === 0) {
  console.error(
    `Unknown reciter "${only}". Known: ${RECITERS.map((r) => r.id).join(", ")}`,
  );
  process.exit(1);
}

const pad3 = (n) => String(n).padStart(3, "0");

async function checkSurah(r, surah) {
  const problems = [];
  try {
    const head = await fetch(`${r.server}${pad3(surah)}.mp3`, {
      method: "HEAD",
    });
    if (!head.ok) problems.push(`audio ${head.status}`);
  } catch (e) {
    problems.push(`audio unreachable (${e.message})`);
  }
  try {
    const res = await fetch(
      `${API}/ayat_timing?surah=${surah}&read=${r.readId}`,
    );
    const data = res.ok ? await res.json() : null;
    const ayahs = new Set(
      (Array.isArray(data) ? data : [])
        .filter((t) => t.ayah > 0)
        .map((t) => t.ayah),
    );
    if (!res.ok) problems.push(`timings ${res.status}`);
    else if (ayahs.size === 0) problems.push("no timings");
    else if (ayahs.size < AYAHS[surah - 1])
      problems.push(`timings ${ayahs.size}/${AYAHS[surah - 1]}`);
  } catch (e) {
    problems.push(`timings unreachable (${e.message})`);
  }
  return problems;
}

for (const r of list) {
  const bad = [];
  // 6 surahs at a time: fast, without hammering the server
  for (let start = 1; start <= 114; start += 6) {
    const batch = Array.from(
      { length: Math.min(6, 115 - start) },
      (_, i) => start + i,
    );
    const results = await Promise.all(batch.map((s) => checkSurah(r, s)));
    results.forEach(
      (p, i) => p.length && bad.push(`  ${pad3(batch[i])}: ${p.join(", ")}`),
    );
    process.stdout.write(`\r${r.name} … ${Math.min(start + 5, 114)}/114`);
  }
  console.log(
    `\r${r.name} (${r.id}): ${bad.length === 0 ? "✅ all 114 surahs OK" : `❌ ${bad.length} surahs with problems`}`,
  );
  bad.forEach((line) => console.log(line));
}
