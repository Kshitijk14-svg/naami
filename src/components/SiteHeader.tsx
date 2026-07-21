"use client";

import { useEffect, useRef } from "react";
import AnnouncementBar from "./AnnouncementBar";
import Navbar from "./Navbar";

/**
 * Wraps AnnouncementBar + Navbar in one fixed-position stack and publishes
 * the combined height as --site-header-h, so pt-[var(--site-header-h)] sites
 * clear both without hardcoding the announcement bar's height.
 */
export default function SiteHeader() {
  const ref = useRef<HTMLDivElement>(null);

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

  return (
    <div ref={ref} className="fixed top-0 left-0 right-0" style={{ zIndex: 40 }}>
      <AnnouncementBar />
      <Navbar />
    </div>
  );
}
