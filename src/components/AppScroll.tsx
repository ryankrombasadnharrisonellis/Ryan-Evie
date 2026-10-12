"use client";
import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";

/**
 * The app's scroll container. html/body never scroll (see globals.css), so the
 * bottom nav — the next row down — stays pinned. A position:fixed nav drifts up
 * the screen on iPhone home-screen apps once the body scrolls.
 */
export default function AppScroll({ children }: { children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const path = usePathname();

  // Switching tabs/pages starts at the top (the browser used to do this for the body).
  useEffect(() => {
    ref.current?.scrollTo({ top: 0 });
  }, [path]);

  // iOS can leave the window nudged up after the keyboard closes, even though the
  // body can't scroll. Once the keyboard is gone, snap it back.
  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;
    const settle = () => {
      const keyboardOpen = vv.height < window.innerHeight - 80;
      if (!keyboardOpen && (window.scrollY !== 0 || vv.offsetTop !== 0)) window.scrollTo(0, 0);
    };
    vv.addEventListener("resize", settle);
    return () => vv.removeEventListener("resize", settle);
  }, []);

  return (
    <div ref={ref} className="app-scroll">
      {children}
    </div>
  );
}
