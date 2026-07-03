"use client";

import React, { useState, useRef, useEffect } from "react";
import gsap from "gsap";

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
}

export default function CoinPocketReveal({ content }: CoinPocketRevealProps) {
  const [dragY, setDragY] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [isRevealed, setIsRevealed] = useState(false);

  const startY = useRef(0);
  const currentY = useRef(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const loopRef = useRef<HTMLDivElement>(null);

  // Maximum pull distance in pixels
  const MAX_DRAG = 260;
  // Snap threshold to trigger full lock-open
  const SNAP_THRESHOLD = 110;

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
    startY.current = e.clientY - dragY;
    if (loopRef.current) {
      loopRef.current.setPointerCapture(e.pointerId);
    }
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging) return;
    const deltaY = e.clientY - startY.current;

    // Constrain drag to only go downwards (positive Y) and cap at MAX_DRAG
    const constrainedY = Math.max(0, Math.min(MAX_DRAG, deltaY));
    setDragY(constrainedY);
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging) return;
    setIsDragging(false);
    if (loopRef.current) {
      loopRef.current.releasePointerCapture(e.pointerId);
    }

    // Snapping logic
    if (dragY >= SNAP_THRESHOLD) {
      // Snap fully open
      animateToValue(240);
      setIsRevealed(true);
    } else {
      // Snap back hidden
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
        setDragY(obj.val);
      },
    });
  };

  const resetReveal = () => {
    animateToValue(0);
    setIsRevealed(false);
  };

  // Color schemes matching the NAAMI brand guidelines
  const INDIGO_DENIM_BG = "#131E33"; // deep dark indigo dye color
  const PARCHMENT_BG = "#FAF8F5";

  return (
    <section
      ref={containerRef}
      className="px-6 md:px-12 py-24 relative overflow-hidden"
      style={{ backgroundColor: "#F4F0E6" }}
    >
      <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-12 md:gap-16 items-center">
        
        {/* Left Editorial Copy Column */}
        <div className="lg:col-span-5 text-left z-10">
          <span
            className="font-sans font-bold uppercase tracking-[0.3em] mb-3 block"
            style={{ fontSize: "9px", color: "#8B1A1A" }}
          >
            {content.kicker}
          </span>
          <h2
            className="font-serif font-light uppercase mb-6"
            style={{
              fontSize: "clamp(2rem, 4vw, 3rem)",
              color: "#111111",
              lineHeight: 1.1,
              letterSpacing: "0.02em",
            }}
          >
            {content.title}
            <br />
            <span className="italic" style={{ color: "#8B1A1A" }}>
              {content.titleAccent}
            </span>
          </h2>
          <p className="font-sans text-[12.5px] text-[#111111]/70 leading-relaxed mb-8 max-w-md">
            {content.description}
          </p>

          <div className="flex items-center gap-4">
            {!isRevealed ? (
              <div className="flex items-center gap-2">
                <span className="animate-pulse w-2 h-2 rounded-full bg-[#8B1A1A]" />
                <span className="font-sans font-bold text-[9px] text-[#8B1A1A] tracking-wider uppercase">
                  Drag the loop downwards
                </span>
              </div>
            ) : (
              <button
                onClick={resetReveal}
                className="font-sans font-bold text-[9px] text-[#111111]/40 tracking-wider uppercase hover:text-[#8B1A1A] transition-colors cursor-pointer"
                data-cursor-text="RESET"
              >
                ✕ Re-hide Card
              </button>
            )}
          </div>
        </div>

        {/* Right Pocket Visualizer Column */}
        <div className="lg:col-span-7 flex justify-center items-center py-6 w-full">
          <div
            className="relative overflow-hidden w-full max-w-[420px] shadow-[0_30px_60px_rgba(17,17,17,0.22)]"
            style={{
              aspectRatio: "1/1.2",
              backgroundColor: INDIGO_DENIM_BG,
              borderRadius: "4px",
              border: "1px solid rgba(255,255,255,0.06)",
            }}
          >
            {/* Denim Weave Texture Pattern overlay */}
            <div
              className="absolute inset-0 opacity-[0.06] mix-blend-overlay pointer-events-none"
              style={{
                backgroundImage: `repeating-linear-gradient(
                  45deg,
                  #FAF8F5,
                  #FAF8F5 1px,
                  transparent 1px,
                  transparent 4px
                )`,
              }}
            />

            {/* Main curved pocket top hem line (Classic jeans curve outline) */}
            <svg
              className="absolute inset-0 w-full h-full pointer-events-none"
              viewBox="0 0 340 408"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              {/* Pocket copper double stitching lines */}
              <path
                d="M -20 180 C 80 180 180 140 280 -20"
                stroke="#C58B3F" // copper orange stitch
                strokeWidth="1.5"
                strokeDasharray="4 2"
              />
              <path
                d="M -20 186 C 80 186 182 146 282 -14"
                stroke="#C58B3F"
                strokeWidth="1.5"
                strokeDasharray="4 2"
              />
            </svg>

            {/* Cooper Rivet top-right pocket corner */}
            <div
              className="absolute rounded-full border border-black/35 flex items-center justify-center"
              style={{
                top: "18px",
                right: "84px",
                width: "12px",
                height: "12px",
                backgroundColor: "#B87333",
                boxShadow: "inset 0 1px 2px rgba(255,255,255,0.4)",
              }}
            />

            {/* ── THE BESPOKE CERTIFICATE CARD (Behind watch pocket) ── */}
            <div
              ref={cardRef}
              className="absolute left-1/2 -translate-x-1/2 p-6 flex flex-col justify-between shadow-[0_20px_40px_rgba(0,0,0,0.28)] select-none border border-black/10"
              style={{
                top: "-210px", // Hidden state top position
                width: "280px",
                height: "320px",
                backgroundColor: "#EDE6D5", // vintage thick paper color
                transform: `translateY(${dragY}px)`,
                willChange: "transform",
                zIndex: 10,
              }}
            >
              {/* Certificate Inner details */}
              <div className="flex flex-col h-full justify-between">
                {/* Header branding */}
                <div>
                  <div className="flex justify-between items-baseline mb-2">
                    <span className="font-sans font-bold text-[10px] text-[#8B1A1A] tracking-widest">
                      NAAMI ATELIER CARD
                    </span>
                    <span className="font-sans text-[9px] text-[#111111]/40">
                      {content.seasonTag}
                    </span>
                  </div>
                  <h3 className="font-serif font-light uppercase text-base text-[#111111] tracking-wider border-b border-[#8B1A1A]/10 pb-2">
                    Authenticity Card
                  </h3>
                </div>

                {/* Specs list */}
                <div className="flex flex-col gap-3.5 my-4 font-sans text-[11.5px]">
                  {content.specs.map(({ label, value }) => (
                    <div key={label} className="flex justify-between border-b border-black/5 pb-1.5">
                      <span className="font-bold text-[#111111]/35">{label}</span>
                      <span className="text-[#111111]/85">{value}</span>
                    </div>
                  ))}
                </div>

                {/* Footer seal */}
                <div className="pt-3 border-t border-[#8B1A1A]/15 flex items-center justify-between">
                  <div className="flex flex-col">
                    <span className="font-sans font-bold text-[8px] text-[#111111]/45">SERIAL CODE</span>
                    <span className="font-sans font-bold text-[11px] text-[#111111] tracking-wider">
                      {content.serialCode}
                    </span>
                  </div>
                  {/* Crimson logo stamp */}
                  <div
                    className="w-9 h-9 rounded-full flex items-center justify-center font-serif text-[12px] font-bold border border-dashed border-[#8B1A1A]/35 text-[#8B1A1A]"
                    style={{ backgroundColor: "rgba(139,26,26,0.04)" }}
                  >
                    N
                  </div>
                </div>
              </div>
            </div>

            {/* ── THE WATCH POCKET PANEL (Foreground panel covering the card) ── */}
            <div
              className="absolute bottom-0 left-0 right-0"
              style={{
                top: "160px",
                backgroundColor: INDIGO_DENIM_BG,
                zIndex: 20,
                borderTop: "2px solid #C58B3F", // pocket hem stich
                boxShadow: "0 -4px 12px rgba(19, 30, 51, 0.4)",
              }}
            >
              {/* Coin pocket outline stitching */}
              <div
                className="absolute left-1/2 -translate-x-1/2 border-l border-r border-b border-[#C58B3F]/70"
                style={{
                  top: "0px",
                  width: "190px",
                  height: "210px",
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
                    border: "0.8px dashed #C58B3F/40",
                    borderBottomLeftRadius: "6px",
                    borderBottomRightRadius: "6px",
                  }}
                />

                {/* Left pocket rivet */}
                <div
                  className="absolute top-2 left-2 rounded-full"
                  style={{
                    width: "6px",
                    height: "6px",
                    backgroundColor: "#B87333",
                  }}
                />

                {/* Right pocket rivet */}
                <div
                  className="absolute top-2 right-2 rounded-full"
                  style={{
                    width: "6px",
                    height: "6px",
                    backgroundColor: "#B87333",
                  }}
                />
              </div>

              {/* ── THE PULL LOOP (Sticks out of pocket top hem) ── */}
              <div
                ref={loopRef}
                onPointerDown={handlePointerDown}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
                className="absolute left-1/2 -translate-x-1/2 cursor-grab active:cursor-grabbing flex flex-col items-center"
                style={{
                  top: "-34px", // sticks out of top hem
                  width: "24px",
                  height: "50px",
                  transform: `translateY(${dragY}px)`,
                  willChange: "transform",
                  zIndex: 30,
                  touchAction: "none",
                }}
                data-cursor-text={isDragging ? (dragY > 90 ? "PUSHING" : "PULLING") : (isRevealed ? "PUSH" : "PULL")}
              >
                {/* Red Selvedge Loop Shape */}
                <div
                  className="w-4 h-full rounded-t border-l border-r border-t border-black/10 flex justify-center relative shadow-[0_2px_4px_rgba(0,0,0,0.3)]"
                  style={{
                    backgroundColor: "#EDE8DC", // ecru canvas color
                  }}
                >
                  {/* Crimson center strip represent red-line selvedge */}
                  <div
                    className="w-[2px] h-full"
                    style={{ backgroundColor: "#8B1A1A" }}
                  />
                </div>
              </div>
            </div>

          </div>
        </div>

      </div>
    </section>
  );
}
