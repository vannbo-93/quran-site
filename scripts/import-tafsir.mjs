/** @format */

// =====================================================================
// Import At-Tafsir Al-Muyassar (Arabic) from QuranEnc.com into Supabase.
//
// Required file (already used by import-quran.mjs, for ayah order):
//   data/tanzil/quran-uthmani.txt
//
// Usage:
//   node --env-file=.env.local scripts/import-tafsir.mjs --dry-run
//   node --env-file=.env.local scripts/import-tafsir.mjs
//
// QuranEnc terms: no changes to the text, credit QuranEnc.com and the
// publisher, show the version number, no inappropriate ads.
// =====================================================================

import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

const DRY_RUN = process.argv.includes("--dry-run");
const QURAN_FILE = "data/tanzil/quran-uthmani.txt";
const KEY = "arabic_moyassar";
const API = "https://quranenc.com/api/v1";
const TOTAL_AYAHS = 6236;

function fail(msg) {
  console.error(`\n❌ ${msg}\n   Nothing was imported.`);
  process.exit(1);
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function getJson(url, tries = 3) {
  for (let attempt = 1; attempt <= tries; attempt++) {
    try {
      const res = await fetch(url);
      if (res.ok) return await res.json();
      if (res.status === 404) return null;
      throw new Error(`HTTP ${res.status}`);
    } catch (err) {
      if (attempt === tries) throw err;
      await sleep(1000 * attempt);
    }
  }
}

// Global ayah id (1..6236) by "sura:aya", from the Quran text file order
function ayahIds() {
  const lines = readFileSync(QURAN_FILE, "utf8")
    .replace(/^﻿/, "")
    .split(/\r?\n/)
    .filter((l) => l.trim() && !l.startsWith("#"));
  if (lines.length !== TOTAL_AYAHS)
    fail(`${QURAN_FILE} has ${lines.length} ayahs, expected 6236.`);
  return new Map(
    lines.map((line, i) => {
      const [s, a] = line.split("|");
      return [`${Number(s)}:${Number(a)}`, i + 1];
    }),
  );
}

async function getVersion() {
  try {
    const data = await getJson(`${API}/translations/list`);
    const entry = data?.translations?.find((t) => t.key === KEY);
    return entry?.version ?? null;
  } catch {
    return null;
  }
}

async function download(idByKey) {
  const rows = [];
  for (let sura = 1; sura <= 114; sura++) {
    const data = await getJson(`${API}/translation/sura/${KEY}/${sura}`);
    if (!Array.isArray(data?.result))
      fail(`No tafsir returned for surah ${sura}.`);
    for (const item of data.result) {
      const key = `${Number(item.sura)}:${Number(item.aya)}`;
      const ayahId = idByKey.get(key);
      if (!ayahId)
        fail(`Ayah ${key} from QuranEnc does not exist in the Quran text.`);
      const text = String(item.translation ?? "").trim();
      const footnotes = String(item.footnotes ?? "").trim();
      if (!text) fail(`Empty tafsir for ${key}.`);
      // Keep footnotes too: the terms forbid removing content
      rows.push({
        ayah_id: ayahId,
        text: footnotes ? `${text}\n${footnotes}` : text,
        key,
      });
    }
    process.stdout.write(`\r   downloaded: surah ${sura}/114`);
    await sleep(150); // be gentle with their server
  }
  console.log();
  return rows;
}

function validate(rows) {
  if (rows.length !== TOTAL_AYAHS)
    fail(`Got ${rows.length} ayahs, expected 6236.`);
  const seen = new Set();
  for (const r of rows) {
    if (seen.has(r.ayah_id)) fail(`Duplicate ayah ${r.key}.`);
    seen.add(r.ayah_id);
  }
}

async function main() {
  const idByKey = ayahIds();
  console.log("Downloading At-Tafsir Al-Muyassar from QuranEnc.com...");
  const version = await getVersion();
  const rows = await download(idByKey);
  validate(rows);

  console.log("✅ Tafsir is complete:");
  console.log(`   ayahs: ${rows.length}`);
  console.log(`   version: ${version ?? "unknown (check quranenc.com)"}`);
  console.log(`   1:1  ${rows[0].text.slice(0, 80)}...`);

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

  const RESOURCE = {
    kind: "tafsir",
    language: "ar",
    name: "التفسير الميسر",
    author: "مجمع الملك فهد لطباعة المصحف الشريف",
    source: `QuranEnc.com (${KEY})${version ? ` v${version}` : ""}`,
  };

  // Find or create the resource; keep its source (version) up to date
  const found = await supabase
    .from("resources")
    .select("id")
    .eq("kind", RESOURCE.kind)
    .eq("name", RESOURCE.name)
    .maybeSingle();
  if (found.error) fail(`Reading resources failed: ${found.error.message}`);

  let resourceId = found.data?.id;
  if (resourceId) {
    const { error } = await supabase
      .from("resources")
      .update({ source: RESOURCE.source })
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
    fail(`Database has ${count} tafsir rows, expected 6236.`);
  console.log(
    `\n✅ Done. ${count} ayahs with tafsir (${RESOURCE.name}${version ? ` v${version}` : ""}).`,
  );
}

main();
