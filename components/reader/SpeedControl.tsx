import { SPEED_MAX, SPEED_MIN, SPEED_STEP, type Prefs, type UpdatePrefs } from "./prefs";

export function SpeedControl({ prefs, update }: { prefs: Prefs; update: UpdatePrefs }) {
  const fill = ((prefs.speed - SPEED_MIN) / (SPEED_MAX - SPEED_MIN)) * 100;
  return (
    <div dir="ltr" className="flex items-center gap-2 px-2">
      <button
        type="button"
        onClick={() => update({ speed: 1 })}
        title="السرعة العادية"
        aria-label={`سرعة التلاوة ${prefs.speed.toFixed(2)}، اضغط للعودة إلى السرعة العادية`}
        className={`w-12 rounded-full py-1 text-center text-xs tabular-nums transition hover:text-accent ${
          prefs.speed === 1 ? "text-white/50" : "text-accent"
        }`}
      >
        {Number(prefs.speed.toFixed(2))}×
      </button>
      <input
        type="range"
        min={SPEED_MIN}
        max={SPEED_MAX}
        step={SPEED_STEP}
        value={prefs.speed}
        onChange={(e) => update({ speed: Math.round(Number(e.target.value) * 100) / 100 })}
        aria-label="سرعة التلاوة"
        className="volume-slider w-24"
        style={{ "--fill": `${fill}%` } as React.CSSProperties}
      />
    </div>
  );
}
