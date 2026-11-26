/** @format */

"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";

// Font sizes for the Quran text (rem)
const SIZES = [1.5, 1.875, 2.25, 2.75, 3.25];
type Mode = "mushaf" | "cards";
type Prefs = { size: number; mode: Mode; translation: boolean };
const DEFAULTS: Prefs = { size: 2, mode: "mushaf", translation: true };
const STORAGE_KEY = "reader-prefs";

// Verse-by-verse recitation (one MP3 per ayah, named SSSAAA.mp3)
const AUDIO_BASE = "https://everyayah.com/data/Alafasy_128kbps";
const pad3 = (n: number) => String(n).padStart(3, "0");
const audioUrl = (surah: number, ayah: number) =>
  `${AUDIO_BASE}/${pad3(surah)}${pad3(ayah)}.mp3`;

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

function savePrefs(prefs: Prefs) {
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
        Number.isInteger(saved?.size) &&
        saved.size >= 0 &&
        saved.size < SIZES.length
          ? saved.size
          : DEFAULTS.size,
      mode: saved?.mode === "cards" ? "cards" : "mushaf",
      translation:
        typeof saved?.translation === "boolean"
          ? saved.translation
          : DEFAULTS.translation,
    };
  } catch {
    return DEFAULTS;
  }
}

// ---------- Component ----------
export function Reader({ children }: { children: React.ReactNode }) {
  const prefs = parsePrefs(
    useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot),
  );
  const update = (change: Partial<Prefs>) => savePrefs({ ...prefs, ...change });

  // ---- Audio: click an ayah to hear it ----
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const playingElRef = useRef<HTMLElement | null>(null);
  const [playing, setPlaying] = useState(false);

  function markPlaying(el: HTMLElement | null) {
    playingElRef.current?.classList.remove("is-playing");
    el?.classList.add("is-playing");
    playingElRef.current = el;
    setPlaying(el !== null);
  }

  function stop() {
    audioRef.current?.pause();
    markPlaying(null);
  }

  function getAudio() {
    if (!audioRef.current) {
      const audio = new Audio();
      audio.addEventListener("ended", () => markPlaying(null));
      audio.addEventListener("error", () => markPlaying(null));
      audioRef.current = audio;
    }
    return audioRef.current;
  }

  function playAyah(el: HTMLElement) {
    // Same ayah clicked again while playing -> stop
    if (playingElRef.current === el) {
      stop();
      return;
    }
    const surah = Number(
      el.closest<HTMLElement>("[data-surah]")?.dataset.surah,
    );
    const ayah = Number(el.dataset.ayah);
    if (!surah || !ayah) return;

    const audio = getAudio();
    audio.src = audioUrl(surah, ayah);
    markPlaying(el);
    audio.play().catch(() => markPlaying(null));
  }

  function handleClick(e: React.MouseEvent<HTMLDivElement>) {
    if (window.getSelection()?.toString()) return; // user is selecting text, not clicking
    const el = (e.target as HTMLElement).closest<HTMLElement>("[data-ayah]");
    if (el) playAyah(el);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLDivElement>) {
    if (e.key !== "Enter" && e.key !== " ") return;
    const el = (e.target as HTMLElement).closest<HTMLElement>("[data-ayah]");
    if (!el) return;
    e.preventDefault();
    playAyah(el);
  }

  // Stop the audio when leaving the page
  useEffect(() => {
    const holder = audioRef;
    return () => holder.current?.pause();
  }, []);

  return (
    <>
      <div
        className="reader"
        data-mode={prefs.mode}
        data-translation={prefs.translation ? "on" : "off"}
        style={
          { "--quran-size": `${SIZES[prefs.size]}rem` } as React.CSSProperties
        }
        onClick={handleClick}
        onKeyDown={handleKeyDown}>
        {children}
      </div>

      {/* Floating toolbar */}
      <div className="fixed bottom-6 left-1/2 z-40 -translate-x-1/2">
        <div className="glass flex items-center gap-1 rounded-full p-1.5 text-sm">
          {playing && (
            <>
              <ToolButton active onClick={stop} label="إيقاف التلاوة">
                <span className="text-accent">■</span> إيقاف
              </ToolButton>
              <span aria-hidden className="mx-1 h-5 w-px bg-white/15" />
            </>
          )}
          <ToolButton
            active={prefs.mode === "mushaf"}
            onClick={() => update({ mode: "mushaf" })}>
            مصحف
          </ToolButton>
          <ToolButton
            active={prefs.mode === "cards"}
            onClick={() => update({ mode: "cards" })}>
            بطاقات
          </ToolButton>
          {prefs.mode === "cards" && (
            <ToolButton
              active={prefs.translation}
              onClick={() => update({ translation: !prefs.translation })}>
              ترجمة
            </ToolButton>
          )}
          <span aria-hidden className="mx-1 h-5 w-px bg-white/15" />
          <ToolButton
            label="تكبير الخط"
            disabled={prefs.size === SIZES.length - 1}
            onClick={() => update({ size: prefs.size + 1 })}>
            A+
          </ToolButton>
          <ToolButton
            label="تصغير الخط"
            disabled={prefs.size === 0}
            onClick={() => update({ size: prefs.size - 1 })}>
            A−
          </ToolButton>
        </div>
      </div>
    </>
  );
}

function ToolButton({
  children,
  onClick,
  active = false,
  disabled = false,
  label,
}: {
  children: React.ReactNode;
  onClick: () => void;
  active?: boolean;
  disabled?: boolean;
  label?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      aria-pressed={label ? undefined : active}
      className={`rounded-full px-4 py-1.5 font-arabic transition duration-300 disabled:opacity-30 ${
        active
          ? "bg-white/15 text-white"
          : "text-white/50 hover:text-accent enabled:hover:bg-white/5"
      }`}>
      {children}
    </button>
  );
}
