# Quran — القرآن الكريم

A modern Quran reading and listening website, built with **Next.js 16** and **Supabase**.
Uthmani script, verse-by-verse recitations from 17 reciters, English translation, Arabic tafsir, and Arabic/English search, in a dark glass-style interface designed for desktop and phones.

> Non-commercial project: no ads, no subscriptions.

<!-- Add a screenshot: save it as docs/screenshot.png and uncomment the line below -->
<!-- ![Surah page](docs/screenshot.png) -->

## Features

**Reading**
- 114 surahs in Uthmani script (Hafs ʿan ʿĀṣim)
- Two reading modes: continuous *Mushaf* text or one glass card per ayah
- Five font sizes, tuned separately for phones
- English translation (Saheeh International) and At-Tafsir Al-Muyassar, each with its own toggle
- Juz index and surah index
- "Continue reading": the last ayah read or heard is remembered in the browser

**Listening**
- 17 reciters from two sources:
  - **EveryAyah**: one file per ayah
  - **MP3Quran**: one file per surah with per-ayah timings, or whole-surah only
- Click any ayah to hear it; play the whole surah with auto-scroll and highlighting
- Live voice visualizer driven by the Web Audio API, with a CORS fallback
- Volume control

**Search and sharing**
- Arabic search that ignores diacritics and alef forms (`العالمين` finds `ٱلْعَـٰلَمِينَ`)
- English search inside the translation
- Deep links to any ayah: `/surah/2#ayah-255`
- Share an ayah: system share sheet on phones, clipboard on desktop

## Tech stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16 (App Router, Cache Components, `"use cache"`) |
| Language | TypeScript |
| Styling | Tailwind CSS v4 |
| Database | Supabase (PostgreSQL) with Row Level Security |
| Audio | HTML5 Audio + Web Audio API (`AnalyserNode`, `GainNode`) |
| Fonts | Amiri Quran, Readex Pro, Inter Tight, Instrument Serif (`next/font`) |

## How it works

- **Quran content is read-only.** RLS lets everyone read the Quran tables and nobody write to them through the API. Only the import scripts, using the secret key, can write.
- **Arabic search** runs in PostgreSQL. `arabic_normalize()` builds a search column without tashkeel, tatweel or alef, so both Uthmani and everyday spelling match. The basmala at the start of each surah is excluded from matches.
- **All 114 surah pages are prerendered** with `generateStaticParams` and cached with `cacheLife("max")`.
- **Per-ayah timings** for MP3Quran reciters are fetched on the server (`/api/audio-info`) and cached, so the browser never calls their API directly.

## Getting started

### 1. Install

```bash
git clone https://github.com/vannbo-93/quran-site.git
cd quran-site
npm install
```

### 2. Database (Supabase)

Run the migrations in order in the Supabase **SQL Editor**:

```
db/migrations/001_init.sql     tables, Arabic normalization, RLS policies
db/migrations/002_grants.sql   table privileges for Supabase roles
db/migrations/003_search.sql   search_ayahs() function
db/migrations/004_juz.sql      juz_starts() function
```

### 3. Environment variables

Create `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
SUPABASE_SECRET_KEY=sb_secret_...   # import scripts only, never exposed to the browser
```

### 4. Import the data

Download from [tanzil.net](https://tanzil.net) into `data/tanzil/`:
- `quran-uthmani.txt`: Uthmani text, *Text (with aya numbers)*
- `quran-data.js`: metadata (right-click, then *Save link as*)
- `en.sahih.txt`: Saheeh International, *Text (with aya numbers)*

Then run the scripts. Each one validates everything, including 114 surahs, 6236 ayahs and the text encoding, before writing anything:

```bash
node --env-file=.env.local scripts/import-quran.mjs --dry-run
node --env-file=.env.local scripts/import-quran.mjs
node --env-file=.env.local scripts/import-translation.mjs
node --env-file=.env.local scripts/import-tafsir.mjs
```

### 5. Run

```bash
npm run dev
```

## Data sources and licenses

| Content | Source | License / terms |
|---|---|---|
| Quran text (Uthmani) | [Tanzil Project](https://tanzil.net) | CC BY 3.0, verbatim, with attribution |
| English translation | Saheeh International, via [Tanzil](https://tanzil.net/trans/) | Non-commercial use only |
| At-Tafsir Al-Muyassar | King Fahd Complex, via [QuranEnc.com](https://quranenc.com) | QuranEnc terms: unmodified, credited, version cited |
| Verse-by-verse audio | [EveryAyah.com](https://everyayah.com) | |
| Surah audio and ayah timings | [MP3Quran.net](https://mp3quran.net) | |

The Quran text, translation and tafsir are displayed exactly as published. Nothing is modified.

## Author

**Mohamed El Aissaoui (VANNBO)**: [github.com/vannbo-93](https://github.com/vannbo-93)