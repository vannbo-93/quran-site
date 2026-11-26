-- =====================================================================
-- 003: Search
-- search_ayahs(q): Arabic search on the normalized text (tashkeel and
-- alef forms ignored), plus English search in the Saheeh International
-- translation when the query contains Latin letters.
-- Results where the query starts a word come first.
-- =====================================================================

CREATE OR REPLACE FUNCTION search_ayahs(q text, max_results int DEFAULT 50)
RETURNS TABLE (
  id smallint,
  surah_id smallint,
  ayah_number smallint,
  text_uthmani text,
  surah_name text,
  translation text,
  total bigint
)
LANGUAGE sql
STABLE
SET search_path = public, extensions
AS $$
  WITH params AS (
    SELECT
      arabic_normalize(trim(q)) AS nq,
      trim(q) AS raw,
      -- escape LIKE wildcards in the English query
      replace(replace(replace(trim(q), '\', '\\'), '%', '\%'), '_', '\_') AS like_q
  ),
  -- Tanzil puts the basmala at the start of ayah 1 of each surah: don't search it there
  basmala AS (
    SELECT text_search AS nb FROM ayahs WHERE id = 1
  ),
  tr AS (
    SELECT r.id
    FROM resources r
    WHERE r.kind = 'translation' AND r.name = 'Saheeh International'
    LIMIT 1
  ),
  candidates AS (
    SELECT
      a.id,
      a.surah_id,
      a.ayah_number,
      a.text_uthmani,
      s.name_ar AS surah_name,
      ar.text AS translation,
      CASE
        WHEN a.ayah_number = 1 AND a.surah_id NOT IN (1, 9) AND starts_with(a.text_search, b.nb)
          THEN substr(a.text_search, char_length(b.nb) + 1)
        ELSE a.text_search
      END AS hay
    FROM ayahs a
    JOIN surahs s ON s.id = a.surah_id
    CROSS JOIN basmala b
    LEFT JOIN ayah_resources ar
      ON ar.ayah_id = a.id AND ar.resource_id = (SELECT id FROM tr)
  ),
  matches AS (
    SELECT
      c.id, c.surah_id, c.ayah_number, c.text_uthmani, c.surah_name, c.translation,
      CASE WHEN strpos(' ' || c.hay, ' ' || p.nq) > 0 THEN 0 ELSE 1 END AS rank
    FROM candidates c
    CROSS JOIN params p
    WHERE char_length(p.nq) >= 2
      AND (
        strpos(c.hay, p.nq) > 0
        OR (p.raw ~ '[A-Za-z]' AND c.translation ILIKE '%' || p.like_q || '%')
      )
  )
  SELECT m.id, m.surah_id, m.ayah_number, m.text_uthmani, m.surah_name, m.translation,
         count(*) OVER () AS total
  FROM matches m
  ORDER BY m.rank, m.id
  LIMIT greatest(1, least(max_results, 100));
$$;

GRANT EXECUTE ON FUNCTION search_ayahs(text, int) TO anon, authenticated;