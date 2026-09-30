import { useEffect, useState } from "react";

/** Below this, a shrinking viewport is Safari's toolbars moving, not a keyboard. */
const KEYBOARD_MIN_PX = 120;

/**
 * How much of the page the on-screen keyboard covers, in px (0 when none).
 *
 * iOS Safari never shrinks the page for its keyboard: the layout viewport
 * keeps its height, only the visual viewport gets shorter, and Safari slides
 * the page up to show the focused field. An app sized to the page then sits
 * half under the status bar with an empty band above the keyboard (Dvir,
 * 2026-09-30). The frame subtracts this instead, as a native app would.
 */
export function keyboardCover(layoutHeight: number, visualHeight: number): number {
  const covered = Math.round(layoutHeight - visualHeight);
  return covered >= KEYBOARD_MIN_PX ? covered : 0;
}

export function useKeyboardCover(): number {
  const [cover, setCover] = useState(0);
  useEffect(() => {
    const vv = typeof window !== "undefined" ? window.visualViewport : null;
    if (!vv) return;
    const update = () => {
      const next = keyboardCover(document.documentElement.clientHeight, vv.height);
      setCover(next);
      // The app now fits above the keyboard, so the page has nothing to
      // slide for; put it back where it was.
      if (next > 0 && (window.scrollY !== 0 || vv.offsetTop !== 0)) window.scrollTo(0, 0);
    };
    update();
    vv.addEventListener("resize", update);
    vv.addEventListener("scroll", update);
    return () => {
      vv.removeEventListener("resize", update);
      vv.removeEventListener("scroll", update);
    };
  }, []);
  return cover;
}
