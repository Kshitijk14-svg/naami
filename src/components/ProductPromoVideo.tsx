"use client";

import { useEffect, useRef, useState } from "react";

interface ProductPromoVideoProps {
  videoUrl: string;
  poster?: string | null;
  productId: number;
}

const DISMISS_KEY = "promoVideo:dismissed";

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
 * Floating promo-video bubble on the product page. The bubble autoplays a
 * muted, looping preview; tapping it opens a full-screen player with sound.
 * `preload="metadata"` + the server's Range support (src/app/videos/[...path])
 * mean the clip streams progressively instead of downloading up front.
 */
export default function ProductPromoVideo({ videoUrl, poster, productId }: ProductPromoVideoProps) {
  const [dismissed, setDismissed] = useState(true); // assume dismissed until mount check
  const [showVideo, setShowVideo] = useState(false);
  const [expanded, setExpanded] = useState(false);

  const bubbleVideoRef = useRef<HTMLVideoElement>(null);
  const modalVideoRef = useRef<HTMLVideoElement>(null);

  // sessionStorage is client-only, so the first render always assumes dismissed
  // (renders nothing) and this effect reconciles once mounted. Also re-runs on
  // SPA navigation between products.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- syncing from sessionStorage, unavailable during render
    setDismissed(readDismissed());
    setExpanded(false);
    setShowVideo(false);
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

  if (dismissed) return null;

  const handleDismiss = (e: React.MouseEvent) => {
    e.stopPropagation();
    persistDismissed();
    setDismissed(true);
  };

  return (
    <>
      {/* ── Floating bubble ─────────────────────────────────────── */}
      <div
        className="fixed bottom-4 right-4 z-40 w-28 sm:w-36 overflow-hidden rounded-lg shadow-xl"
        style={{
          aspectRatio: "9 / 16",
          border: "2px solid #5B1C1C",
          backgroundColor: "#1A1212",
        }}
      >
        {poster && (
          // eslint-disable-next-line @next/next/no-img-element -- admin-uploaded path
          <img
            src={poster}
            alt=""
            aria-hidden
            className="absolute inset-0 h-full w-full object-cover"
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
            className="absolute inset-0 h-full w-full object-cover"
          />
        )}

        <button
          type="button"
          onClick={() => setExpanded(true)}
          aria-label="Play product video"
          className="absolute inset-0 flex items-center justify-center cursor-pointer"
          data-cursor-text="PLAY"
        >
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-black/45 backdrop-blur-sm">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="#FFF9EF" aria-hidden>
              <path d="M8 5v14l11-7z" />
            </svg>
          </span>
        </button>

        <button
          type="button"
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
