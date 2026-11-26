/** @format */

// Last reading position, saved in this browser only (no account needed)

export type LastRead = {
  surah: number;
  ayah: number;
  surahName: string;
  at: number;
};

const KEY = "last-read";
const listeners = new Set<() => void>();
let memory = ""; // fallback when localStorage is unavailable

export function subscribeLastRead(callback: () => void) {
  listeners.add(callback);
  window.addEventListener("storage", callback); // other tabs
  return () => {
    listeners.delete(callback);
    window.removeEventListener("storage", callback);
  };
}

export function getLastReadSnapshot() {
  try {
    return localStorage.getItem(KEY) ?? memory;
  } catch {
    return memory;
  }
}

export function saveLastRead(position: Omit<LastRead, "at">) {
  if (!Number.isInteger(position.surah) || !Number.isInteger(position.ayah))
    return;
  memory = JSON.stringify({ ...position, at: Date.now() });
  try {
    localStorage.setItem(KEY, memory);
  } catch {
    // storage unavailable: keep in memory only
  }
  listeners.forEach((l) => l());
}

export function parseLastRead(raw: string): LastRead | null {
  try {
    const v = JSON.parse(raw);
    const ok =
      Number.isInteger(v?.surah) &&
      v.surah >= 1 &&
      v.surah <= 114 &&
      Number.isInteger(v?.ayah) &&
      v.ayah >= 1 &&
      typeof v?.surahName === "string";
    return ok ? (v as LastRead) : null;
  } catch {
    return null;
  }
}
