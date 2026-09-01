"use client";

import { useCallback, useEffect, useRef, useState } from "react";

interface ProductPromoVideoProps {
  videoUrl: string;
  poster?: string | null;
  productId: number;
}

const DISMISS_KEY = "promoVideo:dismissed";
const EDGE_GAP = 16; // px kept between the bubble and the viewport edge
const DRAG_THRESHOLD = 5; // px of movement before a press becomes a drag

function readDismissed(): boolean {
  try {
    return sessionStorage.getItem(DISMISS_KEY) === "1";
  } catch {
    return false;
  }
}

function persistDismissed() {
  try {
    sessionStorage.setItem(DISMISS_KEY, "1");
  } catch {
    /* private mode / storage disabled — dismissal just won't persist */
  }
}

/**
 * Floating promo-video bubble on the product page. Autoplays a muted, looping
 * preview; tap opens a full-screen player with sound. The bubble can be dragged
 * anywhere on screen. `preload="metadata"` + the server's Range support
 * (src/app/videos/[...path]) mean the clip streams progressively.
 */
export default function ProductPromoVideo({ videoUrl, poster, productId }: ProductPromoVideoProps) {
  const [dismissed, setDismissed] = useState(true); // assume dismissed until mount check
  const [showVideo, setShowVideo] = useState(false);
  const [expanded, setExpanded] = useState(false);
  // null => not yet moved, positioned bottom-right via CSS. Once dragged we
  // switch to explicit top/left coordinates.
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const bubbleVideoRef = useRef<HTMLVideoElement>(null);
  const modalVideoRef = useRef<HTMLVideoElement>(null);
  const drag = useRef({
    active: false,
    moved: false,
    pointerId: -1,
    startX: 0,
    startY: 0,
    originX: 0,
    originY: 0,
    width: 0,
    height: 0,
  });

  // sessionStorage is client-only, so the first render always assumes dismissed
  // (renders nothing) and this effect reconciles once mounted. Also re-runs on
  // SPA navigation between products.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- syncing from sessionStorage, unavailable during render
    setDismissed(readDismissed());
    setExpanded(false);
    setShowVideo(false);
    setPos(null);
  }, [productId]);

  // Defer mounting the bubble <video> so it doesn't compete with the product
  // page's own initial load.
  useEffect(() => {
    if (dismissed) return;
    const t = setTimeout(() => setShowVideo(true), 1200);
    return () => clearTimeout(t);
  }, [dismissed]);

  // Pause the little preview while the full player is open.
  useEffect(() => {
    const bubble = bubbleVideoRef.current;
    if (!bubble) return;
    if (expanded) {
      bubble.pause();
    } else {
      bubble.play().catch(() => {});
    }
  }, [expanded, showVideo]);

  // Full player opens with sound.
  useEffect(() => {
    if (!expanded) return;
    const modal = modalVideoRef.current;
    if (modal) {
      modal.muted = false;
      modal.play().catch(() => {});
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setExpanded(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [expanded]);

  const clamp = useCallback((x: number, y: number, w: number, h: number) => {
    const maxX = window.innerWidth - w - EDGE_GAP;
    const maxY = window.innerHeight - h - EDGE_GAP;
    return {
      x: Math.min(Math.max(x, EDGE_GAP), Math.max(maxX, EDGE_GAP)),
      y: Math.min(Math.max(y, EDGE_GAP), Math.max(maxY, EDGE_GAP)),
    };
  }, []);

  // Keep the bubble on screen when the viewport is resized.
  useEffect(() => {
    if (dismissed) return;
    const onResize = () => {
      const el = containerRef.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      setPos(clamp(r.left, r.top, r.width, r.height));
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [dismissed, clamp]);

  if (dismissed) return null;

  const handleDismiss = (e: React.MouseEvent) => {
    e.stopPropagation();
    persistDismissed();
    setDismissed(true);
  };

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    const el = containerRef.current;
    if (!el || e.button !== 0) return;
    const r = el.getBoundingClientRect();
    drag.current = {
      active: true,
      moved: false,
      pointerId: e.pointerId,
      startX: e.clientX,
      startY: e.clientY,
      originX: r.left,
      originY: r.top,
      width: r.width,
      height: r.height,
    };
  };

  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const d = drag.current;
    if (!d.active) return;
    const dx = e.clientX - d.startX;
    const dy = e.clientY - d.startY;
    if (!d.moved) {
      if (Math.hypot(dx, dy) < DRAG_THRESHOLD) return;
      d.moved = true;
      containerRef.current?.setPointerCapture(d.pointerId);
    }
    setPos(clamp(d.originX + dx, d.originY + dy, d.width, d.height));
  };

  const endDrag = (e: React.PointerEvent<HTMLDivElement>) => {
    const d = drag.current;
    if (!d.active) return;
    const wasTap = !d.moved;
    if (containerRef.current?.hasPointerCapture(d.pointerId)) {
      containerRef.current.releasePointerCapture(d.pointerId);
    }
    d.active = false;
    d.moved = false;
    if (wasTap && e.type === "pointerup") setExpanded(true);
  };

  const positionStyle: React.CSSProperties = pos
    ? { left: pos.x, top: pos.y, right: "auto", bottom: "auto" }
    : { right: EDGE_GAP, bottom: EDGE_GAP };

  return (
    <>
      {/* ── Floating, draggable bubble ──────────────────────────── */}
      <div
        ref={containerRef}
        role="button"
        tabIndex={0}
        aria-label="Play product video"
        data-cursor-text="MOVE"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            setExpanded(true);
          }
        }}
        className="fixed z-40 w-28 sm:w-36 overflow-hidden rounded-lg shadow-xl select-none"
        style={{
          ...positionStyle,
          aspectRatio: "9 / 16",
          border: "2px solid #5B1C1C",
          backgroundColor: "#1A1212",
          touchAction: "none",
          cursor: "grab",
        }}
      >
        {poster && (
          // eslint-disable-next-line @next/next/no-img-element -- admin-uploaded path
          <img
            src={poster}
            alt=""
            aria-hidden
            draggable={false}
            className="pointer-events-none absolute inset-0 h-full w-full object-cover"
          />
        )}

        {showVideo && (
          <video
            ref={bubbleVideoRef}
            src={videoUrl}
            poster={poster ?? undefined}
            muted
            loop
            playsInline
            autoPlay
            preload="metadata"
            className="pointer-events-none absolute inset-0 h-full w-full object-cover"
          />
        )}

        <span className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-black/45 backdrop-blur-sm">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="#FFF9EF" aria-hidden>
              <path d="M8 5v14l11-7z" />
            </svg>
          </span>
        </span>

        <button
          type="button"
          onPointerDown={(e) => e.stopPropagation()}
          onClick={handleDismiss}
          aria-label="Dismiss product video"
          className="absolute top-1 right-1 flex h-5 w-5 items-center justify-center rounded-full bg-black/55 backdrop-blur-sm cursor-pointer"
        >
          <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="#FFF9EF" strokeWidth={3} aria-hidden>
            <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
          </svg>
        </button>
      </div>

      {/* ── Expanded full player ────────────────────────────────── */}
      {expanded && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Product video"
          onClick={() => setExpanded(false)}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
        >
          <div className="relative" onClick={(e) => e.stopPropagation()}>
            <video
              ref={modalVideoRef}
              src={videoUrl}
              poster={poster ?? undefined}
              controls
              autoPlay
              playsInline
              preload="auto"
              className="max-h-[85vh] max-w-[92vw] w-auto"
            />
            <button
              type="button"
              onClick={() => setExpanded(false)}
              aria-label="Close video"
              className="absolute -top-3 -right-3 flex h-9 w-9 items-center justify-center rounded-full cursor-pointer"
              style={{ backgroundColor: "#5B1C1C" }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#FFF9EF" strokeWidth={2.5} aria-hidden>
                <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
              </svg>
            </button>
          </div>
        </div>
      )}
    </>
  );
}
