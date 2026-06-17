"use client";

import  { type ReactNode } from "react";

import { MobileGate } from "@/components/shell/mobile-gate";
import { useIsMobile } from "@/lib/hooks/use-is-mobile";

/** Renders `children` on tablet/desktop and the "needs a bigger screen" gate on
 * phones — used to keep the desktop-density admin + agent-trace views off mobile
 * without the dense subtree mounting once the viewport check resolves. */
export function DesktopOnly({ children }: { children: ReactNode }) {
  const isMobile = useIsMobile();
  return isMobile ? <MobileGate /> : <>{children}</>;
}
