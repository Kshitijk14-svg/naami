"use client";

import React, { useState, useRef, useEffect } from "react";
import gsap from "gsap";
import { sectionBackgroundStyle, type SectionBackgroundFit } from "@/lib/sectionBackground";
import { PRODUCT_NAME_CLASS, TITLE_CLASS, TITLE_ACCENT_CLASS, TITLE_ACCENT_STYLE, titleStyle } from "@/lib/typography";

export interface CoinPocketContent {
  kicker: string;
  title: string;
  titleAccent: string;
  description: string;
  specs: { label: string; value: string }[];
  serialCode: string;
  seasonTag: string;
}

interface CoinPocketRevealProps {
  content: CoinPocketContent;
  backgroundImage?: string;
  backgroundImageFit?: SectionBackgroundFit;
}

export default function CoinPocketReveal({ content, backgroundImage, backgroundImageFit }: CoinPocketRevealProps) {
  const [dragY, setDragY] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [isRevealed, setIsRevealed] = useState(false);
  const [frameHeight, setFrameHeight] = useState(504);

  const startY = useRef(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const frameRef = useRef<HTMLDivElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const tabRef = useRef<HTMLDivElement>(null);

  // Geometry is derived from the frame height so the pocket slot stays
  // aligned when the responsive frame shrinks below its 420px max width.
  const HEM_TOP = Math.round(frameHeight * 0.74); // pocket panel top edge
  const CARD_REST_TOP = HEM_TOP + 12; // card fully tucked behind the panel
  // Maximum pull distance: fully revealed card top lands at ~24px, so the whole
  // certificate clears the pocket panel instead of its footer tucking under it.
  const MAX_DRAG = Math.max(120, CARD_REST_TOP - 24);
  // Pull distance past which release snaps fully open
  const SNAP_THRESHOLD = Math.round(MAX_DRAG * 0.4);
  // Shrink the card on small frames so the full certificate clears the slot
  const cardScale = Math.min(1, frameHeight / 504);

  useEffect(() => {
    const frame = frameRef.current;
    if (!frame) return;
    const observer = new ResizeObserver(() => setFrameHeight(frame.clientHeight));
    observer.observe(frame);
    setFrameHeight(frame.clientHeight);
    return () => observer.disconnect();
  }, []);

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
    startY.current = e.clientY + dragY;
    if (tabRef.current) {
      tabRef.current.setPointerCapture(e.pointerId);
    }
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging) return;
    // Upward movement increases the pull distance
    const deltaY = startY.current - e.clientY;

    const constrainedY = Math.max(0, Math.min(MAX_DRAG, deltaY));
    setDragY(constrainedY);
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging) return;
    setIsDragging(false);
    if (tabRef.current) {
      tabRef.current.releasePointerCapture(e.pointerId);
    }

    // Snapping logic
    if (dragY >= SNAP_THRESHOLD) {
      // Snap fully open
      animateToValue(MAX_DRAG);
      setIsRevealed(true);
    } else {
      // Snap back into the pocket
      animateToValue(0);
      setIsRevealed(false);
    }
  };

  const animateToValue = (targetValue: number) => {
    const obj = { val: dragY };
    gsap.to(obj, {
      val: targetValue,
      duration: 0.65,
      ease: "elastic.out(1, 0.45)",
      onUpdate: () => {
        // Cap the elastic overshoot so the tab never leaves the frame
        setDragY(Math.min(obj.val, MAX_DRAG + 8));
      },
    });
  };

  const resetReveal = () => {
    animateToValue(0);
    setIsRevealed(false);
  };

  // Color schemes matching the NAAMI brand guidelines
  const INDIGO_DENIM_BG = "#131E33"; // deep dark indigo dye color
  const COPPER_STITCH = "#C58B3F";
  const ECRU = "#F8F1E5";

  const hintVisible = !isDragging;

  return (
    <section
      ref={containerRef}
      className="px-0 md:px-12 py-10 md:py-16 relative overflow-hidden"
      style={{ backgroundColor: "#FFF9EF", ...sectionBackgroundStyle(backgroundImage, backgroundImageFit) }}
    >
      <div className="px-4 md:px-0 max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-12 md:gap-16 items-center">

        {/* Left Editorial Copy Column */}
        <div className="lg:col-span-5 text-left z-10">
          <span
            className="font-sans font-bold uppercase tracking-[0.3em] mb-3 block"
            style={{ fontSize: "9px", color: "#5B1C1C" }}
          >
            {content.kicker}
          </span>
          <h2 className={`${TITLE_CLASS} mb-6`} style={titleStyle("clamp(2rem, 4vw, 3rem)")}>
            {content.title}
            <br />
            <span className={TITLE_ACCENT_CLASS} style={TITLE_ACCENT_STYLE}>
              {content.titleAccent}
            </span>
          </h2>
          <p className="font-sans text-[12.5px] text-[#1A1212]/70 leading-relaxed mb-8 max-w-md">
            {content.description}
          </p>
        </div>

        {/* Right Pocket Visualizer Column */}
        <div className="lg:col-span-7 flex flex-col justify-center items-center py-6 w-full gap-6">
          <div
            ref={frameRef}
            className="relative overflow-hidden w-full max-w-[420px] shadow-[0_30px_60px_rgba(17,17,17,0.22)]"
            style={{
              aspectRatio: "1/1.2",
              backgroundColor: INDIGO_DENIM_BG,
              borderRadius: "4px",
              border: "1px solid rgba(255,255,255,0.06)",
            }}
          >
            {/* Denim weave texture: twill lines in both directions */}
            <div
              className="absolute inset-0 opacity-[0.06] mix-blend-overlay pointer-events-none"
              style={{
                backgroundImage: `repeating-linear-gradient(
                  45deg,
                  #FFF9EF,
                  #FFF9EF 1px,
                  transparent 1px,
                  transparent 4px
                )`,
              }}
            />
            <div
              className="absolute inset-0 opacity-[0.04] mix-blend-overlay pointer-events-none"
              style={{
                backgroundImage: `repeating-linear-gradient(
                  -45deg,
                  #FFF9EF,
                  #FFF9EF 1px,
                  transparent 1px,
                  transparent 5px
                )`,
              }}
            />
            {/* Fabric grain noise */}
            <div
              className="absolute inset-0 opacity-[0.05] mix-blend-overlay pointer-events-none"
              style={{
                backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='120' height='120'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2'/%3E%3C/filter%3E%3Crect width='120' height='120' filter='url(%23n)'/%3E%3C/svg%3E")`,
              }}
            />
            {/* Worn-denim wash (lighter faded center) */}
            <div
              className="absolute inset-0 pointer-events-none"
              style={{
                backgroundImage:
                  "radial-gradient(ellipse 70% 45% at 50% 32%, rgba(250,248,245,0.09), transparent 70%)",
              }}
            />

            {/* Decorative yoke double stitching across the upper panel */}
            <svg
              className="absolute inset-0 w-full h-full pointer-events-none"
              viewBox="0 0 340 408"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M -20 150 C 80 150 190 100 300 -30"
                stroke={COPPER_STITCH}
                strokeWidth="1.5"
                strokeDasharray="4 2"
              />
              <path
                d="M -20 156 C 80 156 192 106 302 -24"
                stroke={COPPER_STITCH}
                strokeWidth="1.5"
                strokeDasharray="4 2"
              />
            </svg>

            {/* Copper rivet, top-right of the yoke */}
            <div
              className="absolute rounded-full border border-black/35"
              style={{
                top: "18px",
                right: "84px",
                width: "12px",
                height: "12px",
                background:
                  "radial-gradient(circle at 30% 30%, #E8A25D, #B87333 55%, #7A4A21)",
                boxShadow: "0 1px 2px rgba(0,0,0,0.4)",
              }}
            />

            {/* ── THE BESPOKE CERTIFICATE CARD (rests inside the pocket, pulled UP to reveal) ── */}
            {/* Rectangular clip wrapper: the card's composited transform layer can
                bleed a subpixel row past the frame's rounded overflow clip */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none" style={{ zIndex: 10 }}>
            <div
              ref={cardRef}
              className="absolute left-1/2 -translate-x-1/2 p-6 flex flex-col justify-between shadow-[0_20px_40px_rgba(0,0,0,0.28)] select-none border border-black/10 pointer-events-auto"
              style={{
                top: `${CARD_REST_TOP}px`, // Hidden state: fully behind the pocket panel
                width: "280px",
                height: "320px",
                paddingBottom: "56px", // keeps the footer clear of the pocket slot at full reveal
                backgroundColor: "#EDE6D5", // vintage thick paper color
                transform: `translateY(${-dragY}px) scale(${cardScale})`,
                transformOrigin: "top center",
                willChange: "transform",
                zIndex: 10,
              }}
            >
              {/* ── LEATHER NAAMI PULL TAB (stitched to the card's top edge) ── */}
              <div
                ref={tabRef}
                onPointerDown={handlePointerDown}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
                className="absolute left-1/2 -translate-x-1/2 cursor-grab active:cursor-grabbing"
                style={{
                  top: "-52px",
                  width: "64px",
                  height: "52px",
                  touchAction: "none",
                }}
                data-cursor-text={
                  isDragging
                    ? isRevealed
                      ? "TUCKING"
                      : "PULLING"
                    : isRevealed
                      ? "TUCK"
                      : "PULL"
                }
              >
                {/* Embossed leather patch */}
                <div
                  className="absolute inset-x-0 top-0 flex items-center justify-center"
                  style={{
                    height: "40px",
                    borderRadius: "6px 6px 0 0",
                    background: "linear-gradient(180deg, #A96B3F 0%, #8B5527 100%)",
                    border: "1px solid rgba(0,0,0,0.25)",
                    boxShadow:
                      "0 2px 6px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.18)",
                  }}
                >
                  <div
                    className="absolute pointer-events-none"
                    style={{
                      inset: "3px",
                      border: "1px dashed rgba(237,232,220,0.5)",
                      borderRadius: "4px 4px 0 0",
                    }}
                  />
                  <span
                    className="font-serif font-bold uppercase"
                    style={{
                      fontSize: "9px",
                      letterSpacing: "0.22em",
                      color: "#5C3317",
                      textShadow: "0 1px 0 rgba(255,235,205,0.35)",
                    }}
                  >
                    NAAMI
                  </span>
                </div>
                {/* Strap stem running into the slot */}
                <div
                  className="absolute left-1/2 -translate-x-1/2"
                  style={{
                    top: "40px",
                    width: "40px",
                    height: "12px",
                    background: "#8B5527",
                  }}
                />
              </div>

              {/* Certificate Inner details */}
              <div className="flex flex-col h-full justify-between">
                {/* Header branding */}
                <div>
                  <div className="flex justify-between items-baseline mb-2">
                    <span className="font-sans font-bold text-[10px] text-[#5B1C1C] tracking-widest">
                      NAAMI ATELIER CARD
                    </span>
                    <span className="font-sans text-[9px] text-[#1A1212]/40">
                      {content.seasonTag}
                    </span>
                  </div>
                  <h3 className={`${PRODUCT_NAME_CLASS} text-base text-[#1A1212] tracking-wider border-b border-[#5B1C1C]/10 pb-2`}>
                    Authenticity Card
                  </h3>
                </div>

                {/* Specs list */}
                <div className="flex flex-col gap-2.5 my-3 font-sans text-[11.5px]">
                  {content.specs.map(({ label, value }) => (
                    <div key={label} className="flex justify-between border-b border-black/5 pb-1">
                      <span className="font-bold text-[#1A1212]/35">{label}</span>
                      <span className="text-[#1A1212]/85">{value}</span>
                    </div>
                  ))}
                </div>

                {/* Footer seal */}
                <div className="pt-2 border-t border-[#5B1C1C]/15 flex items-center justify-between">
                  <div className="flex flex-col">
                    <span className="font-sans font-bold text-[8px] text-[#1A1212]/45">SERIAL CODE</span>
                    <span className="font-sans font-bold text-[11px] text-[#1A1212] tracking-wider">
                      {content.serialCode}
                    </span>
                  </div>
                  {/* Crimson logo stamp */}
                  <div
                    className="w-9 h-9 rounded-full flex items-center justify-center font-serif text-[12px] font-bold border border-dashed border-[#5B1C1C]/35 text-[#5B1C1C]"
                    style={{ backgroundColor: "rgba(139,26,26,0.04)" }}
                  >
                    N
                  </div>
                </div>
              </div>
            </div>
            </div>

            {/* Slot shadow: darkens the card as it enters the pocket mouth */}
            <div
              className="absolute left-1/2 -translate-x-1/2 pointer-events-none"
              style={{
                top: `${HEM_TOP - 16}px`,
                width: "min(320px, 92%)",
                height: "16px",
                background:
                  "linear-gradient(to bottom, transparent, rgba(0,0,0,0.45))",
                zIndex: 12,
              }}
            />

            {/* PULL affordance hint (above the tab while the card is tucked) */}
            <div
              className="absolute left-1/2 -translate-x-1/2 flex flex-col items-center gap-1 pointer-events-none transition-opacity duration-300"
              style={{
                top: `${HEM_TOP - 96}px`,
                zIndex: 15,
                opacity: !isRevealed && hintVisible ? 1 : 0,
              }}
            >
              <svg className="animate-bounce" width="14" height="9" viewBox="0 0 14 9" fill="none">
                <polyline points="1,8 7,1 13,8" stroke={ECRU} strokeWidth="1.5" />
              </svg>
              <span
                className="font-sans font-bold uppercase"
                style={{ fontSize: "8px", letterSpacing: "0.35em", color: "rgba(237,232,220,0.75)" }}
              >
                Pull
              </span>
            </div>

            {/* ── THE WATCH POCKET PANEL (Foreground panel covering the card) ── */}
            <div
              className="absolute left-0 right-0"
              style={{
                top: `${HEM_TOP}px`,
                bottom: "-2px", // overshoot the frame edge so no seam shows the card behind
                backgroundColor: INDIGO_DENIM_BG,
                zIndex: 20,
                boxShadow: "0 -4px 12px rgba(19, 30, 51, 0.4)",
              }}
            >
              {/* Hem top-edge highlight */}
              <div
                className="absolute inset-x-0 top-0 pointer-events-none"
                style={{ height: "1px", backgroundColor: "rgba(250,248,245,0.25)" }}
              />
              {/* Double-needle hem stitching */}
              <div
                className="absolute inset-x-0 pointer-events-none"
                style={{ top: "4px", borderTop: `1.5px dashed ${COPPER_STITCH}` }}
              />
              <div
                className="absolute inset-x-0 pointer-events-none"
                style={{ top: "9px", borderTop: `1.5px dashed rgba(197,139,63,0.65)` }}
              />

              {/* TUCK affordance hint (inside the pocket while the card is out) */}
              <div
                className="absolute left-1/2 -translate-x-1/2 flex flex-col items-center gap-1 pointer-events-none transition-opacity duration-300"
                style={{
                  top: "24px",
                  zIndex: 30,
                  opacity: isRevealed && hintVisible ? 1 : 0,
                }}
              >
                <span
                  className="font-sans font-bold uppercase"
                  style={{ fontSize: "8px", letterSpacing: "0.35em", color: "rgba(237,232,220,0.75)" }}
                >
                  Tuck
                </span>
                <svg className="animate-bounce" width="14" height="9" viewBox="0 0 14 9" fill="none">
                  <polyline points="1,1 7,8 13,1" stroke={ECRU} strokeWidth="1.5" />
                </svg>
              </div>

              {/* Coin pocket outline stitching */}
              <div
                className="absolute left-1/2 -translate-x-1/2 border-l border-r border-b border-[#C58B3F]/70"
                style={{
                  top: "0px",
                  width: "190px",
                  height: "calc(100% - 36px)",
                  borderBottomLeftRadius: "8px",
                  borderBottomRightRadius: "8px",
                  backgroundImage: `linear-gradient(rgba(255,255,255,0.01), rgba(0,0,0,0.08))`,
                }}
              >
                {/* Pocket hem double stitching inner */}
                <div
                  className="absolute inset-x-2 bottom-2"
                  style={{
                    top: "10px",
                    border: "0.8px dashed rgba(197,139,63,0.4)",
                    borderBottomLeftRadius: "6px",
                    borderBottomRightRadius: "6px",
                  }}
                />

                {/* Bar-tack reinforcement stitches at the pocket mouth corners */}
                <div
                  className="absolute pointer-events-none"
                  style={{
                    top: "4px",
                    left: "-4px",
                    width: "8px",
                    height: "18px",
                    backgroundImage: `repeating-linear-gradient(0deg, ${COPPER_STITCH} 0 2px, transparent 2px 4px)`,
                    opacity: 0.85,
                  }}
                />
                <div
                  className="absolute pointer-events-none"
                  style={{
                    top: "4px",
                    right: "-4px",
                    width: "8px",
                    height: "18px",
                    backgroundImage: `repeating-linear-gradient(0deg, ${COPPER_STITCH} 0 2px, transparent 2px 4px)`,
                    opacity: 0.85,
                  }}
                />

                {/* Left pocket rivet */}
                <div
                  className="absolute top-2 left-2 rounded-full"
                  style={{
                    width: "6px",
                    height: "6px",
                    background:
                      "radial-gradient(circle at 30% 30%, #E8A25D, #B87333 55%, #7A4A21)",
                    boxShadow: "0 1px 1px rgba(0,0,0,0.4)",
                  }}
                />

                {/* Right pocket rivet */}
                <div
                  className="absolute top-2 right-2 rounded-full"
                  style={{
                    width: "6px",
                    height: "6px",
                    background:
                      "radial-gradient(circle at 30% 30%, #E8A25D, #B87333 55%, #7A4A21)",
                    boxShadow: "0 1px 1px rgba(0,0,0,0.4)",
                  }}
                />
              </div>
            </div>

          </div>

          {/* Pull / Reset hint, below the pocket visual */}
          <div className="flex items-center gap-4">
            {!isRevealed ? (
              <div className="flex items-center gap-2">
                <span className="animate-pulse w-2 h-2 rounded-full bg-[#5B1C1C]" />
                <span className="font-sans font-bold text-[9px] text-[#5B1C1C] tracking-wider uppercase">
                  Pull the leather tab upwards
                </span>
              </div>
            ) : (
              <button
                onClick={resetReveal}
                className="font-sans font-bold text-[9px] text-[#1A1212]/40 tracking-wider uppercase hover:text-[#5B1C1C] transition-colors cursor-pointer"
                data-cursor-text="RESET"
              >
                ✕ Re-hide Card
              </button>
            )}
          </div>
        </div>

      </div>
    </section>
  );
}
