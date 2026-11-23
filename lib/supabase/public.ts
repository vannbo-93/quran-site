/** @format */

import { createClient } from "@supabase/supabase-js";

// For public Quran content only (no user session needed)
export const supabasePublic = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
);
