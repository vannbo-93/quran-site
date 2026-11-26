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
type AudioGraph = { ctx: AudioContext; analyser: AnalyserNode };

export function Reader({ children }: { children: React.ReactNode }) {
  const prefs = parsePrefs(
    useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot),
  );
  const update = (change: Partial<Prefs>) => savePrefs({ ...prefs, ...change });

  // ---- Audio ----
  // Click an ayah -> hear it. Play button -> continue ayah after ayah.
  const readerRef = useRef<HTMLDivElement | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const preloadRef = useRef<HTMLAudioElement | null>(null);
  const playingElRef = useRef<HTMLElement | null>(null);
  const continuousRef = useRef(false);
  const graphRef = useRef<AudioGraph | null>(null); // live analyser for the visualizer
  const analyserRef = useRef<AnalyserNode | null>(null);
  const corsBlockedRef = useRef(false); // audio server refused cross-origin access
  const [playing, setPlaying] = useState(false);
  const [continuous, setContinuous] = useState(false);

  function setContinuousMode(on: boolean) {
    continuousRef.current = on;
    setContinuous(on);
  }

  function markPlaying(el: HTMLElement | null) {
    playingElRef.current?.classList.remove("is-playing");
    el?.classList.add("is-playing");
    playingElRef.current = el;
    setPlaying(el !== null);
  }

  function stop() {
    audioRef.current?.pause();
    markPlaying(null);
    setContinuousMode(false);
  }

  const urlFor = (el: HTMLElement) => {
    const surah = Number(
      el.closest<HTMLElement>("[data-surah]")?.dataset.surah,
    );
    const ayah = Number(el.dataset.ayah);
    return surah && ayah ? audioUrl(surah, ayah) : null;
  };

  const nextAyah = (el: HTMLElement | null) => {
    let next = el?.nextElementSibling ?? null;
    while (next && !(next instanceof HTMLElement && next.dataset.ayah))
      next = next.nextElementSibling;
    return next as HTMLElement | null;
  };

  // Scroll only when the ayah leaves the comfortable reading zone
  function keepInView(el: HTMLElement) {
    const rect = el.getBoundingClientRect();
    const zoneTop = window.innerHeight * 0.2;
    const zoneBottom = window.innerHeight * 0.65; // leave room for the floating controls
    if (rect.top >= zoneTop && rect.bottom <= zoneBottom) return;
    window.scrollTo({
      top: window.scrollY + rect.top - window.innerHeight * 0.3,
      behavior: "smooth",
    });
  }

  function handleEnded() {
    const next = continuousRef.current ? nextAyah(playingElRef.current) : null;
    if (next) {
      start(next);
      keepInView(next);
    } else {
      markPlaying(null);
      setContinuousMode(false);
    }
  }

  function handleError(audio: HTMLAudioElement) {
    // First failure with CORS on: the server may not allow cross-origin audio.
    // Fall back to a plain player (visualizer switches to a simulated animation).
    if (audio.crossOrigin && !corsBlockedRef.current) {
      corsBlockedRef.current = true;
      analyserRef.current = null;
      audioRef.current = createAudio(false);
      const el = playingElRef.current;
      if (el) start(el);
      return;
    }
    stop();
  }

  function createAudio(withCors: boolean) {
    const audio = new Audio();
    if (withCors) audio.crossOrigin = "anonymous";
    audio.addEventListener("ended", handleEnded);
    audio.addEventListener("error", () => handleError(audio));
    return audio;
  }

  // Connect the player to an analyser so the visualizer follows the reciter's voice
  function connectAnalyser(audio: HTMLAudioElement) {
    if (graphRef.current || corsBlockedRef.current) return;
    try {
      const ctx = new AudioContext();
      const source = ctx.createMediaElementSource(audio);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 64;
      analyser.smoothingTimeConstant = 0.75;
      source.connect(analyser);
      analyser.connect(ctx.destination);
      graphRef.current = { ctx, analyser };
      analyserRef.current = analyser;
    } catch {
      corsBlockedRef.current = true; // Web Audio unavailable: simulated animation
    }
  }

  function getAudio() {
    if (!audioRef.current) {
      audioRef.current = createAudio(!corsBlockedRef.current);
      connectAnalyser(audioRef.current);
    }
    return audioRef.current;
  }

  function start(el: HTMLElement) {
    const url = urlFor(el);
    if (!url) return;
    const audio = getAudio();
    graphRef.current?.ctx.resume();
    audio.src = url;
    markPlaying(el);
    audio.play().catch((err: unknown) => {
      // Only a browser block (autoplay policy) stops playback.
      // Load errors are handled by the "error" listener; AbortError just means the source changed.
      if (err instanceof DOMException && err.name === "NotAllowedError") stop();
    });

    // Warm the browser cache with the next ayah to avoid a gap
    const next = continuousRef.current ? nextAyah(el) : null;
    const nextUrl = next && urlFor(next);
    if (nextUrl) {
      const preload = new Audio();
      // Must match the main player, or the cached copy can't be reused with CORS
      if (!corsBlockedRef.current) preload.crossOrigin = "anonymous";
      preload.preload = "auto";
      preload.src = nextUrl;
      preloadRef.current = preload;
    }
  }

  function playAyah(el: HTMLElement) {
    // Same ayah clicked again while playing -> stop
    if (playingElRef.current === el) {
      stop();
      return;
    }
    start(el);
  }

  function playSurah() {
    const first = readerRef.current?.querySelector<HTMLElement>("[data-ayah]");
    if (!first) return;
    setContinuousMode(true);
    start(first);
    keepInView(first);
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

  // Stop the audio and release the audio engine when leaving the page
  useEffect(() => {
    const audioHolder = audioRef;
    const graphHolder = graphRef;
    return () => {
      audioHolder.current?.pause();
      graphHolder.current?.ctx.close();
    };
  }, []);

  return (
    <>
      <div
        ref={readerRef}
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

      {/* Floating controls */}
      <div className="fixed bottom-6 left-1/2 z-40 flex -translate-x-1/2 flex-col items-center gap-3">
        {/* Play button with voice visualizer */}
        <div className="flex items-center gap-3">
          <Visualizer analyserRef={analyserRef} active={playing} side="start" />
          <div className="relative">
            <button
              type="button"
              onClick={playing ? stop : playSurah}
              aria-label={playing ? "إيقاف التلاوة" : "تشغيل السورة"}
              className={`glass grid h-16 w-16 place-items-center rounded-full transition duration-300 hover:scale-105 ${
                playing
                  ? "text-accent shadow-[0_0_40px_rgba(56,189,248,0.35)]"
                  : "text-white"
              }`}>
              {playing ? <StopIcon /> : <PlayIcon />}
            </button>
          </div>
          <Visualizer analyserRef={analyserRef} active={playing} side="end" />
        </div>
        {continuous && (
          <p className="font-arabic text-xs text-white/40">تشغيل السورة</p>
        )}

        {/* Toolbar */}
        <div className="glass flex items-center gap-1 rounded-full p-1.5 text-sm">
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

// ---------- Voice visualizer ----------
const BAR_COUNT = 10;

function Visualizer({
  analyserRef,
  active,
  side,
}: {
  analyserRef: React.RefObject<AnalyserNode | null>;
  active: boolean;
  side: "start" | "end";
}) {
  const barsRef = useRef<(HTMLSpanElement | null)[]>([]);

  useEffect(() => {
    if (!active) return;
    const bars = barsRef.current;
    const data = new Uint8Array(32);
    let frame = 0;

    const tick = (time: number) => {
      const analyser = analyserRef.current;
      if (analyser) analyser.getByteFrequencyData(data);

      bars.forEach((bar, i) => {
        if (!bar) return;
        // Bars closest to the button use the strongest (voice) frequencies
        const fromCenter = side === "start" ? BAR_COUNT - 1 - i : i;
        const level = analyser
          ? data[1 + fromCenter] / 255
          : 0.25 +
            0.55 *
              Math.abs(Math.sin(time / 180 + fromCenter * 0.9)) *
              Math.abs(Math.sin(time / 470 + fromCenter)); // simulated
        bar.style.transform = `scaleY(${0.12 + level * 0.88})`;
        bar.style.opacity = String(0.35 + level * 0.65);
      });
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(frame);
      bars.forEach((bar) => {
        if (!bar) return;
        bar.style.transform = "scaleY(0.12)";
        bar.style.opacity = "0.35";
      });
    };
  }, [active, analyserRef, side]);

  return (
    <div
      aria-hidden
      className={`flex h-10 items-center gap-[3px] transition-opacity duration-500 ${active ? "opacity-100" : "opacity-0"}`}>
      {Array.from({ length: BAR_COUNT }, (_, i) => (
        <span
          key={i}
          ref={(el) => {
            barsRef.current[i] = el;
          }}
          className="h-full w-[3px] origin-center rounded-full bg-accent transition-transform duration-75"
          style={{ transform: "scaleY(0.12)", opacity: 0.35 }}
        />
      ))}
    </div>
  );
}

function PlayIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-6 w-6 translate-x-[1px] fill-current"
      aria-hidden>
      <path d="M8 5.5v13a1 1 0 0 0 1.5.86l10.5-6.5a1 1 0 0 0 0-1.72L9.5 4.64A1 1 0 0 0 8 5.5z" />
    </svg>
  );
}

function StopIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5 fill-current" aria-hidden>
      <rect x="6" y="6" width="12" height="12" rx="2" />
    </svg>
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
