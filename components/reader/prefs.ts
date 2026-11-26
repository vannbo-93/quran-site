import { useSyncExternalStore } from "react";
import { DEFAULT_RECITER, RECITERS } from "@/lib/reciters";

// Font sizes for the Quran text (rem)
export const SIZES = [1.5, 1.875, 2.25, 2.75, 3.25];

// Recitation speed range (pitch is preserved by the browser)
export const SPEED_MIN = 0.5;
export const SPEED_MAX = 1.75;
export const SPEED_STEP = 0.05;

export type Mode = "mushaf" | "cards";
export type Prefs = {
  size: number;
  mode: Mode;
  translation: boolean;
  tafsir: boolean;
  reciter: string;
  volume: number; // 0..1
  muted: boolean;
  speed: number; // playback rate
};
export type UpdatePrefs = (change: Partial<Prefs>) => void;

const DEFAULTS: Prefs = {
  size: 2,
  mode: "mushaf",
  translation: true,
  tafsir: false,
  reciter: DEFAULT_RECITER,
  volume: 1,
  muted: false,
  speed: 1,
};

const STORAGE_KEY = "reader-prefs";

// ---------- Tiny preferences store backed by localStorage ----------
const listeners = new Set<() => void>();
let memory = ""; // fallback when localStorage is unavailable

function subscribe(callback: () => void) {
  listeners.add(callback);
  window.addEventListener("storage", callback); // sync between tabs
  return () => {
    listeners.delete(callback);
    window.removeEventListener("storage", callback);
  };
}

function getSnapshot() {
  try {
    return localStorage.getItem(STORAGE_KEY) ?? memory;
  } catch {
    return memory;
  }
}

// On the server (and during hydration) use defaults
function getServerSnapshot() {
  return "";
}

export function savePrefs(prefs: Prefs) {
  memory = JSON.stringify(prefs);
  try {
    localStorage.setItem(STORAGE_KEY, memory);
  } catch {
    // storage unavailable: keep in memory only
  }
  listeners.forEach((l) => l());
}

function parsePrefs(raw: string): Prefs {
  try {
    const saved = JSON.parse(raw);
    return {
      size:
        Number.isInteger(saved?.size) && saved.size >= 0 && saved.size < SIZES.length
          ? saved.size
          : DEFAULTS.size,
      mode: saved?.mode === "cards" ? "cards" : "mushaf",
      translation: typeof saved?.translation === "boolean" ? saved.translation : DEFAULTS.translation,
      tafsir: typeof saved?.tafsir === "boolean" ? saved.tafsir : DEFAULTS.tafsir,
      reciter: RECITERS.some((r) => r.id === saved?.reciter) ? saved.reciter : DEFAULTS.reciter,
      volume:
        typeof saved?.volume === "number" && saved.volume >= 0 && saved.volume <= 1 ? saved.volume : DEFAULTS.volume,
      muted: typeof saved?.muted === "boolean" ? saved.muted : DEFAULTS.muted,
      speed:
        typeof saved?.speed === "number" && saved.speed >= SPEED_MIN && saved.speed <= SPEED_MAX
          ? saved.speed
          : DEFAULTS.speed,
    };
  } catch {
    return DEFAULTS;
  }
}

// Current reader preferences (re-renders when they change, in this tab or another)
export function usePrefs(): Prefs {
  return parsePrefs(useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot));
}
