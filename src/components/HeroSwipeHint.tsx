"use client";

import { useEffect, useRef, useState } from "react";
import gsap from "gsap";

const STORAGE_KEY = "naami:heroHintSeen";
const AUTO_DISMISS_MS = 4000;

/**
 * Mobile-only affordance for the hero slideshow: the left/right tap zones are
 * invisible on touch (their labels only render through the desktop custom
 * cursor). Shows once per session, then fades.
 */
export default function HeroSwipeHint() {
  const [visible, setVisible] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const leftRef = useRef<HTMLDivElement>(null);
  const rightRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let seen = false;
    try {
      seen = sessionStorage.getItem(STORAGE_KEY) === "1";
    } catch {
      /* private mode / blocked storage — just show it */
    }
    if (seen) return;
    setVisible(true);
  }, []);

  useEffect(() => {
    if (!visible) return;

    const markSeen = () => {
      try {
        sessionStorage.setItem(STORAGE_KEY, "1");
      } catch {
        /* ignore */
      }
    };

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const dismiss = () => {
      markSeen();
      if (!rootRef.current) return setVisible(false);
      gsap.to(rootRef.current, {
        opacity: 0,
        duration: 0.4,
        ease: "power2.in",
        onComplete: () => setVisible(false),
      });
    };

    if (!reduced && leftRef.current && rightRef.current) {
      gsap.fromTo(
        [leftRef.current, rightRef.current],
        { x: (i) => (i === 0 ? 6 : -6) },
        { x: 0, duration: 0.9, ease: "sine.inOut", repeat: -1, yoyo: true }
      );
    }

    const timer = window.setTimeout(dismiss, AUTO_DISMISS_MS);
    // First touch anywhere in the hero dismisses immediately.
    const onPointer = () => dismiss();
    const parent = rootRef.current?.parentElement;
    parent?.addEventListener("pointerdown", onPointer, { once: true });

    return () => {
      window.clearTimeout(timer);
      parent?.removeEventListener("pointerdown", onPointer);
    };
  }, [visible]);

  if (!visible) return null;

  const chevron = (dir: "left" | "right") => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#FFF9EF" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d={dir === "left" ? "M15 6l-6 6 6 6" : "M9 6l6 6-6 6"} />
    </svg>
  );

  return (
    <div
      ref={rootRef}
      className="md:hidden absolute inset-x-0 top-1/2 -translate-y-1/2 z-40 flex items-center justify-between px-4 pointer-events-none"
      style={{ filter: "drop-shadow(0 1px 6px rgba(0,0,0,0.45))" }}
    >
      <div ref={leftRef}>{chevron("left")}</div>
      <span
        className="font-sans font-bold uppercase tracking-[0.3em] text-center"
        style={{ fontSize: "9px", color: "#FFF9EF" }}
      >
        Tap sides to explore
      </span>
      <div ref={rightRef}>{chevron("right")}</div>
    </div>
  );
}
