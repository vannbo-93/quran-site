/** @format */

"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import {
  DEFAULT_RECITER,
  RECITERS,
  everyAyahUrl,
  getReciter,
  type AudioInfo,
  type Reciter,
} from "@/lib/reciters";
import { saveLastRead } from "@/lib/lastRead";

// Font sizes for the Quran text (rem)
const SIZES = [1.5, 1.875, 2.25, 2.75, 3.25];
type Mode = "mushaf" | "cards";
type Prefs = {
  size: number;
  mode: Mode;
  translation: boolean;
  tafsir: boolean;
  reciter: string;
  volume: number; // 0..1
  muted: boolean;
};
const DEFAULTS: Prefs = {
  size: 2,
  mode: "mushaf",
  translation: true,
  tafsir: false,
  reciter: DEFAULT_RECITER,
  volume: 1,
  muted: false,
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
      tafsir:
        typeof saved?.tafsir === "boolean" ? saved.tafsir : DEFAULTS.tafsir,
      reciter: RECITERS.some((r) => r.id === saved?.reciter)
        ? saved.reciter
        : DEFAULTS.reciter,
      volume:
        typeof saved?.volume === "number" &&
        saved.volume >= 0 &&
        saved.volume <= 1
          ? saved.volume
          : DEFAULTS.volume,
      muted: typeof saved?.muted === "boolean" ? saved.muted : DEFAULTS.muted,
    };
  } catch {
    return DEFAULTS;
  }
}

// ---------- Playback session ----------
// "ayah": EveryAyah, one file per ayah.
// "file": mp3quran, one file per surah (with or without per-ayah timings).
type Session =
  | { kind: "ayah" }
  | { kind: "file"; info: AudioInfo; stopAt: number | null };
type AudioGraph = { ctx: AudioContext; analyser: AnalyserNode; gain: GainNode };

const hostOf = (url: string) => {
  try {
    return new URL(url).host;
  } catch {
    return "";
  }
};

// Save an ayah element as the last read position
function rememberPosition(el: HTMLElement) {
  const holder = el.closest<HTMLElement>("[data-surah]");
  saveLastRead({
    surah: Number(holder?.dataset.surah),
    ayah: Number(el.dataset.ayah),
    surahName: holder?.dataset.surahName ?? "",
  });
}

// ---------- Component ----------
export function Reader({ children }: { children: React.ReactNode }) {
  const prefs = parsePrefs(
    useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot),
  );
  const update = (change: Partial<Prefs>) => {
    const next = { ...prefs, ...change };
    savePrefs(next);
    if ("volume" in change || "muted" in change)
      applyVolume(next.muted ? 0 : next.volume);
  };

  const readerRef = useRef<HTMLDivElement | null>(null);

  // Two players: one connected to the analyser (needs CORS), one plain fallback
  const corsAudioRef = useRef<HTMLAudioElement | null>(null);
  const plainAudioRef = useRef<HTMLAudioElement | null>(null);
  const activeAudioRef = useRef<HTMLAudioElement | null>(null);
  const graphRef = useRef<AudioGraph | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const blockedHostsRef = useRef(new Set<string>()); // hosts that refused CORS
  const preloadRef = useRef<HTMLAudioElement | null>(null);

  const sessionRef = useRef<Session | null>(null);
  const playingElRef = useRef<HTMLElement | null>(null);
  const continuousRef = useRef(false);
  const retryRef = useRef<(() => void) | null>(null); // replays the last request after a CORS fallback
  const requestIdRef = useRef(0); // ignores stale async results
  const watchRef = useRef(0); // requestAnimationFrame id
  const infoCacheRef = useRef(new Map<string, Promise<AudioInfo>>());
  const noticeTimerRef = useRef(0);

  const [playing, setPlaying] = useState(false);
  const [continuous, setContinuous] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  // Popover menus above the toolbar
  const toolbarRef = useRef<HTMLDivElement | null>(null);
  const [menu, setMenu] = useState<null | "reciter" | "display">(null);
  const toggleMenu = (name: "reciter" | "display") =>
    setMenu((m) => (m === name ? null : name));

  // Close menus on outside click or Escape
  useEffect(() => {
    if (!menu) return;
    const onPointerDown = (e: PointerEvent) => {
      if (!toolbarRef.current?.contains(e.target as Node)) setMenu(null);
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMenu(null);
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [menu]);

  // ---- small helpers ----
  function showNotice(message: string) {
    setNotice(message);
    window.clearTimeout(noticeTimerRef.current);
    noticeTimerRef.current = window.setTimeout(() => setNotice(null), 4500);
  }

  function setContinuousMode(on: boolean) {
    continuousRef.current = on;
    setContinuous(on);
  }

  function highlight(el: HTMLElement | null) {
    if (playingElRef.current === el) return;
    playingElRef.current?.classList.remove("is-playing");
    el?.classList.add("is-playing");
    playingElRef.current = el;
    if (el) rememberPosition(el); // listening counts as reading
  }

  // Read from the DOM so audio callbacks always see the current values
  const currentReciter = (): Reciter =>
    getReciter(readerRef.current?.dataset.reciter ?? DEFAULT_RECITER);
  const currentSurah = () =>
    Number(
      readerRef.current?.querySelector<HTMLElement>("[data-surah]")?.dataset
        .surah,
    );
  const ayahEl = (n: number) =>
    readerRef.current?.querySelector<HTMLElement>(`[data-ayah="${n}"]`) ?? null;

  // Volume is read from the DOM so newly created players get the current value
  const currentVolume = () => {
    const v = Number(readerRef.current?.dataset.volume);
    return Number.isFinite(v) ? Math.min(1, Math.max(0, v)) : 1;
  };

  function applyVolume(v: number) {
    // CORS player: volume goes through the gain node (after the analyser, so the bars keep moving)
    if (graphRef.current) graphRef.current.gain.gain.value = v;
    if (plainAudioRef.current) plainAudioRef.current.volume = v;
  }

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

  // ---- players ----
  function createAudio(withCors: boolean) {
    const audio = new Audio();
    if (withCors) audio.crossOrigin = "anonymous";
    audio.addEventListener("ended", handleEnded);
    audio.addEventListener("error", () => handleError(audio));
    return audio;
  }

  function getCorsAudio() {
    if (!corsAudioRef.current) {
      const audio = createAudio(true);
      corsAudioRef.current = audio;
      try {
        const ctx = new AudioContext();
        const source = ctx.createMediaElementSource(audio);
        const analyser = ctx.createAnalyser();
        analyser.fftSize = 64;
        analyser.smoothingTimeConstant = 0.75;
        const gain = ctx.createGain();
        gain.gain.value = currentVolume();
        source.connect(analyser);
        analyser.connect(gain);
        gain.connect(ctx.destination);
        graphRef.current = { ctx, analyser, gain };
      } catch {
        // Web Audio unavailable: the visualizer uses a simulated animation
      }
    }
    return corsAudioRef.current;
  }

  function getPlainAudio() {
    if (!plainAudioRef.current) {
      plainAudioRef.current = createAudio(false);
      plainAudioRef.current.volume = currentVolume();
    }
    return plainAudioRef.current;
  }

  // Pick the player for this URL and make it the active one
  function pickAudio(url: string) {
    const blocked = blockedHostsRef.current.has(hostOf(url));
    const audio = blocked ? getPlainAudio() : getCorsAudio();
    if (activeAudioRef.current && activeAudioRef.current !== audio)
      activeAudioRef.current.pause();
    activeAudioRef.current = audio;
    analyserRef.current = !blocked
      ? (graphRef.current?.analyser ?? null)
      : null;
    return audio;
  }

  function playUrl(url: string, startSeconds: number, retry: () => void) {
    retryRef.current = retry;
    const audio = pickAudio(url);
    graphRef.current?.ctx.resume();

    if (audio.src !== url) audio.src = url;
    const seek = () => {
      if (startSeconds > 0 || audio.currentTime > 0)
        audio.currentTime = startSeconds;
    };
    if (audio.readyState >= 1) seek();
    else audio.addEventListener("loadedmetadata", seek, { once: true });

    setPlaying(true);
    audio.play().catch((err: unknown) => {
      // Only a browser block (autoplay policy) stops playback.
      // Load errors are handled by the "error" listener; AbortError just means the source changed.
      if (err instanceof DOMException && err.name === "NotAllowedError") stop();
    });
  }

  function stop() {
    requestIdRef.current++;
    activeAudioRef.current?.pause();
    cancelAnimationFrame(watchRef.current);
    sessionRef.current = null;
    highlight(null);
    setPlaying(false);
    setContinuousMode(false);
  }

  function handleError(audio: HTMLAudioElement) {
    // The CORS player failed: the server may refuse cross-origin access.
    // Remember the host and replay with the plain player (no live visualizer for it).
    if (audio === corsAudioRef.current) {
      const host = hostOf(audio.src);
      if (host && !blockedHostsRef.current.has(host)) {
        blockedHostsRef.current.add(host);
        retryRef.current?.();
        return;
      }
    }
    stop();
    showNotice("تعذّر تشغيل التلاوة");
  }

  function handleEnded() {
    const session = sessionRef.current;
    if (session?.kind === "ayah" && continuousRef.current) {
      const next = nextAyah(playingElRef.current);
      if (next) {
        startEveryAyah(next);
        keepInView(next);
        return;
      }
    }
    stop();
  }

  // ---- EveryAyah: one file per ayah ----
  function startEveryAyah(el: HTMLElement) {
    const reciter = currentReciter();
    if (reciter.kind !== "ayah") return;
    const surah = currentSurah();
    const ayah = Number(el.dataset.ayah);
    if (!surah || !ayah) return;

    sessionRef.current = { kind: "ayah" };
    cancelAnimationFrame(watchRef.current);
    highlight(el);
    const url = everyAyahUrl(reciter.folder, surah, ayah);
    playUrl(url, 0, () => startEveryAyah(el));

    // Warm the browser cache with the next ayah to avoid a gap
    const next = continuousRef.current ? nextAyah(el) : null;
    if (next) {
      const nextUrl = everyAyahUrl(
        reciter.folder,
        surah,
        Number(next.dataset.ayah),
      );
      const preload = new Audio();
      // Must match the main player, or the cached copy can't be reused with CORS
      if (!blockedHostsRef.current.has(hostOf(nextUrl)))
        preload.crossOrigin = "anonymous";
      preload.preload = "auto";
      preload.src = nextUrl;
      preloadRef.current = preload;
    }
  }

  // ---- mp3quran: one file per surah ----
  function loadInfo(reciterId: string, surah: number) {
    const key = `${reciterId}:${surah}`;
    let info = infoCacheRef.current.get(key);
    if (!info) {
      const unavailable = (): AudioInfo => {
        infoCacheRef.current.delete(key); // don't remember failures: retry next time
        return { available: false };
      };
      info = fetch(
        `/api/audio-info?reciter=${encodeURIComponent(reciterId)}&surah=${surah}`,
      )
        .then((res) =>
          res.ok ? (res.json() as Promise<AudioInfo>) : unavailable(),
        )
        .catch(unavailable);
      infoCacheRef.current.set(key, info);
    }
    return info;
  }

  function startFile(
    info: AudioInfo,
    startMs: number,
    stopAt: number | null,
    el: HTMLElement | null,
  ) {
    if (!info.url) return;
    sessionRef.current = { kind: "file", info, stopAt };
    highlight(el);
    playUrl(info.url, startMs / 1000, () =>
      startFile(info, startMs, stopAt, el),
    );
    watchFile();
  }

  // Follow the playback position: highlight the current ayah, stop after a single ayah
  function watchFile() {
    cancelAnimationFrame(watchRef.current);
    const tick = () => {
      const session = sessionRef.current;
      const audio = activeAudioRef.current;
      if (!session || session.kind !== "file" || !audio) return;

      const ms = audio.currentTime * 1000;
      if (session.stopAt !== null && ms >= session.stopAt) {
        stop();
        return;
      }
      const timing = session.info.timings?.find(
        (t) => ms >= t.start && ms < t.end,
      );
      if (timing) {
        const el = ayahEl(timing.ayah);
        if (el && el !== playingElRef.current) {
          highlight(el);
          if (continuousRef.current) keepInView(el);
        }
      }
      watchRef.current = requestAnimationFrame(tick);
    };
    watchRef.current = requestAnimationFrame(tick);
  }

  // ---- entry points ----
  async function play(
    el: HTMLElement,
    fromStart: boolean,
    continuousPlay: boolean,
  ) {
    const reciter = currentReciter();
    setNotice(null);

    if (reciter.kind === "ayah") {
      requestIdRef.current++;
      setContinuousMode(continuousPlay);
      startEveryAyah(el);
      if (continuousPlay) keepInView(el);
      return;
    }

    // Whole-surah reciters have no ayah timings: only the play button works
    if (reciter.kind === "surah" && !fromStart) {
      showNotice(`${reciter.name}: متوفر بالسورة كاملة فقط، استعمل زر التشغيل`);
      return;
    }

    const requestId = ++requestIdRef.current;
    const surah = currentSurah();
    const info = await loadInfo(reciter.id, surah);
    if (requestId !== requestIdRef.current) return; // another click happened meanwhile

    if (!info.available || !info.url) {
      stop();
      showNotice(`هذه السورة غير متوفرة بصوت ${reciter.name}`);
      return;
    }

    setContinuousMode(continuousPlay);

    if (reciter.kind === "surah" || fromStart) {
      startFile(info, 0, null, null); // whole surah from the beginning (includes the basmala)
      return;
    }

    const timing = info.timings?.find(
      (t) => t.ayah === Number(el.dataset.ayah),
    );
    if (!timing) {
      showNotice("توقيت هذه الآية غير متوفر");
      return;
    }
    startFile(info, timing.start, continuousPlay ? null : timing.end, el);
    if (continuousPlay) keepInView(el);
  }

  function playSurah() {
    const first = readerRef.current?.querySelector<HTMLElement>("[data-ayah]");
    if (first) play(first, true, true);
  }

  function handleAyah(el: HTMLElement) {
    // Same ayah clicked again while playing -> stop
    if (playing && playingElRef.current === el) {
      stop();
      return;
    }
    play(el, false, continuousRef.current);
  }

  // Share an ayah: phones open the share sheet, computers copy to the clipboard
  async function shareAyah(el: HTMLElement) {
    const holder = el.closest<HTMLElement>("[data-surah]");
    const surah = holder?.dataset.surah;
    const name = holder?.dataset.surahName ?? "";
    const ayah = el.dataset.ayah;
    const text = el.querySelector(".ayah-text")?.textContent?.trim() ?? "";
    const url = `${window.location.origin}/surah/${surah}#ayah-${ayah}`;
    const body = `${text}\n﴿${name} ${ayah}﴾\n${url}`;

    const isTouch = window.matchMedia("(pointer: coarse)").matches;
    if (isTouch && navigator.share) {
      try {
        await navigator.share({ text: body });
      } catch {
        // user closed the share sheet
      }
      return;
    }
    try {
      await navigator.clipboard.writeText(body);
      showNotice("تم نسخ الآية مع رابطها");
    } catch {
      showNotice("تعذّر النسخ");
    }
  }

  function handleClick(e: React.MouseEvent<HTMLDivElement>) {
    const shareButton = (e.target as HTMLElement).closest<HTMLElement>(
      "[data-share]",
    );
    if (shareButton) {
      const el = shareButton.closest<HTMLElement>("[data-ayah]");
      if (el) shareAyah(el);
      return; // don't play the ayah
    }
    if (window.getSelection()?.toString()) return; // user is selecting text, not clicking
    const el = (e.target as HTMLElement).closest<HTMLElement>("[data-ayah]");
    if (el) handleAyah(el);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLDivElement>) {
    if (e.key !== "Enter" && e.key !== " ") return;
    if ((e.target as HTMLElement).closest("[data-share]")) return; // the share button handles itself
    const el = (e.target as HTMLElement).closest<HTMLElement>("[data-ayah]");
    if (!el) return;
    e.preventDefault();
    handleAyah(el);
  }

  // Deep link: /surah/2#ayah-255 scrolls to the ayah and flashes it
  useEffect(() => {
    const focusFromHash = () => {
      const match = /^#ayah-(\d+)$/.exec(window.location.hash);
      if (!match) return;
      const el = readerRef.current?.querySelector<HTMLElement>(
        `[data-ayah="${match[1]}"]`,
      );
      if (!el) return;
      const rect = el.getBoundingClientRect();
      window.scrollTo({
        top: window.scrollY + rect.top - window.innerHeight * 0.3,
      });
      el.classList.remove("is-target");
      void el.offsetWidth; // restart the animation if the same ayah is targeted again
      el.classList.add("is-target");
      window.setTimeout(() => el.classList.remove("is-target"), 2600);
    };
    focusFromHash();
    window.addEventListener("hashchange", focusFromHash);
    return () => window.removeEventListener("hashchange", focusFromHash);
  }, []);

  // Last read position: the ayah near the top third of the screen, once the user scrolls
  useEffect(() => {
    const root = readerRef.current;
    if (!root) return;
    const mountedAt = performance.now();
    let userScrolled = false;
    let timer = 0;

    const markUser = () => {
      userScrolled = true;
    };
    // Scrolls in the first moments come from the page itself (deep links), not the reader
    const onScroll = () => {
      if (performance.now() - mountedAt > 1500) userScrolled = true;
    };
    window.addEventListener("wheel", markUser, { passive: true });
    window.addEventListener("touchmove", markUser, { passive: true });
    window.addEventListener("scroll", onScroll, { passive: true });

    const observer = new IntersectionObserver(
      (entries) => {
        if (!userScrolled) return;
        const entry = entries.find((e) => e.isIntersecting);
        if (!entry) return;
        const el = entry.target as HTMLElement;
        window.clearTimeout(timer);
        timer = window.setTimeout(() => rememberPosition(el), 800);
      },
      { rootMargin: "-30% 0px -60% 0px" }, // a thin band near the top third of the screen
    );
    root.querySelectorAll("[data-ayah]").forEach((el) => observer.observe(el));

    return () => {
      observer.disconnect();
      window.clearTimeout(timer);
      window.removeEventListener("wheel", markUser);
      window.removeEventListener("touchmove", markUser);
      window.removeEventListener("scroll", onScroll);
    };
  }, []);

  // Stop everything when leaving the page
  useEffect(() => {
    const cors = corsAudioRef;
    const plain = plainAudioRef;
    const graph = graphRef;
    const watch = watchRef;
    const timer = noticeTimerRef;
    return () => {
      cors.current?.pause();
      plain.current?.pause();
      graph.current?.ctx.close();
      cancelAnimationFrame(watch.current);
      window.clearTimeout(timer.current);
    };
  }, []);

  return (
    <>
      <div
        ref={readerRef}
        className="reader"
        data-mode={prefs.mode}
        data-translation={prefs.translation ? "on" : "off"}
        data-tafsir={prefs.tafsir ? "on" : "off"}
        data-reciter={prefs.reciter}
        data-volume={prefs.muted ? 0 : prefs.volume}
        style={
          { "--quran-size": `${SIZES[prefs.size]}rem` } as React.CSSProperties
        }
        onClick={handleClick}
        onKeyDown={handleKeyDown}>
        {children}
      </div>

      {/* Floating controls */}
      <div className="fixed bottom-[max(1.5rem,env(safe-area-inset-bottom))] left-1/2 z-40 flex -translate-x-1/2 flex-col items-center gap-3">
        {notice && (
          <p
            role="status"
            className="rounded-full border border-white/15 bg-black px-4 py-2 font-arabic text-xs text-white/80">
            {notice}
          </p>
        )}

        {/* Play button with voice visualizer */}
        <div className="flex items-center gap-3">
          <Visualizer analyserRef={analyserRef} active={playing} side="start" />
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
          <Visualizer analyserRef={analyserRef} active={playing} side="end" />
        </div>
        {continuous && (
          <p className="font-arabic text-xs text-white/40">تشغيل السورة</p>
        )}

        {/* Toolbar: full on tablets/desktop, compact on phones */}
        <div
          ref={toolbarRef}
          className="glass flex items-center gap-1 rounded-full p-1.5 text-sm">
          {menu === "reciter" && (
            <Panel>
              <ReciterList
                value={prefs.reciter}
                onChange={(reciter) => {
                  stop();
                  update({ reciter });
                  setMenu(null);
                }}
              />
            </Panel>
          )}
          {menu === "display" && (
            <Panel>
              <DisplaySettings prefs={prefs} update={update} />
            </Panel>
          )}

          <ToolButton
            active={menu === "reciter"}
            onClick={() => toggleMenu("reciter")}
            label={`القارئ: ${getReciter(prefs.reciter).name}`}>
            {getReciter(prefs.reciter).short}
            <span
              aria-hidden
              className={`ms-1.5 inline-block text-[10px] transition ${menu === "reciter" ? "rotate-180" : ""}`}>
              ▾
            </span>
          </ToolButton>
          <span aria-hidden className="mx-1 h-5 w-px bg-white/15" />

          {/* Phones: one button opens the display settings */}
          <ToolButton
            className="md:hidden"
            active={menu === "display"}
            onClick={() => toggleMenu("display")}
            label="إعدادات العرض">
            Aa
          </ToolButton>

          {/* Tablets (768px+) and desktop: everything inline */}
          <div className="hidden items-center gap-1 md:flex">
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
              <>
                <ToolButton
                  active={prefs.translation}
                  onClick={() => update({ translation: !prefs.translation })}>
                  ترجمة
                </ToolButton>
                <ToolButton
                  active={prefs.tafsir}
                  onClick={() => update({ tafsir: !prefs.tafsir })}>
                  تفسير
                </ToolButton>
              </>
            )}
            <span aria-hidden className="mx-1 h-5 w-px bg-white/15" />
            <VolumeControl prefs={prefs} update={update} />
            <span aria-hidden className="mx-1 h-5 w-px bg-white/15" />
            <ToolButton
              label="تكبير الخط"
              className="text-base"
              disabled={prefs.size === SIZES.length - 1}
              onClick={() => update({ size: prefs.size + 1 })}>
              +
            </ToolButton>
            <ToolButton
              label="تصغير الخط"
              className="text-base"
              disabled={prefs.size === 0}
              onClick={() => update({ size: prefs.size - 1 })}>
              −
            </ToolButton>
          </div>
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

// ---------- Menus ----------
// Positioned from the toolbar (centered), so it never overflows a phone screen.
// The outer element positions it; .glass would override "absolute" on the same element.
function Panel({ children }: { children: React.ReactNode }) {
  return (
    <div className="absolute bottom-full left-1/2 mb-4 w-[min(18rem,calc(100vw-2rem))] -translate-x-1/2">
      <div className="rounded-2xl border border-white/15 bg-black p-1.5 shadow-[0_10px_40px_rgba(0,0,0,0.8)]">
        {children}
      </div>
    </div>
  );
}

function ReciterList({
  value,
  onChange,
}: {
  value: string;
  onChange: (id: string) => void;
}) {
  return (
    <ul
      role="listbox"
      aria-label="اختيار القارئ"
      className="reciter-menu max-h-[50vh] overflow-y-auto">
      {RECITERS.map((r) => (
        <li key={r.id}>
          <button
            type="button"
            role="option"
            aria-selected={r.id === value}
            onClick={() => onChange(r.id)}
            className={`flex w-full items-center justify-between gap-2 rounded-xl px-3 py-2 font-arabic text-sm transition ${
              r.id === value
                ? "bg-white/10 text-accent"
                : "text-white/70 hover:bg-white/5 hover:text-white"
            }`}>
            <span>{r.name}</span>
            <span className="flex items-center gap-2">
              {r.kind === "surah" && (
                <span className="rounded-full border border-white/15 px-2 py-0.5 text-[10px] text-white/40">
                  سورة كاملة
                </span>
              )}
              {r.id === value && <span aria-hidden>✓</span>}
            </span>
          </button>
        </li>
      ))}
    </ul>
  );
}

function DisplaySettings({
  prefs,
  update,
}: {
  prefs: Prefs;
  update: (change: Partial<Prefs>) => void;
}) {
  return (
    <div className="space-y-1 p-1 font-arabic text-sm">
      <SettingRow label="العرض">
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
      </SettingRow>

      {prefs.mode === "cards" && (
        <>
          <SettingRow label="الترجمة">
            <ToolButton
              active={prefs.translation}
              onClick={() => update({ translation: !prefs.translation })}>
              {prefs.translation ? "ظاهرة" : "مخفية"}
            </ToolButton>
          </SettingRow>
          <SettingRow label="التفسير">
            <ToolButton
              active={prefs.tafsir}
              onClick={() => update({ tafsir: !prefs.tafsir })}>
              {prefs.tafsir ? "ظاهر" : "مخفي"}
            </ToolButton>
          </SettingRow>
        </>
      )}

      <SettingRow label="الصوت">
        <VolumeControl prefs={prefs} update={update} />
      </SettingRow>

      <SettingRow label="حجم الخط">
        <ToolButton
          label="تصغير الخط"
          className="text-base"
          disabled={prefs.size === 0}
          onClick={() => update({ size: prefs.size - 1 })}>
          −
        </ToolButton>
        <span className="w-8 text-center tabular-nums text-white/60">
          {prefs.size + 1}
        </span>
        <ToolButton
          label="تكبير الخط"
          className="text-base"
          disabled={prefs.size === SIZES.length - 1}
          onClick={() => update({ size: prefs.size + 1 })}>
          +
        </ToolButton>
      </SettingRow>
    </div>
  );
}

// ---------- Volume ----------
function VolumeControl({
  prefs,
  update,
}: {
  prefs: Prefs;
  update: (change: Partial<Prefs>) => void;
}) {
  const silent = prefs.muted || prefs.volume === 0;
  return (
    <div dir="ltr" className="flex items-center gap-2 px-2">
      <button
        type="button"
        onClick={() =>
          update(
            silent && prefs.volume === 0
              ? { volume: 1, muted: false }
              : { muted: !prefs.muted },
          )
        }
        aria-label={silent ? "تشغيل الصوت" : "كتم الصوت"}
        className={`grid h-8 w-8 place-items-center rounded-full transition hover:text-accent ${
          silent ? "text-white/40" : "text-white/70"
        }`}>
        <SpeakerIcon level={silent ? 0 : prefs.volume} />
      </button>
      <input
        type="range"
        min={0}
        max={1}
        step={0.05}
        value={prefs.muted ? 0 : prefs.volume}
        onChange={(e) =>
          update({ volume: Number(e.target.value), muted: false })
        }
        aria-label="مستوى الصوت"
        className="volume-slider w-24"
        style={
          {
            "--fill": `${(prefs.muted ? 0 : prefs.volume) * 100}%`,
          } as React.CSSProperties
        }
      />
    </div>
  );
}

function SpeakerIcon({ level }: { level: number }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-4 w-4"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden>
      <path d="M11 5 6 9H3v6h3l5 4V5z" fill="currentColor" />
      {level === 0 ? (
        <path d="m16 9 5 6m0-6-5 6" />
      ) : (
        <>
          <path d="M15.5 8.5a5 5 0 0 1 0 7" />
          {level > 0.5 && <path d="M18.5 5.5a9 9 0 0 1 0 13" />}
        </>
      )}
    </svg>
  );
}

function SettingRow({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-xl px-2 py-1.5">
      <span className="text-white/50">{label}</span>
      <div className="flex items-center gap-1">{children}</div>
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
  className = "",
}: {
  children: React.ReactNode;
  onClick: () => void;
  active?: boolean;
  disabled?: boolean;
  label?: string;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      aria-pressed={label ? undefined : active}
      className={`whitespace-nowrap rounded-full px-4 py-1.5 font-arabic transition duration-300 disabled:opacity-30 ${
        active
          ? "bg-white/15 text-white"
          : "text-white/50 hover:text-accent enabled:hover:bg-white/5"
      } ${className}`}>
      {children}
    </button>
  );
}
