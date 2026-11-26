import { SettingRow } from "./SettingRow";
import { SpeedControl } from "./SpeedControl";
import { ToolButton } from "./ToolButton";
import { VolumeControl } from "./VolumeControl";
import { SIZES, type Prefs, type UpdatePrefs } from "./prefs";

// Phones: all display settings in one panel
export function DisplaySettings({ prefs, update }: { prefs: Prefs; update: UpdatePrefs }) {
  return (
    <div className="space-y-1 p-1 font-arabic text-sm">
      <SettingRow label="العرض">
        <ToolButton active={prefs.mode === "mushaf"} onClick={() => update({ mode: "mushaf" })}>
          مصحف
        </ToolButton>
        <ToolButton active={prefs.mode === "cards"} onClick={() => update({ mode: "cards" })}>
          بطاقات
        </ToolButton>
      </SettingRow>

      {prefs.mode === "cards" && (
        <>
          <SettingRow label="الترجمة">
            <ToolButton active={prefs.translation} onClick={() => update({ translation: !prefs.translation })}>
              {prefs.translation ? "ظاهرة" : "مخفية"}
            </ToolButton>
          </SettingRow>
          <SettingRow label="التفسير">
            <ToolButton active={prefs.tafsir} onClick={() => update({ tafsir: !prefs.tafsir })}>
              {prefs.tafsir ? "ظاهر" : "مخفي"}
            </ToolButton>
          </SettingRow>
        </>
      )}

      <SettingRow label="الصوت">
        <VolumeControl prefs={prefs} update={update} />
      </SettingRow>

      <SettingRow label="السرعة">
        <SpeedControl prefs={prefs} update={update} />
      </SettingRow>

      <SettingRow label="حجم الخط">
        <ToolButton label="تصغير الخط" className="text-base" disabled={prefs.size === 0} onClick={() => update({ size: prefs.size - 1 })}>
          −
        </ToolButton>
        <span className="w-8 text-center tabular-nums text-white/60">{prefs.size + 1}</span>
        <ToolButton
          label="تكبير الخط"
          className="text-base"
          disabled={prefs.size === SIZES.length - 1}
          onClick={() => update({ size: prefs.size + 1 })}
        >
          +
        </ToolButton>
      </SettingRow>
    </div>
  );
}
