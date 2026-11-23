-- Table-level privileges for Supabase roles.
-- RLS policies (from 001) still decide WHICH rows each role can see.

GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;

-- Quran content: read-only for visitors and signed-in users
GRANT SELECT ON surahs, ayahs, resources, ayah_resources, reciters, ayah_audio
  TO anon, authenticated;

-- User data: signed-in users only (RLS limits them to their own rows)
GRANT SELECT, INSERT, UPDATE, DELETE ON bookmarks, reading_progress, user_settings
  TO authenticated;
GRANT USAGE ON SEQUENCE bookmarks_id_seq TO authenticated;

-- Import script (secret key) needs full access
GRANT ALL ON ALL TABLES    IN SCHEMA public TO service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO service_role;