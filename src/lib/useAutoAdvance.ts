"use client";

import { useEffect, useState } from "react";

const INTERVAL_MS = 5000;

/**
 * Calls `next` every 5s. The timer restarts whenever `key` (the current slide)
 * changes, so manual navigation resets it. Pauses while hovered and is
 * disabled for reduced-motion users or when `count` <= 1.
 * Spread the returned handlers onto the banner container.
 */
export function useAutoAdvance(next: () => void, key: number, count: number) {
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (paused || count <= 1) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const id = setTimeout(next, INTERVAL_MS);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, paused, count]);

  return {
    onMouseEnter: () => setPaused(true),
    onMouseLeave: () => setPaused(false),
  };
}
