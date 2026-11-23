/** @format */

// =====================================================================
// Import the Quran text + metadata from Tanzil into Supabase.
//
// Required files (download them yourself from tanzil.net):
//   data/tanzil/quran-uthmani.txt   -> format "sura|aya|text"
//   data/tanzil/quran-data.js       -> Tanzil metadata (suras, juz, hizb, pages)
//
// Usage:
//   node --env-file=.env.local scripts/import-quran.mjs --dry-run   (check only)
//   node --env-file=.env.local scripts/import-quran.mjs             (import)
//
// Needs in .env.local:
//   NEXT_PUBLIC_SUPABASE_URL=...
//   SUPABASE_SECRET_KEY=...        (secret key, NEVER prefix with NEXT_PUBLIC_)
// =====================================================================

import { readFileSync } from "node:fs";
import vm from "node:vm";
import { createClient } from "@supabase/supabase-js";

const DRY_RUN = process.argv.includes("--dry-run");
const TEXT_FILE = "data/tanzil/quran-uthmani.txt";
const META_FILE = "data/tanzil/quran-data.js";

const EXPECTED = {
  surahs: 114,
  ayahs: 6236,
  pages: 604,
  juz: 30,
  hizbQuarters: 240,
};

function fail(msg) {
  console.error(`\n❌ ${msg}\n   Nothing was imported.`);
  process.exit(1);
}

// 1. Read metadata (quran-data.js defines a global `QuranData` object)
function loadMetadata() {
  const code = readFileSync(META_FILE, "utf8");
  const context = {};
  vm.runInNewContext(code + "\n;this.QuranData = QuranData;", context, {
    timeout: 2000,
  });
  const q = context.QuranData;
  if (!q?.Sura || !q?.Juz || !q?.HizbQaurter || !q?.Page) {
    fail(
      `${META_FILE} does not look like Tanzil metadata (missing Sura/Juz/HizbQaurter/Page).`,
    );
  }
  // Tanzil arrays start with an empty [] and end with a closing marker: drop both
  const trim = (arr) => arr.filter((x) => Array.isArray(x) && x.length > 0);
  const suras = trim(q.Sura).slice(0, EXPECTED.surahs);
  const juz = trim(q.Juz).slice(0, EXPECTED.juz);
  const hizb = trim(q.HizbQaurter).slice(0, EXPECTED.hizbQuarters);
  const pages = trim(q.Page).slice(0, EXPECTED.pages);

  if (suras.length !== EXPECTED.surahs)
    fail(`Expected 114 suras in metadata, got ${suras.length}.`);
  if (juz.length !== EXPECTED.juz) fail(`Expected 30 juz, got ${juz.length}.`);
  if (hizb.length !== EXPECTED.hizbQuarters)
    fail(`Expected 240 hizb quarters, got ${hizb.length}.`);
  if (pages.length !== EXPECTED.pages)
    fail(`Expected 604 pages, got ${pages.length}.`);

  return { suras, juz, hizb, pages };
}

// 2. Read the text file: "sura|aya|text" per line, comments start with #
function loadText() {
  const lines = readFileSync(TEXT_FILE, "utf8")
    .replace(/^\uFEFF/, "")
    .split(/\r?\n/);
  const ayahs = [];
  for (const line of lines) {
    if (!line.trim() || line.startsWith("#")) continue;
    const parts = line.split("|");
    if (parts.length !== 3)
      fail(`Bad line in ${TEXT_FILE}: "${line.slice(0, 60)}..."`);
    const [s, a, text] = parts;
    ayahs.push({ surah: Number(s), ayah: Number(a), text: text.trim() });
  }
  if (ayahs.length !== EXPECTED.ayahs)
    fail(`Expected 6236 ayahs in text, got ${ayahs.length}.`);
  return ayahs;
}

// 3. Build rows + validate everything before touching the database
function build() {
  const meta = loadMetadata();
  const text = loadText();

  // Sura entry: [startIndex, ayaCount, order, rukus, nameAr, translit, nameEn, type]
  const surahs = meta.suras.map((s, i) => ({
    id: i + 1,
    name_ar: s[4],
    name_en: s[5],
    revelation_place:
      s[7] === "Meccan" ? "makkah" : s[7] === "Medinan" ? "madinah" : null,
    ayah_count: s[1],
  }));
  const ARABIC_ONLY = /^[\u0600-\u06FF\s]+$/;
  const MOJIBAKE = /[ØÙÚÛ]/; // signs of UTF-8 read as Windows-1252
  for (const s of surahs) {
    if (!s.revelation_place) fail(`Unknown revelation type for surah ${s.id}.`);
    if (!ARABIC_ONLY.test(s.name_ar)) {
      fail(
        `Surah ${s.id} name is not valid Arabic ("${s.name_ar}"). ${META_FILE} has a wrong encoding — re-download it with "Save link as".`,
      );
    }
  }
  const total = surahs.reduce((n, s) => n + s.ayah_count, 0);
  if (total !== EXPECTED.ayahs)
    fail(`Sum of ayah counts in metadata is ${total}, expected 6236.`);

  // Global ayah id from [sura, aya]
  const globalId = ([sura, aya]) => meta.suras[sura - 1][0] + aya;
  const juzStarts = meta.juz.map(globalId);
  const hizbStarts = meta.hizb.map(globalId);
  const pageStarts = meta.pages.map(globalId);
  // index (1-based) of the last boundary that starts at or before id
  const locate = (starts, id) => {
    let n = 0;
    for (const start of starts) if (start <= id) n++;
    return n;
  };

  const ayahs = text.map((t, i) => {
    const id = i + 1;
    const s = meta.suras[t.surah - 1];
    if (!s) fail(`Line ${id}: surah ${t.surah} does not exist.`);
    if (s[0] + t.ayah !== id)
      fail(
        `Order mismatch at ${t.surah}:${t.ayah} (line ${id}). File order is wrong.`,
      );
    if (!t.text) fail(`Empty text at ${t.surah}:${t.ayah}.`);
    if (MOJIBAKE.test(t.text))
      fail(
        `Ayah ${t.surah}:${t.ayah} has a wrong encoding. Re-download ${TEXT_FILE}.`,
      );
    return {
      id,
      surah_id: t.surah,
      ayah_number: t.ayah,
      text_uthmani: t.text,
      page: locate(pageStarts, id),
      juz: locate(juzStarts, id),
      hizb_quarter: locate(hizbStarts, id),
    };
  });

  // Each surah's ayahs must match its ayah_count
  for (const s of surahs) {
    const n = ayahs.filter((a) => a.surah_id === s.id).length;
    if (n !== s.ayah_count)
      fail(
        `Surah ${s.id}: text has ${n} ayahs, metadata says ${s.ayah_count}.`,
      );
  }
  for (const a of ayahs) {
    if (a.page < 1 || a.juz < 1 || a.hizb_quarter < 1)
      fail(`Missing page/juz/hizb for ayah ${a.id}.`);
  }

  return { surahs, ayahs };
}

// 4. Insert in batches (upsert = safe to run again)
async function upsert(supabase, table, rows, size = 500) {
  for (let i = 0; i < rows.length; i += size) {
    const batch = rows.slice(i, i + size);
    const { error } = await supabase.from(table).upsert(batch);
    if (error) fail(`Insert into ${table} failed: ${error.message}`);
    process.stdout.write(
      `\r   ${table}: ${Math.min(i + size, rows.length)}/${rows.length}`,
    );
  }
  console.log();
}

async function main() {
  const { surahs, ayahs } = build();

  console.log("✅ Files are valid:");
  console.log(`   surahs: ${surahs.length}, ayahs: ${ayahs.length}`);
  console.log(
    `   pages: 1-${ayahs.at(-1).page}, juz: 1-${ayahs.at(-1).juz}, hizb quarters: 1-${ayahs.at(-1).hizb_quarter}`,
  );
  console.log(`   first: ${ayahs[0].text_uthmani}`);
  console.log(`   last:  ${ayahs.at(-1).text_uthmani}`);

  if (DRY_RUN) {
    console.log("\n(dry run) Nothing was written to the database.");
    return;
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY;
  if (!url || !key)
    fail(
      "NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SECRET_KEY is missing in .env.local.",
    );

  const supabase = createClient(url, key, { auth: { persistSession: false } });

  console.log("\nImporting...");
  await upsert(supabase, "surahs", surahs);
  await upsert(supabase, "ayahs", ayahs);

  // Final check: count rows in the database
  const { count, error } = await supabase
    .from("ayahs")
    .select("id", { count: "exact", head: true });
  if (error || count !== EXPECTED.ayahs)
    fail(`Database has ${count} ayahs after import, expected 6236.`);
  console.log("\n✅ Done. Database has 114 surahs and 6236 ayahs.");
}

main();
