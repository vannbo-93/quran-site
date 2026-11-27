"use client";

import { useEffect } from "react";

const SHOW_NEAR_TOP = 80; // px: always visible near the top of the page
const MIN_DELTA = 6; // px: ignore tiny jitters (trackpads, mobile bounce)
const USER_INPUT_WINDOW = 800; // ms: a scroll counts as the user's only right after their input
const SCROLL_KEYS = new Set(["ArrowDown", "ArrowUp", "PageDown", "PageUp", "End", "Home", " "]);

// Hides the navbar while the USER scrolls down, shows it again when scrolling up.
// Scrolls the user didn't make (the page following the recitation, the browser keeping
// the text in place after a layout change) never hide it.
// Writes --nav-offset on <html> so elements stuck under the navbar (tajweed legend) follow it.
export function NavAutoHide() {
  useEffect(() => {
    const header = document.querySelector<HTMLElement>("header.sticky");
    if (!header) return;
    const root = document.documentElement;

    let lastY = window.scrollY;
    let hidden = false;
    let frame = 0;
    let lastInput = -Infinity;
    let pointerDown = false; // dragging the scrollbar

    const userScrolling = () => pointerDown || performance.now() - lastInput < USER_INPUT_WINDOW;
    const markInput = () => {
      lastInput = performance.now();
    };
    const onKey = (e: KeyboardEvent) => {
      if (SCROLL_KEYS.has(e.key)) markInput();
    };
    const onPointerDown = () => {
      pointerDown = true;
      markInput();
    };
    const onPointerUp = () => {
      pointerDown = false;
      markInput();
    };

    const apply = (hide: boolean) => {
      hidden = hide;
      header.dataset.hidden = String(hide);
      root.style.setProperty("--nav-offset", hide ? "0px" : `${header.offsetHeight}px`);
    };

    const update = () => {
      frame = 0;
      const y = window.scrollY;
      const delta = y - lastY;
      if (y < SHOW_NEAR_TOP) {
        if (hidden) apply(false);
      } else if (delta > MIN_DELTA && !hidden && userScrolling() && !header.contains(document.activeElement)) {
        apply(true);
      } else if (delta < -MIN_DELTA && hidden) {
        apply(false);
      }
      if (Math.abs(delta) > MIN_DELTA || y < SHOW_NEAR_TOP) lastY = y;
    };

    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    // Keyboard users tabbing into the navbar must see it
    const onFocusIn = () => hidden && apply(false);
    const onResize = () => apply(hidden);

    apply(false);
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onResize);
    window.addEventListener("wheel", markInput, { passive: true });
    window.addEventListener("touchmove", markInput, { passive: true });
    window.addEventListener("keydown", onKey);
    window.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("pointerup", onPointerUp);
    window.addEventListener("pointercancel", onPointerUp);
    header.addEventListener("focusin", onFocusIn);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onResize);
      window.removeEventListener("wheel", markInput);
      window.removeEventListener("touchmove", markInput);
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("pointerup", onPointerUp);
      window.removeEventListener("pointercancel", onPointerUp);
      header.removeEventListener("focusin", onFocusIn);
      delete header.dataset.hidden;
    };
  }, []);

  return null;
}
