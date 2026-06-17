"use client";

import { useEffect, useState } from "react";

/** The phone breakpoint — kept in sync with the `@media (max-width: 768px)`
 * rules the responsive `<style>` blocks use. Tablets/desktop stay desktop. */
export const MOBILE_QUERY = "(max-width: 768px)";

/**
 * `true` when the viewport is phone-sized. SSR-safe: returns `false` on the
 * server and the first client paint, then corrects after mount — so the desktop
 * tree is the hydration baseline and only genuine forks (Browse cards, the
 * admin gate, the radar tap-tooltip) swap once `matchMedia` resolves. Layout
 * chrome that must be flash-free is handled with CSS media queries instead.
 */
export function useIsMobile(): boolean {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const mql = window.matchMedia(MOBILE_QUERY);
    const sync = () => setIsMobile(mql.matches);
    sync();
    mql.addEventListener("change", sync);
    return () => mql.removeEventListener("change", sync);
  }, []);

  return isMobile;
}
