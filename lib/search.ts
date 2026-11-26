/** @format */

import { cacheLife } from "next/cache";
import { supabasePublic } from "@/lib/supabase/public";

export type SearchResult = {
  id: number;
  surah_id: number;
  ayah_number: number;
  text_uthmani: string;
  surah_name: string;
  translation: string | null;
  total: number;
};

export const MAX_RESULTS = 50;

// Same query -> same results: cache them
export async function searchAyahs(
  q: string,
): Promise<{ results: SearchResult[]; total: number }> {
  "use cache";
  cacheLife("days");
  const { data, error } = await supabasePublic.rpc("search_ayahs", {
    q,
    max_results: MAX_RESULTS,
  });
  if (error) throw new Error(error.message);
  const results = (data ?? []) as SearchResult[];
  return { results, total: Number(results[0]?.total ?? 0) };
}
