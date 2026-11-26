import { useEffect, useRef } from "react";

const BAR_COUNT = 10;

// Bars that move with the reciter's voice (simulated when no analyser is available)
export function Visualizer({
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
          : 0.25 + 0.55 * Math.abs(Math.sin(time / 180 + fromCenter * 0.9)) * Math.abs(Math.sin(time / 470 + fromCenter)); // simulated
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
      className={`flex h-10 items-center gap-[3px] transition-opacity duration-500 ${active ? "opacity-100" : "opacity-0"}`}
    >
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
