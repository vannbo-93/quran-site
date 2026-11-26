// Share an ayah: phones open the share sheet, computers copy to the clipboard
export async function shareAyah(el: HTMLElement, showNotice: (message: string) => void) {
  const holder = el.closest<HTMLElement>("[data-surah]");
  const surah = holder?.dataset.surah;
  const name = holder?.dataset.surahName ?? "";
  const ayah = el.dataset.ayah;
  const text = el.querySelector(".ayah-text")?.textContent?.trim() ?? "";
  const url = `${window.location.origin}/surah/${surah}#ayah-${ayah}`;
  const body = `${text}\n﴿${name} ${ayah}﴾\n${url}`;

  const isTouch = window.matchMedia("(pointer: coarse)").matches;
  if (isTouch && navigator.share) {
    try {
      await navigator.share({ text: body });
    } catch {
      // user closed the share sheet
    }
    return;
  }
  try {
    await navigator.clipboard.writeText(body);
    showNotice("تم نسخ الآية مع رابطها");
  } catch {
    showNotice("تعذّر النسخ");
  }
}
