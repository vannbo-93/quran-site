import { SpeakerIcon } from "./icons";
import type { Prefs, UpdatePrefs } from "./prefs";

export function VolumeControl({ prefs, update }: { prefs: Prefs; update: UpdatePrefs }) {
  const silent = prefs.muted || prefs.volume === 0;
  return (
    <div dir="ltr" className="flex items-center gap-2 px-2">
      <button
        type="button"
        onClick={() => update(silent && prefs.volume === 0 ? { volume: 1, muted: false } : { muted: !prefs.muted })}
        aria-label={silent ? "تشغيل الصوت" : "كتم الصوت"}
        className={`grid h-8 w-8 place-items-center rounded-full transition hover:text-accent ${
          silent ? "text-white/40" : "text-white/70"
        }`}
      >
        <SpeakerIcon level={silent ? 0 : prefs.volume} />
      </button>
      <input
        type="range"
        min={0}
        max={1}
        step={0.05}
        value={prefs.muted ? 0 : prefs.volume}
        onChange={(e) => update({ volume: Number(e.target.value), muted: false })}
        aria-label="مستوى الصوت"
        className="volume-slider w-24"
        style={{ "--fill": `${(prefs.muted ? 0 : prefs.volume) * 100}%` } as React.CSSProperties}
      />
    </div>
  );
}
