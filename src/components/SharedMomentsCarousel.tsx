"use client";

import { useEffect, useRef, useState } from "react";
import gsap from "gsap";
import { sectionBackgroundStyle, type SectionBackgroundFit } from "@/lib/sectionBackground";
import { TITLE_CLASS, titleStyle } from "@/lib/typography";

interface SharedMomentsItem {
  id: string;
  caption: string;
  videoUrl: string;
  thumbnailImage: string;
}

interface SharedMomentsCarouselProps {
  items: SharedMomentsItem[];
  kicker: string;
  title: string;
  backgroundImage?: string;
  backgroundImageFit?: SectionBackgroundFit;
}

const FASTENERS = ["tape", "pin", "corner"] as const;
const OFFSETS = [0, 18, 36];
const TAPE_COLORS = ["#5B1C1C", "#7A2E2E"];

// Deterministic per-item rotation so each reel gets a stable, visually-varied
// tilt across renders without persisting a tilt value anywhere.
function hashToRange(seed: string, min: number, max: number): number {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash << 5) - hash + seed.charCodeAt(i);
    hash |= 0;
  }
  const normalized = (Math.abs(hash) % 1000) / 1000; // 0..1
  return min + normalized * (max - min);
}

function hashBucket(seed: string, buckets: number): number {
  return Math.floor(hashToRange(seed, 0, buckets));
}

export default function SharedMomentsCarousel({ items, kicker, title, backgroundImage, backgroundImageFit }: SharedMomentsCarouselProps) {
  const trackRef = useRef<HTMLDivElement>(null);
  const dragState = useRef({ dragging: false, startX: 0, startScrollLeft: 0 });
  const [playingId, setPlayingId] = useState<string | null>(null);

  // Playback is tap-gated (see handleToggleVideo) so clips never fetch/decode
  // until a visitor asks for them. This observer only pauses a playing clip
  // once it scrolls out of view, it never starts playback on its own.
  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;

    const videos = Array.from(track.querySelectorAll("video"));
    if (videos.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) continue;
          const video = entry.target as HTMLVideoElement;
          video.pause();
          setPlayingId((current) => (current === video.dataset.id ? null : current));
        }
      },
      { root: track, threshold: 0.6 }
    );

    videos.forEach((video) => observer.observe(video));
    return () => observer.disconnect();
  }, [items]);

  const handleToggleVideo = (e: React.MouseEvent<HTMLButtonElement>, itemId: string) => {
    const track = trackRef.current;
    const video = e.currentTarget.parentElement?.querySelector("video");
    if (!track || !video) return;

    if (!video.paused) {
      video.pause();
      setPlayingId(null);
      return;
    }

    // Single-clip-at-a-time: pause any other reel before starting this one.
    track.querySelectorAll("video").forEach((other) => {
      if (other !== video) other.pause();
    });
    video.play().catch(() => {});
    setPlayingId(itemId);
  };

  const handleNavClick = (direction: "prev" | "next") => {
    const track = trackRef.current;
    if (!track) return;

    gsap.killTweensOf(track);
    const scrollAmount = window.innerWidth >= 768 ? 320 : 260;
    const target = direction === "prev" ? track.scrollLeft - scrollAmount : track.scrollLeft + scrollAmount;

    gsap.to(track, { scrollLeft: target, duration: 0.6, ease: "power3.out" });
  };

  // Mouse-only drag-to-scroll; touch/pen keep the native overflow-x scroll
  // path untouched so they never fight the IntersectionObserver above.
  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.pointerType !== "mouse") return;
    const track = trackRef.current;
    if (!track) return;

    gsap.killTweensOf(track);
    dragState.current = { dragging: true, startX: e.clientX, startScrollLeft: track.scrollLeft };
    track.setPointerCapture(e.pointerId);
    track.setAttribute("data-cursor-text", "DRAGGING");
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const state = dragState.current;
    if (!state.dragging) return;
    const track = trackRef.current;
    if (!track) return;

    const delta = e.clientX - state.startX;
    track.scrollLeft = state.startScrollLeft - delta;
  };

  const endDrag = () => {
    if (!dragState.current.dragging) return;
    dragState.current.dragging = false;
    trackRef.current?.setAttribute("data-cursor-text", "DRAG");
  };

  return (
    <section
      className="relative px-6 md:px-12 py-10 md:py-16 reveal-fade-up"
      style={{ backgroundColor: "#F8F1E5", ...sectionBackgroundStyle(backgroundImage, backgroundImageFit) }}
    >
      {/* Corkboard texture: fine crossed grain + sparse cork flecks */}
      <div
        className="absolute inset-0 opacity-[0.045] mix-blend-overlay pointer-events-none"
        style={{
          backgroundImage: `repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(26,18,18,0.35) 2px, rgba(26,18,18,0.35) 3px), repeating-linear-gradient(90deg, transparent, transparent 3px, rgba(26,18,18,0.18) 3px, rgba(26,18,18,0.18) 4px)`,
        }}
      />
      <div
        className="absolute inset-0 opacity-[0.05] mix-blend-overlay pointer-events-none"
        style={{ backgroundImage: "radial-gradient(rgba(26,18,18,0.5) 1px, transparent 1.5px)", backgroundSize: "14px 14px" }}
      />

      <div className="relative z-10 mb-14 flex flex-row items-end justify-between">
        <div>
          <span
            className="font-sans font-bold uppercase tracking-[0.3em] mb-2 block"
            style={{ fontSize: "9px", color: "#5B1C1C" }}
          >
            {kicker}
          </span>
          <h2 className={TITLE_CLASS} style={titleStyle("clamp(2rem, 4vw, 3rem)")}>
            {title}
          </h2>
        </div>

        <div className="flex items-center gap-4">
          <button
            onClick={() => handleNavClick("prev")}
            className="w-10 h-10 flex items-center justify-center border border-black/10 hover:border-black/35 hover:text-[#5B1C1C] transition-colors cursor-pointer"
            aria-label="Previous"
            data-cursor-text="PREV"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <path d="M19 12H5M12 19l-7-7 7-7" />
            </svg>
          </button>
          <button
            onClick={() => handleNavClick("next")}
            className="w-10 h-10 flex items-center justify-center border border-black/10 hover:border-black/35 hover:text-[#5B1C1C] transition-colors cursor-pointer"
            aria-label="Next"
            data-cursor-text="NEXT"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <path d="M5 12h14M12 5l7 7 7 7" />
            </svg>
          </button>
        </div>
      </div>

      <div
        ref={trackRef}
        className="relative z-10 flex items-start gap-8 md:gap-10 overflow-x-auto scrollbar-none py-6"
        style={{ scrollBehavior: "auto", WebkitOverflowScrolling: "touch" }}
        data-cursor-text="DRAG"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={endDrag}
        onPointerLeave={endDrag}
        onPointerCancel={endDrag}
      >
        {items.map((item, index) => {
          const fastener = FASTENERS[hashBucket(item.id + "-fastener", FASTENERS.length)];
          const offsetPx = OFFSETS[hashBucket(item.id + "-offset", OFFSETS.length)];
          const tapeColor = TAPE_COLORS[hashBucket(item.id + "-tint", TAPE_COLORS.length)];

          return (
            <div
              key={item.id}
              className="reveal-stagger-item flex-shrink-0"
              style={{ width: 220, marginTop: offsetPx }}
            >
              <div
                className={`tape-frame tape-frame--${fastener} block w-full group`}
                style={
                  {
                    "--tilt": `${
                      index % 2 === 0
                        ? hashToRange(item.id, 1, 4)
                        : hashToRange(item.id, -4, -1)
                    }deg`,
                    "--tape-tilt": `${hashToRange(item.id + "-tape", -6, 6)}deg`,
                    "--tape-color": tapeColor,
                  } as React.CSSProperties
                }
              >
                <div className="relative overflow-hidden" style={{ aspectRatio: "9/16" }}>
                  {item.videoUrl ? (
                    <>
                      <video
                        data-id={item.id}
                        src={item.videoUrl}
                        poster={item.thumbnailImage}
                        muted
                        loop
                        playsInline
                        preload="none"
                        className="absolute inset-0 w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                      />
                      <button
                        type="button"
                        onClick={(e) => handleToggleVideo(e, item.id)}
                        aria-label={playingId === item.id ? "Pause video" : "Play video"}
                        className="absolute inset-0 flex items-center justify-center cursor-pointer"
                        data-cursor-text={playingId === item.id ? "PAUSE" : "PLAY"}
                      >
                        <span
                          className="w-11 h-11 rounded-full flex items-center justify-center bg-black/40 backdrop-blur-sm transition-opacity duration-300"
                          style={{ opacity: playingId === item.id ? 0 : 1 }}
                        >
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="#FFF9EF">
                            <path d="M8 5v14l11-7z" />
                          </svg>
                        </span>
                      </button>
                    </>
                  ) : (
                    // eslint-disable-next-line @next/next/no-img-element -- variable admin-uploaded paths, unsuitable for next/image
                    <img
                      src={item.thumbnailImage}
                      alt={item.caption || "Shared moment"}
                      className="absolute inset-0 w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                      loading="lazy"
                    />
                  )}

                  {item.caption && (
                    <div className="absolute inset-0 flex flex-col justify-end p-3 bg-black/0 group-hover:bg-black/35 transition-colors pointer-events-none">
                      <p
                        className="font-serif text-white leading-snug opacity-0 group-hover:opacity-100 transition-opacity duration-300 caption-clamp-2"
                        style={{ fontSize: "11px" }}
                      >
                        {item.caption}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
