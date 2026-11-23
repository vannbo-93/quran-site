/** @format */

"use client";

import { useSyncExternalStore } from "react";

// Font sizes for the Quran text (rem)
const SIZES = [1.5, 1.875, 2.25, 2.75, 3.25];
type Mode = "mushaf" | "cards";
type Prefs = { size: number; mode: Mode; translation: boolean };
const DEFAULTS: Prefs = { size: 2, mode: "mushaf", translation: true };
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
    };
  } catch {
    return DEFAULTS;
  }
}

// ---------- Component ----------
export function Reader({ children }: { children: React.ReactNode }) {
  const prefs = parsePrefs(
    useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot),
  );
  const update = (change: Partial<Prefs>) => savePrefs({ ...prefs, ...change });

  return (
    <>
      <div
        className="reader"
        data-mode={prefs.mode}
        data-translation={prefs.translation ? "on" : "off"}
        style={
          { "--quran-size": `${SIZES[prefs.size]}rem` } as React.CSSProperties
        }>
        {children}
      </div>

      {/* Floating toolbar */}
      <div className="fixed bottom-6 left-1/2 z-40 -translate-x-1/2">
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
