import { useEffect, useRef, useState } from "react";
import { getReciter } from "@/lib/reciters";
import { DisplaySettings } from "./DisplaySettings";
import { Panel } from "./Panel";
import { ReciterList } from "./ReciterList";
import { SpeedControl } from "./SpeedControl";
import { ToolButton } from "./ToolButton";
import { VolumeControl } from "./VolumeControl";
import { SIZES, type Prefs, type UpdatePrefs } from "./prefs";

type Menu = null | "reciter" | "display";

const Divider = () => <span aria-hidden className="mx-1 h-5 w-px bg-white/15" />;

// Toolbar: full on large screens, compact (Aa panel) on phones and tablets
export function Toolbar({
  prefs,
  update,
  onReciterChange,
}: {
  prefs: Prefs;
  update: UpdatePrefs;
  onReciterChange: (id: string) => void;
}) {
  const toolbarRef = useRef<HTMLDivElement | null>(null);
  const [menu, setMenu] = useState<Menu>(null);
  const toggleMenu = (name: "reciter" | "display") => setMenu((m) => (m === name ? null : name));
  const reciter = getReciter(prefs.reciter);

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

  return (
    <div ref={toolbarRef} className="glass flex items-center gap-1 rounded-full p-1.5 text-sm">
      {menu === "reciter" && (
        <Panel>
          <ReciterList
            value={prefs.reciter}
            onChange={(id) => {
              onReciterChange(id);
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

      <ToolButton active={menu === "reciter"} onClick={() => toggleMenu("reciter")} label={`القارئ: ${reciter.name}`}>
        {reciter.short}
        <span aria-hidden className={`ms-1.5 inline-block text-[10px] transition ${menu === "reciter" ? "rotate-180" : ""}`}>
          ▾
        </span>
      </ToolButton>
      <Divider />

      {/* Phones and tablets: one button opens the display settings */}
      <ToolButton className="lg:hidden" active={menu === "display"} onClick={() => toggleMenu("display")} label="إعدادات العرض">
        Aa
      </ToolButton>

      {/* Large screens (1024px+): everything inline */}
      <div className="hidden items-center gap-1 lg:flex">
        <ToolButton active={prefs.mode === "mushaf"} onClick={() => update({ mode: "mushaf" })}>
          مصحف
        </ToolButton>
        <ToolButton active={prefs.mode === "cards"} onClick={() => update({ mode: "cards" })}>
          بطاقات
        </ToolButton>
        {prefs.mode === "cards" && (
          <>
            <ToolButton active={prefs.translation} onClick={() => update({ translation: !prefs.translation })}>
              ترجمة
            </ToolButton>
            <ToolButton active={prefs.tafsir} onClick={() => update({ tafsir: !prefs.tafsir })}>
              تفسير
            </ToolButton>
          </>
        )}
        <ToolButton active={prefs.tajweed} onClick={() => update({ tajweed: !prefs.tajweed })}>
          تجويد
        </ToolButton>
        <Divider />
        <VolumeControl prefs={prefs} update={update} />
        <Divider />
        <SpeedControl prefs={prefs} update={update} />
        <Divider />
        <ToolButton
          label="تكبير الخط"
          className="text-base"
          disabled={prefs.size === SIZES.length - 1}
          onClick={() => update({ size: prefs.size + 1 })}
        >
          +
        </ToolButton>
        <ToolButton label="تصغير الخط" className="text-base" disabled={prefs.size === 0} onClick={() => update({ size: prefs.size - 1 })}>
          −
        </ToolButton>
      </div>
    </div>
  );
}
