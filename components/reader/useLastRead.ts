import { useEffect, type RefObject } from "react";
import { rememberPosition } from "./dom";

// Last read position: the ayah near the top third of the screen, once the user scrolls
export function useLastRead(readerRef: RefObject<HTMLDivElement | null>) {
  useEffect(() => {
    const root = readerRef.current;
    if (!root) return;
    const mountedAt = performance.now();
    let userScrolled = false;
    let timer = 0;

    const markUser = () => {
      userScrolled = true;
    };
    // Scrolls in the first moments come from the page itself (deep links), not the reader
    const onScroll = () => {
      if (performance.now() - mountedAt > 1500) userScrolled = true;
    };
    window.addEventListener("wheel", markUser, { passive: true });
    window.addEventListener("touchmove", markUser, { passive: true });
    window.addEventListener("scroll", onScroll, { passive: true });

    const observer = new IntersectionObserver(
      (entries) => {
        if (!userScrolled) return;
        const entry = entries.find((e) => e.isIntersecting);
        if (!entry) return;
        const el = entry.target as HTMLElement;
        window.clearTimeout(timer);
        timer = window.setTimeout(() => rememberPosition(el), 800);
      },
      { rootMargin: "-30% 0px -60% 0px" }, // a thin band near the top third of the screen
    );
    root.querySelectorAll("[data-ayah]").forEach((el) => observer.observe(el));

    return () => {
      observer.disconnect();
      window.clearTimeout(timer);
      window.removeEventListener("wheel", markUser);
      window.removeEventListener("touchmove", markUser);
      window.removeEventListener("scroll", onScroll);
    };
  }, [readerRef]);
}
