-- ============================================================
-- 006_tajweed.sql — tajweed color annotations per ayah
-- ============================================================
-- ayahs.tajweed: [[start, end, "rule"], ...]
--   start/end = character offsets inside ayahs.text_uthmani (end excluded).
--   NULL = no verified annotations for this ayah (shown without colors).
-- The Quran text itself is never changed: colors are applied at display time.
-- Source: cpfair/quran-tajweed (CC BY 4.0), re-aligned to this site's Tanzil text.

ALTER TABLE public.ayahs ADD COLUMN IF NOT EXISTS tajweed jsonb;

-- Bulk update used by scripts/import-tajweed.mjs (service role only)
CREATE OR REPLACE FUNCTION public.set_tajweed(rows jsonb)
RETURNS integer
LANGUAGE sql
SET search_path = ''
AS $$
  WITH upd AS (
    UPDATE public.ayahs AS a
    SET tajweed = r.tajweed
    FROM jsonb_to_recordset(rows) AS r(id integer, tajweed jsonb)
    WHERE a.id = r.id
    RETURNING 1
  )
  SELECT count(*)::integer FROM upd;
$$;

REVOKE EXECUTE ON FUNCTION public.set_tajweed(jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.set_tajweed(jsonb) TO service_role;

NOTIFY pgrst, 'reload schema';
