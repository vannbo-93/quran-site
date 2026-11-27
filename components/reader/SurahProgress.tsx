import { useEffect, useRef } from "react";
import type { Progress } from "./useAudioPlayer";

const STEPS = 1000; // slider resolution
const SEEK_KEYS = ["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "Home", "End", "PageUp", "PageDown"];


function formatTime(seconds: number) {
  const s = Math.max(0, Math.floor(seconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const pad = (n: number) => String(n).padStart(2, "0");
  return h > 0 ? `${h}:${pad(m)}:${pad(s % 60)}` : `${m}:${pad(s % 60)}`;
}

// Surah progress: follows the recitation; click or drag to jump to any point.
// Updated every frame through refs, so playback never re-renders the page.
export function SurahProgress({
  getProgress,
  onSeek,
}: {
  getProgress: () => Progress | null;
  onSeek: (fraction: number) => void;
}) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const ayahRef = useRef<HTMLSpanElement | null>(null);
  const timeRef = useRef<HTMLSpanElement | null>(null);
  const draggingRef = useRef(false);
  const totalRef = useRef(0);
  const getProgressRef = useRef(getProgress);

  // Always call the latest getProgress from the animation loop
  useEffect(() => {
    getProgressRef.current = getProgress;
  });

  const setFill = (fraction: number) =>
    inputRef.current?.style.setProperty("--fill", `${(fraction * 100).toFixed(2)}%`);

  const setAyahLabel = (ayah: number, total: number) => {
    if (ayahRef.current) {
      ayahRef.current.textContent = ayah > 0 ? `الآية ${ayah} من ${total}` : "البداية";
    }
  };

  useEffect(() => {
    let frame = 0;
    const tick = () => {
      const p = getProgressRef.current();
      const input = inputRef.current;
      if (p && input && !draggingRef.current) {
        totalRef.current = p.total;
        input.value = String(Math.round(p.fraction * STEPS));
        setFill(p.fraction);
        setAyahLabel(p.ayah, p.total);
        if (timeRef.current) {
          timeRef.current.textContent =
            p.seconds !== null && p.duration ? `${formatTime(p.seconds)} / ${formatTime(p.duration)}` : "";
        }
      }
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, []);

  // While dragging: move the bar and show which ayah it points to
  function preview(value: number) {
    const fraction = value / STEPS;
    setFill(fraction);
    const total = totalRef.current;
    if (total) setAyahLabel(Math.min(total, Math.floor(fraction * total) + 1), total);
  }

  function commit(value: number) {
    draggingRef.current = false;
    onSeek(value / STEPS);
  }

  return (
    <div className="glass w-[min(30rem,calc(100vw-2rem))] space-y-1.5 rounded-2xl px-4 pt-3 pb-2">
      <input
        ref={inputRef}
        type="range"
        dir="rtl"
        min={0}
        max={STEPS}
        step={1}
        defaultValue={0}
        aria-label="موضع التلاوة في السورة"
        className="volume-slider surah-progress w-full"
        onPointerDown={() => (draggingRef.current = true)}
        onPointerCancel={() => (draggingRef.current = false)}
        onPointerUp={(e) => commit(Number(e.currentTarget.value))}
        onChange={(e) => preview(Number(e.currentTarget.value))}
        onKeyDown={(e) => {
          if (SEEK_KEYS.includes(e.key)) draggingRef.current = true;
        }}
        onKeyUp={(e) => {
          if (SEEK_KEYS.includes(e.key)) commit(Number(e.currentTarget.value));
        }}
      />
      <div className="flex justify-between font-arabic text-[11px] text-white/45">
        <span ref={ayahRef} />
        <span ref={timeRef} dir="ltr" className="tabular-nums" />
      </div>
    </div>
  );
}
