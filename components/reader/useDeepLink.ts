import { useEffect, type RefObject } from "react";

// Deep link: /surah/2#ayah-255 scrolls to the ayah and flashes it
export function useDeepLink(readerRef: RefObject<HTMLDivElement | null>) {
  useEffect(() => {
    const focusFromHash = () => {
      const match = /^#ayah-(\d+)$/.exec(window.location.hash);
      if (!match) return;
      const el = readerRef.current?.querySelector<HTMLElement>(`[data-ayah="${match[1]}"]`);
      if (!el) return;
      const rect = el.getBoundingClientRect();
      window.scrollTo({ top: window.scrollY + rect.top - window.innerHeight * 0.3 });
      el.classList.remove("is-target");
      void el.offsetWidth; // restart the animation if the same ayah is targeted again
      el.classList.add("is-target");
      window.setTimeout(() => el.classList.remove("is-target"), 2600);
    };
    focusFromHash();
    window.addEventListener("hashchange", focusFromHash);
    return () => window.removeEventListener("hashchange", focusFromHash);
  }, [readerRef]);
}
