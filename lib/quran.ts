import { cacheLife } from "next/cache";
import { supabasePublic } from "@/lib/supabase/public";
import type { TajweedAnnotation } from "@/lib/tajweed";

export type Surah = {
  id: number;
  name_ar: string;
  name_en: string;
  revelation_place: "makkah" | "madinah";
  ayah_count: number;
};

export type Ayah = {
  id: number;
  ayah_number: number;
  text_uthmani: string;
  translation: string | null;
  tafsir: string | null;
  tajweed: TajweedAnnotation[] | null;
};

// The Quran text never changes, so cache it for as long as possible
export async function getSurahs(): Promise<Surah[]> {
  "use cache";
  cacheLife("max");
  const { data, error } = await supabasePublic.from("surahs").select("*").order("id");
  if (error) throw new Error(error.message);
  return data;
}

// id of a translation / tafsir in the "resources" table (null if not imported yet)
async function getResourceId(kind: "translation" | "tafsir", name: string): Promise<number | null> {
  "use cache";
  cacheLife("max");
  const { data, error } = await supabasePublic
    .from("resources")
    .select("id")
    .eq("kind", kind)
    .eq("name", name)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data?.id ?? null;
}

export const getTranslationId = () => getResourceId("translation", "Saheeh International");
export const getTafsirId = () => getResourceId("tafsir", "التفسير الميسر");

export async function getSurahWithAyahs(id: number) {
  "use cache";
  cacheLife("max");
  const [translationId, tafsirId] = await Promise.all([getTranslationId(), getTafsirId()]);
  const resourceIds = [translationId, tafsirId].filter((x): x is number => x !== null);

  const ayahsQuery = supabasePublic
    .from("ayahs")
    .select("id, ayah_number, text_uthmani, tajweed, ayah_resources(resource_id, text)")
    .eq("surah_id", id)
    .in("ayah_resources.resource_id", resourceIds.length ? resourceIds : [-1])
    .order("ayah_number");

  const [surah, ayahs] = await Promise.all([
    supabasePublic.from("surahs").select("*").eq("id", id).maybeSingle(),
    ayahsQuery,
  ]);
  if (surah.error) throw new Error(surah.error.message);
  if (ayahs.error) throw new Error(ayahs.error.message);
  if (!surah.data) return null;

  type Row = {
    id: number;
    ayah_number: number;
    text_uthmani: string;
    tajweed: TajweedAnnotation[] | null;
    ayah_resources: { resource_id: number; text: string }[] | null;
  };
  const textOf = (row: Row, resourceId: number | null) =>
    row.ayah_resources?.find((r) => r.resource_id === resourceId)?.text ?? null;

  return {
    surah: surah.data as Surah,
    ayahs: (ayahs.data as Row[]).map((a) => ({
      id: a.id,
      ayah_number: a.ayah_number,
      text_uthmani: a.text_uthmani,
      translation: textOf(a, translationId),
      tafsir: textOf(a, tafsirId),
      tajweed: a.tajweed,
    })) as Ayah[],
  };
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
export function displayText(surahId: number, ayah: Pick<Ayah, "ayah_number" | "text_uthmani">, basmala: string) {
  if (surahId === 1 || surahId === 9 || ayah.ayah_number !== 1) return ayah.text_uthmani;
  return ayah.text_uthmani.startsWith(basmala)
    ? ayah.text_uthmani.slice(basmala.length).trimStart()
    : ayah.text_uthmani;
}

export const toArabicDigits = (n: number) => n.toLocaleString("ar-EG");
