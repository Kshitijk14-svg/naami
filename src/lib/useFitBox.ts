"use client";

import { useEffect, useState, type RefObject } from "react";

export interface FitBox {
  top: number;
  left: number;
  width: number;
  height: number;
}

/** Full-bleed fallback used until the container is first measured (SSR / initial paint). */
const UNMEASURED: FitBox = { top: 0, left: 0, width: 0, height: 0 };

/**
 * Computes the rectangle (in px, relative to `containerRef`'s own box) that an
 * `object-fit: contain` image of the given aspect ratio would occupy — i.e. the
 * same "shrink to fit both axes, preserve ratio, center" math the browser does
 * for a replaced element, but exposed as a plain rect so sibling elements
 * (hotspot markers, parallax wrappers) can be positioned against it. CSS alone
 * can't reproduce this sizing for a non-replaced element, hence ResizeObserver.
 */
export function useFitBox(containerRef: RefObject<HTMLElement | null>, ratio: number): FitBox {
  const [box, setBox] = useState<FitBox>(UNMEASURED);

  useEffect(() => {
    const el = containerRef.current;
    if (!el || !ratio) return;

    const measure = () => {
      const containerWidth = el.clientWidth;
      const containerHeight = el.clientHeight;
      if (!containerWidth || !containerHeight) return;

      const containerRatio = containerWidth / containerHeight;
      let width: number;
      let height: number;
      if (containerRatio > ratio) {
        height = containerHeight;
        width = height * ratio;
      } else {
        width = containerWidth;
        height = width / ratio;
      }
      setBox({
        width,
        height,
        left: (containerWidth - width) / 2,
        top: (containerHeight - height) / 2,
      });
    };

    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, [containerRef, ratio]);

  return box;
}

/** True once `useFitBox` has measured a real container (i.e. not the SSR fallback). */
export function isFitBoxMeasured(box: FitBox): boolean {
  return box.width > 0 && box.height > 0;
}
