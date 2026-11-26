/** @format */

import { cacheLife } from "next/cache";
import { supabasePublic } from "@/lib/supabase/public";

export type JuzStart = {
  juz: number;
  surah_id: number;
  ayah_number: number;
  surah_name: string;
  page: number;
};

export async function getJuzStarts(): Promise<JuzStart[]> {
  "use cache";
  cacheLife("max");
  const { data, error } = await supabasePublic.rpc("juz_starts");
  if (error) throw new Error(error.message);
  return (data ?? []) as JuzStart[];
}
