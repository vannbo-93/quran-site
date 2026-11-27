import { useEffect, useRef, useState, type RefObject } from "react";
import { DEFAULT_RECITER, everyAyahUrl, getReciter, type AudioInfo, type Reciter } from "@/lib/reciters";
import { keepInView, nextAyah, rememberPosition } from "./dom";
import { SPEED_MAX, SPEED_MIN } from "./prefs";

// ---------- Playback session ----------
// "ayah": EveryAyah, one file per ayah.
// "file": mp3quran, one file per surah (with or without per-ayah timings).
type Session = { kind: "ayah" } | { kind: "file"; info: AudioInfo; stopAt: number | null };
type AudioGraph = { ctx: AudioContext; analyser: AnalyserNode; gain: GainNode };
type PlayerKind = "cors" | "plain";

// The next ayah, fully loaded in the second player, ready to start the moment the current one ends
type Standby = { audio: HTMLAudioElement; url: string; el: HTMLElement };

export type Progress = {
  fraction: number; // 0..1 of the whole surah
  ayah: number; // current ayah (0 = before the first ayah)
  total: number; // ayahs in the surah
  seconds: number | null; // position in the surah file (file sessions only)
  duration: number | null;
};

const hostOf = (url: string) => {
  try {
    return new URL(url).host;
  } catch {
    return "";
  }
};

const clamp = (n: number, min: number, max: number) => Math.min(max, Math.max(min, n));

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

// The audio engine: players, Web Audio graph, EveryAyah and mp3quran sessions.
// All of it shares the same refs, so it lives in one hook.
export function useAudioPlayer({ readerRef, showNotice, clearNotice }: Options) {
  // Two players of each kind, so the next ayah can load while the current one plays.
  // "cors" players feed the analyser (needs CORS); "plain" ones are the fallback.
  const playersRef = useRef<Record<PlayerKind, HTMLAudioElement[]>>({ cors: [], plain: [] });
  const activeAudioRef = useRef<HTMLAudioElement | null>(null);
  const standbyRef = useRef<Standby | null>(null);
  const graphRef = useRef<AudioGraph | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const blockedHostsRef = useRef(new Set<string>()); // hosts that refused CORS
  const webAudioOffRef = useRef(false); // this device can't play through Web Audio: plain players only

  const sessionRef = useRef<Session | null>(null);
  const playingElRef = useRef<HTMLElement | null>(null);
  const continuousRef = useRef(false);
  const retryRef = useRef<(() => void) | null>(null); // replays the last request after a CORS fallback
  const requestIdRef = useRef(0); // ignores stale async results
  const watchRef = useRef(0); // requestAnimationFrame id
  const infoCacheRef = useRef(new Map<string, Promise<AudioInfo>>());

  const [playing, setPlaying] = useState(false);
  const [paused, setPaused] = useState(false); // surah paused, can resume
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
  const allAyahs = () => Array.from(readerRef.current?.querySelectorAll<HTMLElement>("[data-ayah]") ?? []);
  const allPlayers = () => [...playersRef.current.cors, ...playersRef.current.plain];

  // Volume and speed are read from the DOM so newly created players get the current values
  const currentVolume = () => {
    const v = Number(readerRef.current?.dataset.volume);
    return Number.isFinite(v) ? clamp(v, 0, 1) : 1;
  };
  const currentSpeed = () => {
    const v = Number(readerRef.current?.dataset.speed);
    return Number.isFinite(v) && v >= SPEED_MIN && v <= SPEED_MAX ? v : 1;
  };

  function applySpeed(rate: number) {
    allPlayers().forEach((audio) => setRate(audio, rate));
  }

  function applyVolume(v: number) {
    // CORS players: volume goes through the gain node (after the analyser, so the bars keep moving)
    if (graphRef.current) graphRef.current.gain.gain.value = v;
    playersRef.current.plain.forEach((audio) => (audio.volume = v));
  }

  // ---- players ----
  function ensureGraph() {
    if (!graphRef.current) {
      try {
        const ctx = new AudioContext();
        const analyser = ctx.createAnalyser();
        analyser.fftSize = 64;
        analyser.smoothingTimeConstant = 0.75;
        const gain = ctx.createGain();
        gain.gain.value = currentVolume();
        analyser.connect(gain);
        gain.connect(ctx.destination);
        graphRef.current = { ctx, analyser, gain };
      } catch {
        // Web Audio unavailable: the visualizer uses a simulated animation
      }
    }
    return graphRef.current;
  }

  // iPad / iPhone (every browser there is Safari underneath): an AudioContext only starts
  // when resumed inside the tap itself. Resumed later (after waiting for the server, as
  // mp3quran reciters do), it stays suspended: the audio plays but nothing is heard.
  // Called first thing in every tap handler, before any await.
  function unlockAudio() {
    const graph = ensureGraph();
    if (graph && graph.ctx.state !== "running") graph.ctx.resume().catch(() => {});
  }

  function getPlayer(kind: PlayerKind, index: 0 | 1) {
    const list = playersRef.current[kind];
    if (!list[index]) {
      const audio = new Audio();
      audio.preload = "auto";
      setRate(audio, currentSpeed());
      audio.addEventListener("ended", () => handleEnded(audio));
      audio.addEventListener("error", () => handleError(audio));
      if (kind === "cors") {
        audio.crossOrigin = "anonymous";
        const graph = ensureGraph();
        if (graph) {
          try {
            graph.ctx.createMediaElementSource(audio).connect(graph.analyser);
          } catch {
            // plays directly, without the analyser
          }
        }
      } else {
        audio.volume = currentVolume();
      }
      list[index] = audio;
    }
    return list[index];
  }

  const kindForUrl = (url: string): PlayerKind =>
    webAudioOffRef.current || blockedHostsRef.current.has(hostOf(url)) ? "plain" : "cors";
  const kindOf = (audio: HTMLAudioElement): PlayerKind =>
    playersRef.current.cors.includes(audio) ? "cors" : "plain";

  // The player of this kind that is not the active one
  function otherPlayer(kind: PlayerKind) {
    const active = activeAudioRef.current;
    return getPlayer(kind, playersRef.current[kind][0] === active ? 1 : 0);
  }

  function activate(audio: HTMLAudioElement) {
    if (activeAudioRef.current && activeAudioRef.current !== audio) activeAudioRef.current.pause();
    activeAudioRef.current = audio;
    analyserRef.current = kindOf(audio) === "cors" ? (graphRef.current?.analyser ?? null) : null;
  }

  function startPlayback(audio: HTMLAudioElement) {
    graphRef.current?.ctx.resume();
    setRate(audio, currentSpeed());
    setPlaying(true);
    setPaused(false);
    audio.play().catch((err: unknown) => {
      // Only a browser block (autoplay policy) stops playback.
      // Load errors are handled by the "error" listener; AbortError just means the source changed.
      if (err instanceof DOMException && err.name === "NotAllowedError") stop();
    });
    watchSilentContext(audio);
  }

  // Safety net: if the AudioContext still isn't running shortly after playback starts,
  // the sound would be silent. Move to a plain player at the same position, for good.
  function watchSilentContext(audio: HTMLAudioElement) {
    const graph = graphRef.current;
    if (kindOf(audio) !== "cors" || !graph || graph.ctx.state === "running") return;
    graph.ctx.resume().catch(() => {});
    window.setTimeout(() => {
      if (graph.ctx.state === "running" || activeAudioRef.current !== audio || audio.paused) return;
      webAudioOffRef.current = true;
      const position = audio.currentTime;
      const src = audio.src;
      audio.pause();
      const plain = getPlayer("plain", 0);
      if (standbyRef.current?.audio === plain) standbyRef.current = null;
      if (plain.src !== src) plain.src = src;
      const seekTo = () => (plain.currentTime = position);
      if (plain.readyState >= 1) seekTo();
      else plain.addEventListener("loadedmetadata", seekTo, { once: true });
      activate(plain);
      startPlayback(plain);
      // The next ayah was preloaded in a Web Audio player: load it again in a plain one
      if (sessionRef.current?.kind === "ayah" && playingElRef.current) prepareNext(playingElRef.current);
    }, 600);
  }

  function playUrl(url: string, startSeconds: number, retry: () => void) {
    retryRef.current = retry;
    const kind = kindForUrl(url);
    const active = activeAudioRef.current;
    // Keep the active player when it is of the right kind
    const audio = active && kindOf(active) === kind ? active : getPlayer(kind, 0);
    if (standbyRef.current?.audio === audio) standbyRef.current = null;
    activate(audio);

    if (audio.src !== url) audio.src = url;
    const seek = () => {
      if (startSeconds > 0 || audio.currentTime > 0) audio.currentTime = startSeconds;
    };
    if (audio.readyState >= 1) seek();
    else audio.addEventListener("loadedmetadata", seek, { once: true });

    startPlayback(audio);
  }

  function stop() {
    requestIdRef.current++;
    allPlayers().forEach((audio) => audio.pause());
    cancelAnimationFrame(watchRef.current);
    sessionRef.current = null;
    standbyRef.current = null;
    highlight(null);
    setPlaying(false);
    setPaused(false);
    setContinuousMode(false);
  }

  // Pause the surah where it is; resume() continues from the same point
  function pause() {
    activeAudioRef.current?.pause();
    cancelAnimationFrame(watchRef.current);
    setPlaying(false);
    setPaused(true);
  }

  function resume() {
    unlockAudio();
    const session = sessionRef.current;
    const audio = activeAudioRef.current;
    if (!session || !audio) {
      playSurah();
      return;
    }
    startPlayback(audio);
    if (session.kind === "file") watchFile();
  }

  function handleError(audio: HTMLAudioElement) {
    // A failed standby is not a problem: the next ayah will load normally
    if (audio !== activeAudioRef.current) {
      if (standbyRef.current?.audio === audio) standbyRef.current = null;
      return;
    }
    // The CORS player failed: the server may refuse cross-origin access.
    // Remember the host and replay with the plain player (no live visualizer for it).
    if (kindOf(audio) === "cors") {
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

  function handleEnded(audio: HTMLAudioElement) {
    if (audio !== activeAudioRef.current) return;
    const session = sessionRef.current;
    if (session?.kind === "ayah" && continuousRef.current) {
      const next = nextAyah(playingElRef.current);
      if (next) {
        const standby = standbyRef.current;
        if (standby && standby.el === next && standby.audio.readyState >= 3) {
          // The next ayah is already loaded: start it now, no gap
          standbyRef.current = null;
          retryRef.current = () => startEveryAyah(next);
          activate(standby.audio);
          if (standby.audio.currentTime > 0) standby.audio.currentTime = 0;
          startPlayback(standby.audio);
          highlight(next);
          keepInView(next);
          prepareNext(next);
        } else {
          startEveryAyah(next);
          keepInView(next);
        }
        return;
      }
    }
    stop();
  }

  // ---- EveryAyah: one file per ayah ----
  const everyAyahUrlFor = (el: HTMLElement) => {
    const reciter = currentReciter();
    const surah = currentSurah();
    const ayah = Number(el.dataset.ayah);
    return reciter.kind === "ayah" && surah && ayah ? everyAyahUrl(reciter.folder, surah, ayah) : null;
  };

  function startEveryAyah(el: HTMLElement) {
    const url = everyAyahUrlFor(el);
    if (!url) return;
    sessionRef.current = { kind: "ayah" };
    cancelAnimationFrame(watchRef.current);
    highlight(el);
    playUrl(url, 0, () => startEveryAyah(el));
    prepareNext(el);
  }

  // Load the next ayah completely in the second player while this one plays
  function prepareNext(current: HTMLElement) {
    standbyRef.current = null;
    if (!continuousRef.current) return;
    const next = nextAyah(current);
    const url = next ? everyAyahUrlFor(next) : null;
    if (!next || !url) return;
    const audio = otherPlayer(kindForUrl(url));
    if (audio === activeAudioRef.current) return;
    audio.pause();
    if (audio.src !== url) audio.src = url;
    else if (audio.currentTime > 0) audio.currentTime = 0;
    audio.load();
    standbyRef.current = { audio, url, el: next };
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
    standbyRef.current = null;
    highlight(el);
    playUrl(info.url, startMs / 1000, () => startFile(info, startMs, stopAt, el));
    watchFile();
  }

  const timingAt = (info: AudioInfo, ms: number) => info.timings?.find((t) => ms >= t.start && ms < t.end);

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
      const timing = timingAt(session.info, ms);
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

  // Length of the surah file in ms (from the file, or the end of the last ayah until it loads)
  function fileDurationMs(info: AudioInfo, audio: HTMLAudioElement) {
    if (Number.isFinite(audio.duration) && audio.duration > 0) return audio.duration * 1000;
    return info.timings?.at(-1)?.end ?? 0;
  }

  // ---- progress bar ----
  function getProgress(): Progress | null {
    const session = sessionRef.current;
    const audio = activeAudioRef.current;
    if (!session || !continuousRef.current || !audio) return null;
    const total = allAyahs().length;
    const ayah = Number(playingElRef.current?.dataset.ayah) || 0;

    if (session.kind === "file") {
      const durationMs = fileDurationMs(session.info, audio);
      return {
        fraction: durationMs ? clamp((audio.currentTime * 1000) / durationMs, 0, 1) : 0,
        ayah,
        total,
        seconds: audio.currentTime,
        duration: durationMs ? durationMs / 1000 : null,
      };
    }
    const within = Number.isFinite(audio.duration) && audio.duration > 0 ? audio.currentTime / audio.duration : 0;
    return {
      fraction: total ? clamp((Math.max(ayah, 1) - 1 + within) / total, 0, 1) : 0,
      ayah,
      total,
      seconds: null,
      duration: null,
    };
  }

  // Jump to a point of the surah (0..1); starts the surah there if it isn't playing
  function seek(fraction: number) {
    unlockAudio();
    const f = clamp(fraction, 0, 0.999);
    const session = sessionRef.current;
    const audio = activeAudioRef.current;
    if (!session || !continuousRef.current || !audio) {
      playSurah(f);
      return;
    }

    if (session.kind === "file") {
      const ms = f * fileDurationMs(session.info, audio);
      audio.currentTime = ms / 1000;
      const timing = timingAt(session.info, ms);
      const el = timing ? ayahEl(timing.ayah) : null;
      if (el) {
        highlight(el);
        keepInView(el, true);
      }
      if (!playing) resume();
      return;
    }

    const ayahs = allAyahs();
    const el = ayahs[Math.floor(f * ayahs.length)];
    if (!el) return;
    startEveryAyah(el);
    keepInView(el, true);
  }

  // ---- entry points ----
  // Fetch the surah file + timings; null when this request became stale
  async function fetchInfo(reciterId: string) {
    const requestId = ++requestIdRef.current;
    const info = await loadInfo(reciterId, currentSurah());
    return requestId === requestIdRef.current ? info : null;
  }

  // The whole surah from a point (0 = beginning), without gaps between ayahs
  async function playSurah(fraction = 0) {
    unlockAudio(); // before the await below
    const ayahs = allAyahs();
    if (ayahs.length === 0) return;
    const reciter = currentReciter();
    clearNotice();

    // EveryAyah reciter: chain the ayah files (the next one always preloaded)
    if (reciter.kind === "ayah") {
      requestIdRef.current++;
      setContinuousMode(true);
      const el = ayahs[Math.floor(fraction * ayahs.length)] ?? ayahs[0];
      startEveryAyah(el);
      keepInView(el, fraction > 0);
      return;
    }

    const info = await fetchInfo(reciter.id);
    if (!info) return; // another click happened meanwhile

    if (!info.available || !info.url) {
      stop();
      showNotice(`هذه السورة غير متوفرة بصوت ${reciter.name}`);
      return;
    }

    setContinuousMode(true);
    const knownMs = info.timings?.at(-1)?.end;
    startFile(info, knownMs ? fraction * knownMs : 0, null, null); // from 0 the basmala is included

    // No timings (whole-surah reciters): the length is known once the file loads
    if (!knownMs && fraction > 0) {
      const audio = activeAudioRef.current;
      if (!audio) return;
      const jump = () => (audio.currentTime = fraction * audio.duration);
      if (audio.readyState >= 1 && Number.isFinite(audio.duration)) jump();
      else audio.addEventListener("loadedmetadata", jump, { once: true });
    }
  }

  // Play button: pause / resume the surah, or start it
  function togglePlay() {
    if (playing) {
      if (continuousRef.current) pause();
      else stop(); // a single ayah just stops
      return;
    }
    if (paused && continuousRef.current) resume();
    else playSurah();
  }

  // Click on an ayah: that ayah only, then stop
  async function playSingle(el: HTMLElement) {
    unlockAudio(); // before the await below
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
    const players = playersRef;
    const graph = graphRef;
    const watch = watchRef;
    return () => {
      [...players.current.cors, ...players.current.plain].forEach((audio) => {
        audio.pause();
        audio.removeAttribute("src");
      });
      graph.current?.ctx.close();
      cancelAnimationFrame(watch.current);
    };
  }, []);

  return {
    playing,
    paused,
    continuous,
    analyserRef,
    togglePlay,
    playAyah,
    stop,
    seek,
    getProgress,
    applyVolume,
    applySpeed,
  };
}
