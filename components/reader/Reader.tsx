"use client";

import { useEffect, useRef } from "react";
import { isAyahSaved, toggleAyah, useBookmarks } from "@/lib/bookmarks";
import { PauseIcon, PlayIcon, StopIcon } from "./icons";
import { SIZES, savePrefs, usePrefs, type UpdatePrefs } from "./prefs";
import { shareAyah } from "./share";
import { SurahProgress } from "./SurahProgress";
import { TajweedLegend } from "./TajweedLegend";
import { Toolbar } from "./Toolbar";
import { useAudioPlayer } from "./useAudioPlayer";
import { useDeepLink } from "./useDeepLink";
import { useLastRead } from "./useLastRead";
import { useNotice } from "./useNotice";
import { Visualizer } from "./Visualizer";

export function Reader({ children }: { children: React.ReactNode }) {
  const readerRef = useRef<HTMLDivElement | null>(null);
  const prefs = usePrefs();
  const { notice, showNotice, clearNotice } = useNotice();
  const player = useAudioPlayer({ readerRef, showNotice, clearNotice });
  const bookmarks = useBookmarks();
  useDeepLink(readerRef);

  // Mark saved ayahs (filled bookmark icon) whenever the saved list changes
  useEffect(() => {
    const root = readerRef.current;
    const surah = Number(root?.querySelector<HTMLElement>("[data-surah]")?.dataset.surah);
    root?.querySelectorAll<HTMLElement>("[data-ayah]").forEach((el) => {
      const saved = isAyahSaved(bookmarks, surah, Number(el.dataset.ayah));
      el.toggleAttribute("data-saved", saved);
      el.querySelectorAll<HTMLElement>("[data-bookmark]").forEach((button) => {
        button.setAttribute("aria-pressed", String(saved));
        const label = saved ? `إزالة الآية ${el.dataset.ayah} من المحفوظات` : `حفظ الآية ${el.dataset.ayah}`;
        button.setAttribute("aria-label", label);
        button.title = saved ? "إزالة من المحفوظات" : "حفظ الآية";
      });
    });
  }, [bookmarks]);
  useLastRead(readerRef);

  const playLabel = player.playing
    ? player.continuous
      ? "إيقاف مؤقت"
      : "إيقاف"
    : player.paused && player.continuous
      ? "متابعة التلاوة"
      : "تشغيل السورة";

  const update: UpdatePrefs = (change) => {
    const next = { ...prefs, ...change };
    savePrefs(next);
    if ("volume" in change || "muted" in change) player.applyVolume(next.muted ? 0 : next.volume);
    if ("speed" in change) player.applySpeed(next.speed);
  };

  function saveAyah(el: HTMLElement) {
    const holder = el.closest<HTMLElement>("[data-surah]");
    const now = toggleAyah({
      surah: Number(holder?.dataset.surah),
      ayah: Number(el.dataset.ayah),
      surahName: holder?.dataset.surahName ?? "",
      text: el.querySelector(".ayah-text")?.textContent?.trim() ?? "",
    });
    showNotice(now ? "حُفظت الآية" : "أُزيلت الآية من المحفوظات");
  }

  function handleClick(e: React.MouseEvent<HTMLDivElement>) {
    const bookmarkButton = (e.target as HTMLElement).closest<HTMLElement>("[data-bookmark]");
    if (bookmarkButton) {
      const el = bookmarkButton.closest<HTMLElement>("[data-ayah]");
      if (el) saveAyah(el);
      return; // don't play the ayah
    }
    const shareButton = (e.target as HTMLElement).closest<HTMLElement>("[data-share]");
    if (shareButton) {
      const el = shareButton.closest<HTMLElement>("[data-ayah]");
      if (el) shareAyah(el, showNotice);
      return; // don't play the ayah
    }
    if (window.getSelection()?.toString()) return; // user is selecting text, not clicking
    const el = (e.target as HTMLElement).closest<HTMLElement>("[data-ayah]");
    if (el) player.playAyah(el);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLDivElement>) {
    if (e.key !== "Enter" && e.key !== " ") return;
    if ((e.target as HTMLElement).closest("[data-share], [data-bookmark]")) return; // the buttons handle themselves
    const el = (e.target as HTMLElement).closest<HTMLElement>("[data-ayah]");
    if (!el) return;
    e.preventDefault();
    player.playAyah(el);
  }

  return (
    <>
      {/* Always present: only folds and unfolds, never disappears */}
      <TajweedLegend
        open={prefs.legend}
        colors={prefs.tajweed}
        onToggleOpen={() => update({ legend: !prefs.legend })}
        onToggleColors={() => update({ tajweed: !prefs.tajweed })}
      />

      <div
        ref={readerRef}
        className="reader"
        data-mode={prefs.mode}
        data-translation={prefs.translation ? "on" : "off"}
        data-tafsir={prefs.tafsir ? "on" : "off"}
        data-reciter={prefs.reciter}
        data-volume={prefs.muted ? 0 : prefs.volume}
        data-speed={prefs.speed}
        data-tajweed={prefs.tajweed ? "on" : "off"}
        style={{ "--quran-size": `${SIZES[prefs.size]}rem` } as React.CSSProperties}
        onClick={handleClick}
        onKeyDown={handleKeyDown}
      >
        {children}
      </div>

      {/* Floating controls */}
      <div className="reader-controls fixed bottom-[max(1.5rem,env(safe-area-inset-bottom))] left-1/2 z-40 flex -translate-x-1/2 flex-col items-center gap-3">
        {notice && (
          <p role="status" className="rounded-full border border-white/15 bg-black px-4 py-2 font-arabic text-xs text-white/80">
            {notice}
          </p>
        )}

        {/* Play button with voice visualizer */}
        <div className="flex items-center gap-3">
          <Visualizer analyserRef={player.analyserRef} active={player.playing} side="start" />
          <button
            type="button"
            onClick={player.togglePlay}
            aria-label={playLabel}
            title={playLabel}
            className={`glass grid h-16 w-16 place-items-center rounded-full transition duration-300 hover:scale-105 ${
              player.playing ? "text-accent shadow-[0_0_40px_rgba(56,189,248,0.35)]" : "text-white"
            }`}
          >
            {player.playing ? player.continuous ? <PauseIcon /> : <StopIcon /> : <PlayIcon />}
          </button>
          <Visualizer analyserRef={player.analyserRef} active={player.playing} side="end" />
        </div>

        {/* Surah progress: visible while the surah plays or is paused */}
        {player.continuous && <SurahProgress getProgress={player.getProgress} onSeek={player.seek} />}

        <Toolbar
          prefs={prefs}
          update={update}
          onReciterChange={(reciter) => {
            player.stop();
            update({ reciter });
          }}
        />
      </div>
    </>
  );
}
