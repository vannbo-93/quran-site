import { useEffect, useRef, useState, type RefObject } from "react";
import { DEFAULT_RECITER, everyAyahUrl, getReciter, type AudioInfo, type Reciter } from "@/lib/reciters";
import { keepInView, nextAyah, rememberPosition } from "./dom";
import { SPEED_MAX, SPEED_MIN } from "./prefs";

// ---------- Playback session ----------
// "ayah": EveryAyah, one file per ayah.
// "file": mp3quran, one file per surah (with or without per-ayah timings).
type Session = { kind: "ayah" } | { kind: "file"; info: AudioInfo; stopAt: number | null };
type AudioGraph = { ctx: AudioContext; analyser: AnalyserNode; gain: GainNode };

const hostOf = (url: string) => {
  try {
    return new URL(url).host;
  } catch {
    return "";
  }
};

function setRate(audio: HTMLAudioElement, rate: number) {
  // defaultPlaybackRate survives a change of src; playbackRate alone is reset on each new file
  audio.defaultPlaybackRate = rate;
  audio.playbackRate = rate;
  audio.preservesPitch = true; // keep the reciter's voice natural
}

type Options = {
  readerRef: RefObject<HTMLDivElement | null>;
  showNotice: (message: string) => void;
  clearNotice: () => void;
};

// The audio engine: two players, Web Audio graph, EveryAyah and mp3quran sessions.
// All of it shares the same refs, so it lives in one hook.
export function useAudioPlayer({ readerRef, showNotice, clearNotice }: Options) {
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

  const [playing, setPlaying] = useState(false);
  const [continuous, setContinuous] = useState(false);

  // ---- small helpers ----
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
  const currentReciter = (): Reciter => getReciter(readerRef.current?.dataset.reciter ?? DEFAULT_RECITER);
  const currentSurah = () =>
    Number(readerRef.current?.querySelector<HTMLElement>("[data-surah]")?.dataset.surah);
  const ayahEl = (n: number) => readerRef.current?.querySelector<HTMLElement>(`[data-ayah="${n}"]`) ?? null;

  // Volume and speed are read from the DOM so newly created players get the current values
  const currentVolume = () => {
    const v = Number(readerRef.current?.dataset.volume);
    return Number.isFinite(v) ? Math.min(1, Math.max(0, v)) : 1;
  };
  const currentSpeed = () => {
    const v = Number(readerRef.current?.dataset.speed);
    return Number.isFinite(v) && v >= SPEED_MIN && v <= SPEED_MAX ? v : 1;
  };

  function applySpeed(rate: number) {
    if (corsAudioRef.current) setRate(corsAudioRef.current, rate);
    if (plainAudioRef.current) setRate(plainAudioRef.current, rate);
  }

  function applyVolume(v: number) {
    // CORS player: volume goes through the gain node (after the analyser, so the bars keep moving)
    if (graphRef.current) graphRef.current.gain.gain.value = v;
    if (plainAudioRef.current) plainAudioRef.current.volume = v;
  }

  // ---- players ----
  function createAudio(withCors: boolean) {
    const audio = new Audio();
    if (withCors) audio.crossOrigin = "anonymous";
    setRate(audio, currentSpeed());
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
    if (activeAudioRef.current && activeAudioRef.current !== audio) activeAudioRef.current.pause();
    activeAudioRef.current = audio;
    analyserRef.current = !blocked ? (graphRef.current?.analyser ?? null) : null;
    return audio;
  }

  function playUrl(url: string, startSeconds: number, retry: () => void) {
    retryRef.current = retry;
    const audio = pickAudio(url);
    graphRef.current?.ctx.resume();

    if (audio.src !== url) audio.src = url;
    setRate(audio, currentSpeed());
    const seek = () => {
      if (startSeconds > 0 || audio.currentTime > 0) audio.currentTime = startSeconds;
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
      const nextUrl = everyAyahUrl(reciter.folder, surah, Number(next.dataset.ayah));
      const preload = new Audio();
      // Must match the main player, or the cached copy can't be reused with CORS
      if (!blockedHostsRef.current.has(hostOf(nextUrl))) preload.crossOrigin = "anonymous";
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
      info = fetch(`/api/audio-info?reciter=${encodeURIComponent(reciterId)}&surah=${surah}`)
        .then((res) => (res.ok ? (res.json() as Promise<AudioInfo>) : unavailable()))
        .catch(unavailable);
      infoCacheRef.current.set(key, info);
    }
    return info;
  }

  function startFile(info: AudioInfo, startMs: number, stopAt: number | null, el: HTMLElement | null) {
    if (!info.url) return;
    sessionRef.current = { kind: "file", info, stopAt };
    highlight(el);
    playUrl(info.url, startMs / 1000, () => startFile(info, startMs, stopAt, el));
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
      const timing = session.info.timings?.find((t) => ms >= t.start && ms < t.end);
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
  // Fetch the surah file + timings; null when this request became stale
  async function fetchInfo(reciterId: string) {
    const requestId = ++requestIdRef.current;
    const info = await loadInfo(reciterId, currentSurah());
    return requestId === requestIdRef.current ? info : null;
  }

  // Play button: the whole surah, without gaps between ayahs
  async function playSurah() {
    const first = readerRef.current?.querySelector<HTMLElement>("[data-ayah]");
    if (!first) return;
    const reciter = currentReciter();
    clearNotice();

    // EveryAyah reciter: chain the ayah files
    if (reciter.kind === "ayah") {
      requestIdRef.current++;
      setContinuousMode(true);
      startEveryAyah(first);
      keepInView(first);
      return;
    }

    const info = await fetchInfo(reciter.id);
    if (!info) return; // another click happened meanwhile

    if (info.available && info.url) {
      setContinuousMode(true);
      startFile(info, 0, null, null); // one file from the beginning (includes the basmala)
      return;
    }
    stop();
    showNotice(`هذه السورة غير متوفرة بصوت ${reciter.name}`);
  }

  // Click on an ayah: that ayah only, then stop
  async function playSingle(el: HTMLElement) {
    const reciter = currentReciter();
    clearNotice();
    setContinuousMode(false);

    if (reciter.kind === "ayah") {
      requestIdRef.current++;
      startEveryAyah(el); // its own short file
      return;
    }

    // Whole-surah reciters have no ayah timings: only the play button works
    if (reciter.kind === "surah") {
      showNotice(`${reciter.name}: متوفر بالسورة كاملة فقط، استعمل زر التشغيل`);
      return;
    }

    const info = await fetchInfo(reciter.id);
    if (!info) return;
    if (!info.available || !info.url) {
      stop();
      showNotice(`هذه السورة غير متوفرة بصوت ${reciter.name}`);
      return;
    }
    const timing = info.timings?.find((t) => t.ayah === Number(el.dataset.ayah));
    if (!timing) {
      showNotice("توقيت هذه الآية غير متوفر");
      return;
    }
    startFile(info, timing.start, timing.end, el); // stop at the end of the ayah
  }

  // Click on an ayah: play it alone, or stop if it is the one playing alone
  function playAyah(el: HTMLElement) {
    if (playing && !continuousRef.current && playingElRef.current === el) {
      stop();
      return;
    }
    playSingle(el);
  }

  // Stop everything when leaving the page
  useEffect(() => {
    const cors = corsAudioRef;
    const plain = plainAudioRef;
    const graph = graphRef;
    const watch = watchRef;
    return () => {
      cors.current?.pause();
      plain.current?.pause();
      graph.current?.ctx.close();
      cancelAnimationFrame(watch.current);
    };
  }, []);

  return { playing, continuous, analyserRef, playSurah, playAyah, stop, applyVolume, applySpeed };
}
