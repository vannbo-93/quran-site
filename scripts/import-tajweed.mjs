// =====================================================================
// Import tajweed color annotations into ayahs.tajweed.
//
// Required files:
//   data/tanzil/quran-uthmani.txt   -> the same text already in the database
//   data/tajweed/tajweed.json       -> annotations aligned to that text
//
// Usage:
//   node --env-file=.env.local scripts/import-tajweed.mjs --dry-run
//   node --env-file=.env.local scripts/import-tajweed.mjs
//
// Source: cpfair/quran-tajweed — CC BY 4.0 (attribution required).
// Every ayah is checked again here: if the text length differs or an
// annotation falls outside the text, that ayah is skipped (shown uncolored).
// =====================================================================

import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

const DRY_RUN = process.argv.includes("--dry-run");
const QURAN_FILE = "data/tanzil/quran-uthmani.txt";
const TAJWEED_FILE = "data/tajweed/tajweed.json";
const BATCH = 500;

const RULES = new Set([
  "hamzat_wasl", "lam_shamsiyyah", "silent",
  "madd_2", "madd_246", "madd_munfasil", "madd_muttasil", "madd_6",
  "ghunnah", "ikhfa", "ikhfa_shafawi", "idghaam_ghunnah", "idghaam_shafawi", "iqlab",
  "idghaam_no_ghunnah", "idghaam_mutajanisayn", "idghaam_mutaqaribayn",
  "qalqalah",
]);

function fail(msg) {
  console.error(`\n❌ ${msg}\n   Nothing was imported.`);
  process.exit(1);
}

// Same reading as import-quran.mjs: "sura|aya|text", trimmed
const texts = new Map();
for (const line of readFileSync(QURAN_FILE, "utf8").replace(/^﻿/, "").split(/\r?\n/)) {
  if (!line.trim() || line.startsWith("#")) continue;
  const [s, a, ...rest] = line.split("|");
  texts.set(`${Number(s)}:${Number(a)}`, rest.join("|").trim());
}
if (texts.size !== 6236) fail(`${QURAN_FILE}: expected 6236 ayahs, found ${texts.size}`);

let doc;
try {
  doc = JSON.parse(readFileSync(TAJWEED_FILE, "utf8"));
} catch (e) {
  fail(`Cannot read ${TAJWEED_FILE}: ${e.message}`);
}

// Ayah ids follow the Quran order (1 = 1:1 ... 6236 = 114:6)
const ids = new Map([...texts.keys()].map((key, i) => [key, i + 1]));

const rows = [];
const skipped = [];
for (const [surah, ayah, length, annotations] of doc.ayahs) {
  const key = `${surah}:${ayah}`;
  const text = texts.get(key);
  const valid =
    text !== undefined &&
    [...text].length === length &&
    annotations.every(
      ([start, end, rule]) => Number.isInteger(start) && Number.isInteger(end) && start >= 0 && end > start && end <= length && RULES.has(rule),
    );
  if (!valid) {
    skipped.push(key);
    continue;
  }
  rows.push({ id: ids.get(key), tajweed: annotations });
}

console.log(`✔ ${rows.length} ayahs ready, ${6236 - rows.length} without colors`);
if (skipped.length) console.log(`  skipped (text mismatch): ${skipped.slice(0, 10).join(", ")}${skipped.length > 10 ? " …" : ""}`);
if (rows.length < 6000) fail("Too many ayahs failed the check — is quran-uthmani.txt the same file you imported?");

if (DRY_RUN) {
  console.log("\n(dry run) nothing written. Run again without --dry-run to import.");
  process.exit(0);
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SECRET_KEY;
if (!url || !key) fail("NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SECRET_KEY must be set in .env.local");
const supabase = createClient(url, key, { auth: { persistSession: false } });

let done = 0;
for (let i = 0; i < rows.length; i += BATCH) {
  const { data, error } = await supabase.rpc("set_tajweed", { rows: rows.slice(i, i + BATCH) });
  if (error) fail(`Batch ${i / BATCH + 1}: ${error.message}`);
  done += data;
  process.stdout.write(`\r  ${done}/${rows.length}`);
}
console.log(`\n✅ Tajweed imported for ${done} ayahs.`);
