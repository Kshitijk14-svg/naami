"use client";

import { useEffect, useState, type RefObject } from "react";

export interface CoverCrop {
  offsetXPct: number;
  offsetYPct: number;
  visibleWidthPct: number;
  visibleHeightPct: number;
}

/** Identity fallback used until the container is first measured (SSR / initial paint) —
 *  the whole image is considered visible, matching the browser's own `object-fit: cover`
 *  rendering before any JS runs. */
const IDENTITY: CoverCrop = { offsetXPct: 0, offsetYPct: 0, visibleWidthPct: 100, visibleHeightPct: 100 };

/**
 * Computes what slice of an `object-fit: cover` image (in percent of the image's own
 * width/height, 0-100) remains visible inside `containerRef` once the overflow is
 * cropped — the inverse of a "contain" fit box. Lets sibling elements (hotspot markers)
 * that store their position as "percent of the original image" remap themselves onto
 * the visible, cropped portion instead of the full image.
 */
export function useCoverCrop(containerRef: RefObject<HTMLElement | null>, ratio: number): CoverCrop {
  const [crop, setCrop] = useState<CoverCrop>(IDENTITY);

  useEffect(() => {
    const el = containerRef.current;
    if (!el || !ratio) return;

    const measure = () => {
      const containerWidth = el.clientWidth;
      const containerHeight = el.clientHeight;
      if (!containerWidth || !containerHeight) return;

      const containerRatio = containerWidth / containerHeight;
      let visibleWidthPct: number;
      let visibleHeightPct: number;
      if (containerRatio > ratio) {
        visibleWidthPct = 100;
        visibleHeightPct = (100 * ratio) / containerRatio;
      } else {
        visibleHeightPct = 100;
        visibleWidthPct = (100 * containerRatio) / ratio;
      }
      setCrop({
        visibleWidthPct,
        visibleHeightPct,
        offsetXPct: (100 - visibleWidthPct) / 2,
        offsetYPct: (100 - visibleHeightPct) / 2,
      });
    };

    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, [containerRef, ratio]);

  return crop;
}

/** Maps a point stored as "percent of the original image" (0-100) onto its position
 *  within the visible, cropped portion (also 0-100), clamped so a point that fell in
 *  the cropped-off region stays pinned to the nearest visible edge. */
export function mapPctToCoverCrop(pct: number, offsetPct: number, visiblePct: number): number {
  const mapped = ((pct - offsetPct) / visiblePct) * 100;
  return Math.min(100, Math.max(0, mapped));
}
