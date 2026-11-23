/** @format */

import { cacheLife } from "next/cache";
import { supabasePublic } from "@/lib/supabase/public";

export type Surah = {
  id: number;
  name_ar: string;
  name_en: string;
  revelation_place: "makkah" | "madinah";
  ayah_count: number;
};

export type Ayah = { id: number; ayah_number: number; text_uthmani: string };

// The Quran text never changes, so cache it for as long as possible
export async function getSurahs(): Promise<Surah[]> {
  "use cache";
  cacheLife("max");
  const { data, error } = await supabasePublic
    .from("surahs")
    .select("*")
    .order("id");
  if (error) throw new Error(error.message);
  return data;
}

export async function getSurahWithAyahs(id: number) {
  "use cache";
  cacheLife("max");
  const [surah, ayahs] = await Promise.all([
    supabasePublic.from("surahs").select("*").eq("id", id).maybeSingle(),
    supabasePublic
      .from("ayahs")
      .select("id, ayah_number, text_uthmani")
      .eq("surah_id", id)
      .order("ayah_number"),
  ]);
  if (surah.error) throw new Error(surah.error.message);
  if (ayahs.error) throw new Error(ayahs.error.message);
  if (!surah.data) return null;
  return { surah: surah.data as Surah, ayahs: ayahs.data as Ayah[] };
}

// Basmala = text of Al-Fatihah 1:1, taken from the database itself
export async function getBasmala(): Promise<string> {
  "use cache";
  cacheLife("max");
  const { data, error } = await supabasePublic
    .from("ayahs")
    .select("text_uthmani")
    .eq("id", 1)
    .single();
  if (error) throw new Error(error.message);
  return data.text_uthmani;
}

// Tanzil puts the basmala at the start of ayah 1 of every surah except 1 and 9.
// We remove it for DISPLAY only — the stored text is never changed.
export function displayText(surahId: number, ayah: Ayah, basmala: string) {
  if (surahId === 1 || surahId === 9 || ayah.ayah_number !== 1)
    return ayah.text_uthmani;
  return ayah.text_uthmani.startsWith(basmala)
    ? ayah.text_uthmani.slice(basmala.length).trimStart()
    : ayah.text_uthmani;
}

export const toArabicDigits = (n: number) => n.toLocaleString("ar-EG");
