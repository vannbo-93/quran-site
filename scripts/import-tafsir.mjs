/** @format */

// =====================================================================
// Import At-Tafsir Al-Muyassar (Arabic) from Tanzil into Supabase.
// Replaces the QuranEnc version: same resource, every row is overwritten.
//
// Required files:
//   data/tanzil/quran-uthmani.txt  -> already used by import-quran.mjs (ayah order)
//   data/tanzil/ar.muyassar.txt    -> Tafsir Al-Muyassar, "sura|aya|text"
//
// Usage:
//   node --env-file=.env.local scripts/import-tafsir.mjs --dry-run
//   node --env-file=.env.local scripts/import-tafsir.mjs
//
// License: Tanzil translations are for NON-COMMERCIAL use only.
// =====================================================================

import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

const DRY_RUN = process.argv.includes("--dry-run");
const QURAN_FILE = "data/tanzil/quran-uthmani.txt";
const TRANSLATION_FILE = "data/tanzil/ar.muyassar.txt";
const TOTAL_AYAHS = 6236;

const RESOURCE = {
  kind: "tafsir",
  language: "ar",
  name: "التفسير الميسر",
  author: "مجمع الملك فهد لطباعة المصحف الشريف",
  source: "tanzil.net/trans (ar.muyassar) — non-commercial use only",
};

const MOJIBAKE = /[ØÙÚÛ]|â€/; // signs of UTF-8 read as Windows-1252

function fail(msg) {
  console.error(`\n❌ ${msg}\n   Nothing was imported.`);
  process.exit(1);
}

// Read "sura|aya|text" lines, skipping comments (#) and empty lines
function readLines(file) {
  return readFileSync(file, "utf8")
    .replace(/^﻿/, "")
    .split(/\r?\n/)
    .filter((l) => l.trim() && !l.startsWith("#"))
    .map((line) => {
      const [s, a, ...rest] = line.split("|");
      const text = rest.join("|").trim();
      if (!s || !a || !text)
        fail(`Bad line in ${file}: "${line.slice(0, 60)}..."`);
      return { key: `${Number(s)}:${Number(a)}`, text };
    });
}

function build() {
  // Global ayah id (1..6236) = position in the Quran text file
  const quran = readLines(QURAN_FILE);
  if (quran.length !== TOTAL_AYAHS)
    fail(`${QURAN_FILE} has ${quran.length} ayahs, expected 6236.`);
  const idByKey = new Map(quran.map((q, i) => [q.key, i + 1]));

  const lines = readLines(TRANSLATION_FILE);
  if (lines.length !== TOTAL_AYAHS)
    fail(`${TRANSLATION_FILE} has ${lines.length} ayahs, expected 6236.`);

  const seen = new Set();
  const rows = lines.map((l, i) => {
    const ayahId = idByKey.get(l.key);
    if (!ayahId)
      fail(`Ayah ${l.key} in translation does not exist in the Quran text.`);
    if (ayahId !== i + 1) fail(`Order mismatch at ${l.key} (line ${i + 1}).`);
    if (seen.has(ayahId)) fail(`Duplicate ayah ${l.key}.`);
    if (MOJIBAKE.test(l.text))
      fail(
        `Ayah ${l.key} has a wrong encoding. Re-download ${TRANSLATION_FILE} with "Save link as".`,
      );
    if (!/[\u0600-\u06FF]/.test(l.text))
      fail(
        `Ayah ${l.key} is not in Arabic. ${TRANSLATION_FILE} is the wrong file — download the row "تفسير الميسر / King Fahad Quran Complex".`,
      );
    seen.add(ayahId);
    return { ayah_id: ayahId, text: l.text, key: l.key };
  });
  return rows;
}

async function main() {
  const rows = build();
  console.log("✅ Tafsir file is valid:");
  console.log(`   ayahs: ${rows.length}`);
  console.log(`   ${rows[0].key}  ${rows[0].text}`);
  console.log(`   ${rows.at(-1).key}  ${rows.at(-1).text}`);

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

  // Find the resource, or create it (safe to run again)
  const found = await supabase
    .from("resources")
    .select("id")
    .eq("kind", RESOURCE.kind)
    .eq("name", RESOURCE.name)
    .maybeSingle();
  if (found.error) fail(`Reading resources failed: ${found.error.message}`);

  let resourceId = found.data?.id;
  if (resourceId) {
    // Existing resource (e.g. from QuranEnc): switch its source to Tanzil
    const { error } = await supabase
      .from("resources")
      .update({ source: RESOURCE.source, author: RESOURCE.author })
      .eq("id", resourceId);
    if (error) fail(`Updating resource failed: ${error.message}`);
  } else {
    const created = await supabase
      .from("resources")
      .insert(RESOURCE)
      .select("id")
      .single();
    if (created.error)
      fail(`Creating resource failed: ${created.error.message}`);
    resourceId = created.data.id;
  }
  console.log(`\nResource "${RESOURCE.name}" → id ${resourceId}`);

  console.log("Importing...");
  const withId = rows.map(({ ayah_id, text }) => ({
    resource_id: resourceId,
    ayah_id,
    text,
  }));
  for (let i = 0; i < withId.length; i += 500) {
    const { error } = await supabase
      .from("ayah_resources")
      .upsert(withId.slice(i, i + 500));
    if (error) fail(`Insert failed: ${error.message}`);
    process.stdout.write(
      `\r   ayah_resources: ${Math.min(i + 500, withId.length)}/${withId.length}`,
    );
  }
  console.log();

  const { count, error } = await supabase
    .from("ayah_resources")
    .select("ayah_id", { count: "exact", head: true })
    .eq("resource_id", resourceId);
  if (error || count !== TOTAL_AYAHS)
    fail(`Database has ${count} translated ayahs, expected 6236.`);
  console.log(
    `\n✅ Done. ${count} ayahs with tafsir (${RESOURCE.name}, from Tanzil).`,
  );
}

main();
