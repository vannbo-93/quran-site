-- =====================================================================
-- 004: Juz index
-- juz_starts(): the first ayah of each of the 30 juz
-- =====================================================================

CREATE OR REPLACE FUNCTION juz_starts()
RETURNS TABLE (juz smallint, surah_id smallint, ayah_number smallint, surah_name text, page smallint)
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  SELECT DISTINCT ON (a.juz) a.juz, a.surah_id, a.ayah_number, s.name_ar, a.page
  FROM ayahs a
  JOIN surahs s ON s.id = a.surah_id
  ORDER BY a.juz, a.id;
$$;

GRANT EXECUTE ON FUNCTION juz_starts() TO anon, authenticated;