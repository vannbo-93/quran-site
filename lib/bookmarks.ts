// Saved ayahs and surahs — kept in this browser only (no account needed)

import { useMemo, useSyncExternalStore } from "react";

export type AyahBookmark = { surah: number; ayah: number; surahName: string; text: string; at: number };
export type SurahBookmark = { surah: number; name: string; nameEn: string; at: number };
export type Bookmarks = { ayahs: AyahBookmark[]; surahs: SurahBookmark[] };

const KEY = "bookmarks";
const MAX_ITEMS = 500; // per list, oldest dropped first
const EMPTY: Bookmarks = { ayahs: [], surahs: [] };

const listeners = new Set<() => void>();
let memory = ""; // fallback when localStorage is unavailable

function subscribe(callback: () => void) {
  listeners.add(callback);
  window.addEventListener("storage", callback); // other tabs
  return () => {
    listeners.delete(callback);
    window.removeEventListener("storage", callback);
  };
}

function getSnapshot() {
  try {
    return localStorage.getItem(KEY) ?? memory;
  } catch {
    return memory;
  }
}

const validSurah = (n: unknown): n is number => Number.isInteger(n) && (n as number) >= 1 && (n as number) <= 114;

function parse(raw: string): Bookmarks {
  try {
    const v = JSON.parse(raw);
    const ayahs = (Array.isArray(v?.ayahs) ? v.ayahs : []).filter(
      (a: AyahBookmark) =>
        validSurah(a?.surah) && Number.isInteger(a?.ayah) && a.ayah >= 1 && typeof a?.text === "string",
    );
    const surahs = (Array.isArray(v?.surahs) ? v.surahs : []).filter(
      (s: SurahBookmark) => validSurah(s?.surah) && typeof s?.name === "string",
    );
    return { ayahs, surahs };
  } catch {
    return EMPTY;
  }
}

function save(data: Bookmarks) {
  memory = JSON.stringify({
    ayahs: data.ayahs.slice(0, MAX_ITEMS),
    surahs: data.surahs.slice(0, MAX_ITEMS),
  });
  try {
    localStorage.setItem(KEY, memory);
  } catch {
    // storage unavailable: keep in memory only
  }
  listeners.forEach((l) => l());
}

const current = () => parse(getSnapshot());

// ---------- Read ----------
export function useBookmarks(): Bookmarks {
  const raw = useSyncExternalStore(subscribe, getSnapshot, () => "");
  return useMemo(() => parse(raw), [raw]);
}

export const isAyahSaved = (data: Bookmarks, surah: number, ayah: number) =>
  data.ayahs.some((a) => a.surah === surah && a.ayah === ayah);

export const isSurahSaved = (data: Bookmarks, surah: number) => data.surahs.some((s) => s.surah === surah);

// ---------- Write (newest first). Each returns true if the item is now saved. ----------
export function toggleAyah(item: Omit<AyahBookmark, "at">): boolean {
  const data = current();
  if (isAyahSaved(data, item.surah, item.ayah)) {
    removeAyah(item.surah, item.ayah);
    return false;
  }
  save({ ...data, ayahs: [{ ...item, at: Date.now() }, ...data.ayahs] });
  return true;
}

export function toggleSurah(item: Omit<SurahBookmark, "at">): boolean {
  const data = current();
  if (isSurahSaved(data, item.surah)) {
    removeSurah(item.surah);
    return false;
  }
  save({ ...data, surahs: [{ ...item, at: Date.now() }, ...data.surahs] });
  return true;
}

export function removeAyah(surah: number, ayah: number) {
  const data = current();
  save({ ...data, ayahs: data.ayahs.filter((a) => !(a.surah === surah && a.ayah === ayah)) });
}

export function removeSurah(surah: number) {
  const data = current();
  save({ ...data, surahs: data.surahs.filter((s) => s.surah !== surah) });
}
