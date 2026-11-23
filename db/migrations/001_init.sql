-- =====================================================================
-- Quran reader - Supabase schema
-- Run once: Supabase Dashboard > SQL Editor > paste > Run
-- Part 1: Quran content (read-only, imported once from a trusted source)
-- Part 2: User data (bookmarks, reading progress)
-- =====================================================================

CREATE EXTENSION IF NOT EXISTS pg_trgm WITH SCHEMA extensions;  -- fast substring search

-- ---------------------------------------------------------------------
-- Arabic search key: strips tashkeel, tatweel and Quranic marks,
-- unifies yaa / taa marbuta forms, and REMOVES every alef.
-- Why remove alef: Uthmani script writes many alefs as a small dagger
-- alef (العٰلمين) while users type العالمين, and the opposite for words
-- like الرحمن / هذا. Dropping alef on both sides makes them match.
-- Used for search only; the original Uthmani text is never modified.
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION arabic_normalize(t text)
RETURNS text
LANGUAGE sql
IMMUTABLE PARALLEL SAFE
AS $$
  SELECT translate(
           regexp_replace(t, '[\u064B-\u065F\u0670\u0640\u06D6-\u06ED]', '', 'g'),
           'ىةاأإآٱ',
           'يه'
         );
$$;

-- =====================================================================
-- PART 1: QURAN CONTENT
-- =====================================================================

CREATE TABLE surahs (
  id               smallint PRIMARY KEY CHECK (id BETWEEN 1 AND 114),
  name_ar          text     NOT NULL,
  name_en          text     NOT NULL,
  revelation_place text     NOT NULL CHECK (revelation_place IN ('makkah', 'madinah')),
  ayah_count       smallint NOT NULL CHECK (ayah_count > 0)
);

CREATE TABLE ayahs (
  id            smallint PRIMARY KEY CHECK (id BETWEEN 1 AND 6236), -- global ayah number
  surah_id      smallint NOT NULL REFERENCES surahs(id),
  ayah_number   smallint NOT NULL CHECK (ayah_number > 0),
  text_uthmani  text     NOT NULL,
  text_search   text     GENERATED ALWAYS AS (arabic_normalize(text_uthmani)) STORED,
  page          smallint NOT NULL CHECK (page BETWEEN 1 AND 604),
  juz           smallint NOT NULL CHECK (juz BETWEEN 1 AND 30),
  hizb_quarter  smallint NOT NULL CHECK (hizb_quarter BETWEEN 1 AND 240),
  UNIQUE (surah_id, ayah_number)
);

CREATE INDEX ayahs_page_idx   ON ayahs (page);
CREATE INDEX ayahs_juz_idx    ON ayahs (juz);
CREATE INDEX ayahs_search_idx ON ayahs USING gin (text_search extensions.gin_trgm_ops);

-- Translations & tafsir share one structure
CREATE TABLE resources (
  id        serial PRIMARY KEY,
  kind      text NOT NULL CHECK (kind IN ('translation', 'tafsir')),
  language  text NOT NULL,          -- 'ar', 'en', 'fr' ...
  name      text NOT NULL,          -- e.g. 'Saheeh International', 'التفسير الميسر'
  author    text,
  source    text NOT NULL           -- where the data came from (license / attribution)
);

CREATE TABLE ayah_resources (
  resource_id integer  NOT NULL REFERENCES resources(id) ON DELETE CASCADE,
  ayah_id     smallint NOT NULL REFERENCES ayahs(id),
  text        text     NOT NULL,
  PRIMARY KEY (resource_id, ayah_id)
);

-- Reciters & audio
CREATE TABLE reciters (
  id        serial PRIMARY KEY,
  name_ar   text NOT NULL,
  name_en   text NOT NULL,
  style     text,                   -- 'murattal', 'mujawwad' ...
  base_url  text NOT NULL           -- audio URL prefix, file name built from surah/ayah
);

CREATE TABLE ayah_audio (
  reciter_id  integer  NOT NULL REFERENCES reciters(id) ON DELETE CASCADE,
  ayah_id     smallint NOT NULL REFERENCES ayahs(id),
  duration_ms integer  CHECK (duration_ms > 0),
  -- word timings for later: [[word_position, start_ms, end_ms], ...]
  segments    jsonb,
  PRIMARY KEY (reciter_id, ayah_id)
);

-- =====================================================================
-- PART 2: USER DATA (linked to Supabase Auth)
-- =====================================================================

CREATE TABLE bookmarks (
  id         bigserial PRIMARY KEY,
  user_id    uuid     NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  ayah_id    smallint NOT NULL REFERENCES ayahs(id),
  note       text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, ayah_id)
);

CREATE TABLE reading_progress (
  user_id      uuid     PRIMARY KEY DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  last_ayah_id smallint NOT NULL REFERENCES ayahs(id),
  updated_at   timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE user_settings (
  user_id        uuid     PRIMARY KEY DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  font_size      smallint NOT NULL DEFAULT 3 CHECK (font_size BETWEEN 1 AND 10),
  theme          text     NOT NULL DEFAULT 'light' CHECK (theme IN ('light', 'dark', 'sepia')),
  translation_id integer  REFERENCES resources(id),
  reciter_id     integer  REFERENCES reciters(id)
);

-- =====================================================================
-- ROW LEVEL SECURITY
-- Quran content: everyone can READ, nobody can write through the API.
--   (Imports are done from the SQL Editor or with the service_role key,
--    which bypasses RLS.)
-- User data: each signed-in user sees and edits only their own rows.
-- =====================================================================

ALTER TABLE surahs          ENABLE ROW LEVEL SECURITY;
ALTER TABLE ayahs           ENABLE ROW LEVEL SECURITY;
ALTER TABLE resources       ENABLE ROW LEVEL SECURITY;
ALTER TABLE ayah_resources  ENABLE ROW LEVEL SECURITY;
ALTER TABLE reciters        ENABLE ROW LEVEL SECURITY;
ALTER TABLE ayah_audio      ENABLE ROW LEVEL SECURITY;

CREATE POLICY "public read" ON surahs         FOR SELECT USING (true);
CREATE POLICY "public read" ON ayahs          FOR SELECT USING (true);
CREATE POLICY "public read" ON resources      FOR SELECT USING (true);
CREATE POLICY "public read" ON ayah_resources FOR SELECT USING (true);
CREATE POLICY "public read" ON reciters       FOR SELECT USING (true);
CREATE POLICY "public read" ON ayah_audio     FOR SELECT USING (true);

ALTER TABLE bookmarks        ENABLE ROW LEVEL SECURITY;
ALTER TABLE reading_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_settings    ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own rows" ON bookmarks
  FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE POLICY "own rows" ON reading_progress
  FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE POLICY "own rows" ON user_settings
  FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());