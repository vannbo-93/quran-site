// =====================================================================
// Full audit of every reciter on the site, written to reciters-report.txt
//
//   node scripts/audit-reciters.mjs              -> all 17 reciters (a few minutes)
//   node scripts/audit-reciters.mjs shuraim      -> one reciter
//
// mp3quran with timings ("timed"), per surah:
//   - the surah file exists
//   - after the same fix the site applies (numbering one step behind),
//     the timings cover exactly ayahs 1..N, no missing, extra or duplicate ayah
//   - timings go forward: no overlap, no ayah shorter than 0.4 s, no silence over 10 s
// mp3quran whole-surah ("surah"): which surahs are recorded, and every listed file exists
// EveryAyah ("ayah"): all 6236 ayah files exist
// =====================================================================

import { writeFileSync } from "node:fs";

const API = "https://mp3quran.net/api/v3";

// Keep in sync with lib/reciters.ts
const RECITERS = [
  { id: "alafasy", name: "مشاري العفاسي", kind: "timed", server: "https://cdn.mp3quran.net/audio/mishary-alafasy/r1/", readId: 123 },
  { id: "sudais", name: "عبد الرحمن السديس", kind: "timed", server: "https://cdn.mp3quran.net/audio/abdulrahman-sudais/r1/", readId: 54 },
  { id: "shuraim", name: "سعود الشريم", kind: "timed", server: "https://cdn.mp3quran.net/audio/saud-shuraim/r1/", readId: 31 },
  { id: "muaiqly", name: "ماهر المعيقلي", kind: "ayah", folder: "MaherAlMuaiqly128kbps" },
  { id: "dosari", name: "ياسر الدوسري", kind: "timed", server: "https://cdn.mp3quran.net/audio/yasser-dosari/r1/", readId: 92 },
  { id: "abdulbasit", name: "عبد الباسط عبد الصمد", kind: "timed", server: "https://cdn.mp3quran.net/audio/abdulbasit-abdulsamad/r3/", readId: 53 },
  { id: "abdulbasit-mujawwad", name: "عبد الباسط (مجوّد)", kind: "timed", server: "https://cdn.mp3quran.net/audio/abdulbasit-abdulsamad/r1/", readId: 51 },
  { id: "husary", name: "محمود خليل الحصري", kind: "timed", server: "https://cdn.mp3quran.net/audio/mahmoud-husary/r1/", readId: 118 },
  { id: "minshawi", name: "محمد صديق المنشاوي", kind: "timed", server: "https://cdn.mp3quran.net/audio/muhammad-minshawi/r1/", readId: 112 },
  { id: "ajamy", name: "أحمد بن علي العجمي", kind: "timed", server: "https://cdn.mp3quran.net/audio/ahmad-ajmi/r1/", readId: 5 },
  { id: "qatami", name: "ناصر القطامي", kind: "timed", server: "https://cdn.mp3quran.net/audio/nasser-qatami/r1/", readId: 86 },
  { id: "fares", name: "فارس عباد", kind: "timed", server: "https://cdn.mp3quran.net/audio/fares-abbad/r1/", readId: 81 },
  { id: "ghamdi", name: "سعد الغامدي", kind: "timed", server: "https://cdn.mp3quran.net/audio/saad-ghamdi/r1/", readId: 30 },
  { id: "humaid", name: "أحمد طالب بن حميد", kind: "timed", server: "https://cdn.mp3quran.net/audio/ahmad-humaid/r1/", readId: 137 },
  { id: "luhaidan", name: "محمد اللحيدان", kind: "surah", server: "https://cdn.mp3quran.net/audio/muhammad-luhaidan/r1/", mp3quranId: 107 },
  { id: "islam-sobhi", name: "إسلام صبحي", kind: "surah", server: "https://cdn.mp3quran.net/audio/islam-sobhi/r1/", mp3quranId: 253 },
  { id: "balushi", name: "هزاع البلوشي", kind: "surah", server: "https://cdn.mp3quran.net/audio/hazza-balushi/r1/", mp3quranId: 231 },
];

// Ayahs per surah (Tanzil)
const AYAHS = [7,286,200,176,120,165,206,75,129,109,123,111,43,52,99,128,111,110,98,135,112,78,118,64,77,227,93,88,69,60,34,30,73,54,45,83,182,88,75,85,54,53,89,59,37,35,38,29,18,45,60,49,62,55,78,96,29,22,24,13,14,11,11,18,12,12,30,52,52,44,28,28,20,56,40,31,50,40,46,42,29,19,36,25,22,17,19,26,30,20,15,21,11,8,8,19,5,8,8,11,11,8,3,9,5,4,7,3,6,3,5,4,5,6];

const MAX_SILENCE_MS = 10_000;
const MIN_AYAH_MS = 400;
const pad3 = (n) => String(n).padStart(3, "0");
const sec = (ms) => `${(ms / 1000).toFixed(1)}s`;

async function exists(url) {
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const res = await fetch(url, { method: "HEAD" });
      if (res.ok) return { ok: true };
      if (res.status === 404) return { ok: false, why: "404" };
      if (attempt === 2) return { ok: false, why: String(res.status) };
    } catch (e) {
      if (attempt === 2) return { ok: false, why: `unreachable (${e.cause?.code ?? e.message})` };
    }
    await new Promise((r) => setTimeout(r, 800 * (attempt + 1)));
  }
}

async function json(url) {
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const res = await fetch(url);
      if (res.ok) return await res.json();
    } catch {}
    await new Promise((r) => setTimeout(r, 800 * (attempt + 1)));
  }
  return null;
}

// Run tasks with a concurrency limit
async function pool(items, limit, task, onProgress) {
  const results = new Array(items.length);
  let next = 0, done = 0;
  await Promise.all(
    Array.from({ length: limit }, async () => {
      while (next < items.length) {
        const i = next++;
        results[i] = await task(items[i]);
        onProgress?.(++done, items.length);
      }
    }),
  );
  return results;
}

const progress = (label) => (done, total) => process.stdout.write(`\r  ${label} ${done}/${total}   `);

// ---------- mp3quran with timings ----------
// Same rules as lib/timings.ts (keep in sync). Returns the cleaned timings and what was fixed.
function clean(raw, expected) {
  const fixes = [];
  const all = raw
    .map((t) => ({ ayah: Number(t?.ayah), start: Number(t?.start_time), end: Number(t?.end_time) }))
    .filter((t) => Number.isInteger(t.ayah) && t.ayah >= 0 && Number.isFinite(t.start) && Number.isFinite(t.end) && t.end > t.start);
  const numbered = all.filter((t) => t.ayah > 0);
  const last = Math.max(0, ...numbered.map((t) => t.ayah));
  const shifted = all.some((t) => t.ayah === 0) && numbered.length === expected - 1 && last === expected - 1;
  if (shifted) fixes.push("numbered one step behind");
  let timings = shifted ? all.map((t) => ({ ...t, ayah: t.ayah + 1 })) : numbered;
  const tiny = timings.filter((t) => t.end - t.start < MIN_AYAH_MS).map((t) => t.ayah);
  if (tiny.length) fixes.push(`short fragment dropped: ayah ${tiny.join(",")} has no timing`);
  timings = timings.filter((t) => t.end - t.start >= MIN_AYAH_MS);
  const seen = new Set();
  for (const t of timings) {
    if (seen.has(t.ayah)) return { timings: null, fixes: [...fixes, `ayah ${t.ayah} twice → whole surah only`] };
    seen.add(t.ayah);
  }
  const extra = timings.filter((t) => t.ayah > expected).map((t) => t.ayah);
  if (extra.length) return { timings: null, fixes: [...fixes, `ayahs beyond the end (${extra.join(",")}) → whole surah only`] };
  return { timings: timings.length ? timings.sort((x, y) => x.ayah - y.ayah) : null, fixes };
}

async function auditTimed(r) {
  const out = [];
  const notes = [];
  await pool(
    Array.from({ length: 114 }, (_, i) => i + 1),
    6,
    async (surah) => {
      const problems = [];
      const file = await exists(`${r.server}${pad3(surah)}.mp3`);
      if (!file.ok) problems.push(`audio ${file.why}`);

      const raw = await json(`${API}/ayat_timing?surah=${surah}&read=${r.readId}`);
      if (!Array.isArray(raw)) problems.push("timings unreachable");
      else if (raw.length === 0) problems.push("no timings");
      else {
        const expected = AYAHS[surah - 1];
        const { timings, fixes } = clean(raw, expected);
        if (fixes.length) notes.push(`${pad3(surah)}: ${fixes.join(" · ")} (handled by the site)`);
        if (timings) {
          const have = new Set(timings.map((t) => t.ayah));
          const dropped = new Set(fixes.join(" ").match(/ayah [\d,]+ has no timing/)?.[0].match(/\d+/g)?.map(Number) ?? []);
          const missing = [];
          for (let a = 1; a <= expected; a++) if (!have.has(a) && !dropped.has(a)) missing.push(a);
          if (missing.length) problems.push(`missing ayah ${missing.slice(0, 8).join(",")}${missing.length > 8 ? ` (+${missing.length - 8})` : ""}`);
          for (let i = 1; i < timings.length; i++) {
            const prev = timings[i - 1], t = timings[i];
            if (prev.ayah !== t.ayah - 1) continue;
            if (t.start < prev.end - 100) problems.push(`ayah ${t.ayah} starts before ${prev.ayah} ends`);
            else if (t.start - prev.end > MAX_SILENCE_MS) problems.push(`${sec(t.start - prev.end)} silence before ayah ${t.ayah}`);
          }
        }
      }
      if (problems.length) out.push(`  ${pad3(surah)}: ${problems.join(" · ")}`);
    },
    progress(r.name),
  );
  return { problems: out.sort(), notes: notes.sort() };
}

// ---------- mp3quran whole surah ----------
async function auditSurah(r) {
  const data = await json(`${API}/reciters?language=ar&reciter=${r.mp3quranId}`);
  const moshafs = data?.reciters?.[0]?.moshaf ?? [];
  const moshaf = moshafs.find((m) => m.server === r.server);
  if (!moshaf) {
    return { problems: [`  server not in mp3quran's list (has: ${moshafs.map((m) => m.server).join(", ") || "nothing"})`], notes: [] };
  }
  const list = String(moshaf.surah_list ?? "").split(",").map(Number).filter((n) => n >= 1 && n <= 114);
  const problems = [];
  await pool(list, 6, async (surah) => {
    const file = await exists(`${r.server}${pad3(surah)}.mp3`);
    if (!file.ok) problems.push(`  ${pad3(surah)}: listed but audio ${file.why}`);
  }, progress(r.name));
  const notRecorded = Array.from({ length: 114 }, (_, i) => i + 1).filter((s) => !list.includes(s));
  const notes = [`${list.length}/114 surahs recorded${notRecorded.length ? ` — missing: ${notRecorded.join(",")}` : ""}`];
  return { problems: problems.sort(), notes };
}

// ---------- EveryAyah ----------
async function auditAyah(r) {
  const urls = [];
  AYAHS.forEach((n, i) => {
    for (let a = 1; a <= n; a++) urls.push([i + 1, a]);
  });
  const missing = [];
  await pool(urls, 16, async ([s, a]) => {
    const file = await exists(`https://everyayah.com/data/${r.folder}/${pad3(s)}${pad3(a)}.mp3`);
    if (!file.ok) missing.push(`${s}:${a} (${file.why})`);
  }, progress(r.name));
  return { problems: missing.length ? [`  missing ${missing.length} ayah files: ${missing.slice(0, 30).join(", ")}${missing.length > 30 ? " …" : ""}`] : [], notes: [] };
}

// ---------- run ----------
const only = process.argv[2];
const list = only ? RECITERS.filter((r) => r.id === only) : RECITERS;
if (list.length === 0) {
  console.error(`Unknown reciter "${only}". Known: ${RECITERS.map((r) => r.id).join(", ")}`);
  process.exit(1);
}

const report = [`Reciters audit — ${new Date().toISOString()}`, ""];
for (const r of list) {
  const { problems, notes } = r.kind === "timed" ? await auditTimed(r) : r.kind === "surah" ? await auditSurah(r) : await auditAyah(r);
  const status = problems.length === 0 ? "✅ OK" : `❌ ${problems.length} problem(s)`;
  const line = `${r.name} (${r.id}, ${r.kind}): ${status}`;
  process.stdout.write(`\r${line}${" ".repeat(20)}\n`);
  report.push(line, ...problems, ...notes.map((n) => `  ℹ️ ${n}`), "");
}

writeFileSync("reciters-report.txt", report.join("\n"), "utf8");
console.log("\nFull report: reciters-report.txt");
