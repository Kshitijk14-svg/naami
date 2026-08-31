"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { usePathname } from "next/navigation";
import AnnouncementBar from "./AnnouncementBar";
import Navbar from "./Navbar";

const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";

function subscribeReducedMotion(onChange: () => void) {
  const mq = window.matchMedia(REDUCED_MOTION_QUERY);
  mq.addEventListener("change", onChange);
  return () => mq.removeEventListener("change", onChange);
}

/**
 * Wraps AnnouncementBar + Navbar in one fixed-position stack and publishes
 * the combined height as --site-header-h, so pt-[var(--site-header-h)] sites
 * clear both without hardcoding the announcement bar's height.
 *
 * The navbar hides on scroll-down and reappears on scroll-up (the announcement
 * bar stays pinned). Only the navbar wrapper is translated, so --site-header-h
 * stays constant and page content never jumps.
 */
export default function SiteHeader() {
  const ref = useRef<HTMLDivElement>(null);
  const pathname = usePathname();
  const [hidden, setHidden] = useState(false);

  const reduced = useSyncExternalStore(
    subscribeReducedMotion,
    () => window.matchMedia(REDUCED_MOTION_QUERY).matches,
    () => false,
  );

  // Reveal the navbar whenever the route changes (React's store-previous-prop
  // pattern — adjusts state during render instead of in a cascading effect).
  const [prevPathname, setPrevPathname] = useState(pathname);
  if (prevPathname !== pathname) {
    setPrevPathname(pathname);
    setHidden(false);
  }

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const setHeight = () => {
      document.documentElement.style.setProperty("--site-header-h", `${el.offsetHeight}px`);
    };
    setHeight();

    const observer = new ResizeObserver(setHeight);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // Hide the navbar while scrolling down, reveal it while scrolling up.
  useEffect(() => {
    let lastY = window.scrollY;
    let ticking = false;

    const update = () => {
      ticking = false;
      const y = window.scrollY;
      const delta = y - lastY;
      // Ignore sub-pixel noise and the mobile URL-bar collapse jitter.
      if (Math.abs(delta) < 6) return;
      setHidden(delta > 0 && y > 80);
      lastY = y;
    };

    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(update);
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <div ref={ref} className="fixed top-0 left-0 right-0" style={{ zIndex: 40 }}>
      <div style={{ position: "relative", zIndex: 2 }}>
        <AnnouncementBar />
      </div>
      <div
        style={{
          position: "relative",
          zIndex: 1,
          transform: hidden ? "translateY(-100%)" : "translateY(0)",
          transition: reduced ? "none" : "transform 320ms ease",
          willChange: "transform",
        }}
      >
        <Navbar />
      </div>
    </div>
  );
}
