"use client";

import React, { useEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

export default function LoomTimeline() {
  const containerRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);

  // SVG Anim Refs
  const warpLinesRef = useRef<SVGGElement>(null);
  const weftLinesRef = useRef<SVGGElement>(null);
  const shuttleRef = useRef<SVGGElement>(null);
  const selvedgeLineRef = useRef<SVGPathElement>(null);
  const vatOverlayRef = useRef<HTMLDivElement>(null);
  const slide3TextRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    const track = trackRef.current;
    if (!container || !track) return;

    // Calculate translation amount: total slides = 3, so shift is -200vw
    // Let's get the width of the container. 3 panels total, so track translates by -(track.scrollWidth - window.innerWidth)
    const pinDistance = track.scrollWidth - window.innerWidth;

    const tl = gsap.timeline({
      scrollTrigger: {
        trigger: container,
        start: "top top",
        end: `+=${pinDistance}`,
        pin: true,
        scrub: 1.1,
        invalidateOnRefresh: true,
      },
    });

    // 1. Translate track horizontally
    tl.to(track, {
      x: -pinDistance,
      ease: "none",
    });

    // 2. Add slide-specific micro-animations linked to the main timeline
    // Slide 1 (Warp & Weft lines drawing)
    if (warpLinesRef.current && weftLinesRef.current) {
      tl.fromTo(
        warpLinesRef.current.children,
        { scaleY: 0 },
        { scaleY: 1, transformOrigin: "top center", duration: 0.3, stagger: 0.05 },
        0.05
      );
      tl.fromTo(
        weftLinesRef.current.children,
        { scaleX: 0 },
        { scaleX: 1, transformOrigin: "left center", duration: 0.3, stagger: 0.05 },
        0.15
      );
    }

    // Slide 2 (Shuttle Loom movement + Selvedge line draw)
    if (shuttleRef.current && selvedgeLineRef.current) {
      // Move shuttle back and forth
      tl.fromTo(
        shuttleRef.current,
        { x: -50 },
        { x: 300, duration: 0.4, ease: "power1.inOut" },
        0.3
      );
      tl.to(shuttleRef.current, { x: 50, duration: 0.4, ease: "power1.inOut" }, 0.7);

      // Draw red-line selvedge stroke dasharray
      const pathLength = selvedgeLineRef.current.getTotalLength() || 400;
      gsap.set(selvedgeLineRef.current, {
        strokeDasharray: pathLength,
        strokeDashoffset: pathLength,
      });

      tl.to(
        selvedgeLineRef.current,
        {
          strokeDashoffset: 0,
          duration: 0.6,
          ease: "none",
        },
        0.35
      );
    }

    // Slide 3 (Vat Color Saturation & Text Fade)
    if (vatOverlayRef.current && slide3TextRef.current) {
      tl.fromTo(
        vatOverlayRef.current,
        { clipPath: "circle(0% at 50% 50%)" },
        { clipPath: "circle(120% at 50% 50%)", duration: 0.5, ease: "power2.out" },
        0.65
      );
      tl.fromTo(
        slide3TextRef.current,
        { opacity: 0, y: 15 },
        { opacity: 1, y: 0, duration: 0.45, ease: "power2.out" },
        0.75
      );
    }

    return () => {
      ScrollTrigger.getAll().forEach((st) => {
        if (st.trigger === container) st.kill();
      });
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className="relative w-full overflow-hidden"
      style={{ height: "100vh", backgroundColor: "#F4F0E6" }}
    >
      {/* Horizontal Track */}
      <div
        ref={trackRef}
        className="flex h-full w-[300vw] select-none"
        style={{ willChange: "transform" }}
      >
        
        {/* PANEL 1: Weave & The Count */}
        <section
          className="w-screen h-full flex flex-col md:flex-row items-center justify-between px-12 md:px-24 py-20 relative"
          style={{ backgroundColor: "#F4F0E6" }}
        >
          {/* Left Description */}
          <div className="w-full md:w-5/12 text-left z-10">
            <span
              className="font-sans font-bold uppercase tracking-[0.3em] mb-4 block"
              style={{ fontSize: "9px", color: "#8B1A1A" }}
            >
              Albini Heritage // Stage 01
            </span>
            <h2
              className="font-serif font-light uppercase mb-6"
              style={{
                fontSize: "clamp(2rem, 4vw, 3.5rem)",
                color: "#111111",
                lineHeight: 1.1,
                letterSpacing: "0.02em",
              }}
            >
              The Weave & The Count
            </h2>
            <p className="font-sans text-[12.5px] text-[#111111]/90 leading-relaxed mb-8 max-w-md">
              Before it is a shirt, it is raw thread count. We weave 100-count to 140-count Egyptian long-staple cotton yarns into tight poplin and Oxford constructions, tensioned to hold their structure through decades of wearing and washing.
            </p>
            <div className="flex items-center gap-3">
              <span className="font-sans font-bold text-[9px] text-[#111111]/60 tracking-widest">
                SCROLL TO WEAVE
              </span>
              <svg width="24" height="8" viewBox="0 0 24 8" fill="none" stroke="rgba(17,17,17,0.3)" strokeWidth="1.5">
                <path d="M0 4h20M16 0l4 4-4 4" strokeLinecap="round" />
              </svg>
            </div>
          </div>

          {/* Right SVG Graphic */}
          <div className="w-full md:w-6/12 h-[50vh] md:h-[60vh] flex items-center justify-center relative">
            <svg
              width="90%"
              height="90%"
              viewBox="0 0 300 300"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              className="border border-black/5 p-6 bg-[#EDE8DC]/50 backdrop-blur-sm"
            >
              {/* Warp vertical lines */}
              <g ref={warpLinesRef} stroke="rgba(17,17,17,0.25)" strokeWidth="1">
                <line x1="40" y1="20" x2="40" y2="280" />
                <line x1="80" y1="20" x2="80" y2="280" />
                <line x1="120" y1="20" x2="120" y2="280" />
                <line x1="160" y1="20" x2="160" y2="280" />
                <line x1="200" y1="20" x2="200" y2="280" />
                <line x1="240" y1="20" x2="240" y2="280" />
                <line x1="260" y1="20" x2="260" y2="280" />
              </g>

              {/* Weft horizontal lines */}
              <g ref={weftLinesRef} stroke="#8B1A1A" strokeWidth="0.8" strokeDasharray="3 3">
                <line x1="20" y1="50" x2="280" y2="50" />
                <line x1="20" y1="90" x2="280" y2="90" />
                <line x1="20" y1="130" x2="280" y2="130" />
                <line x1="20" y1="170" x2="280" y2="170" />
                <line x1="20" y1="210" x2="280" y2="210" />
                <line x1="20" y1="250" x2="280" y2="250" />
              </g>
            </svg>
          </div>
        </section>

        {/* PANEL 2: Shuttle Loom shuttle motion */}
        <section
          className="w-screen h-full flex flex-col md:flex-row items-center justify-between px-12 md:px-24 py-20 relative"
          style={{ backgroundColor: "#EDE8DC" }}
        >
          {/* Left Description */}
          <div className="w-full md:w-5/12 text-left z-10">
            <span
              className="font-sans font-bold uppercase tracking-[0.3em] mb-4 block"
              style={{ fontSize: "9px", color: "#8B1A1A" }}
            >
              Heritage Craft // Stage 02
            </span>
            <h2
              className="font-serif font-light uppercase mb-6"
              style={{
                fontSize: "clamp(2rem, 4vw, 3.5rem)",
                color: "#111111",
                lineHeight: 1.1,
                letterSpacing: "0.02em",
              }}
            >
              The Cutting Table
            </h2>
            <p className="font-sans text-[12.5px] text-[#111111]/90 leading-relaxed mb-8 max-w-md">
              Each shirt panel is hand-cut from a single length of cloth on a long table by a single artisan. Pattern pieces are aligned with the grain of the fabric to ensure the finished shirt hangs perfectly and the check patterns align at every seam.
            </p>
          </div>

          {/* Right SVG Graphic */}
          <div className="w-full md:w-6/12 h-[50vh] md:h-[60vh] flex items-center justify-center relative">
            <svg
              width="90%"
              height="90%"
              viewBox="0 0 320 200"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              className="border border-black/5 bg-[#F4F0E6] p-6"
            >
              {/* Loom boundaries */}
              <line x1="30" y1="100" x2="290" y2="100" stroke="#111111" strokeWidth="0.5" strokeDasharray="4 4" />

              {/* Dynamic Selvedge line */}
              <path
                ref={selvedgeLineRef}
                d="M 30 100 L 290 100"
                stroke="#8B1A1A"
                strokeWidth="2"
              />

              {/* Moving Shuttle Piece */}
              <g ref={shuttleRef} className="will-change-transform">
                {/* Wood shuttle body */}
                <path d="M 0 92 L 20 85 L 40 92 V 108 L 20 115 L 0 108 Z" fill="#C5A059" stroke="#111111" strokeWidth="1" />
                {/* Brass spindle */}
                <circle cx="20" cy="100" r="4" fill="#D4AF37" />
                {/* Spilled thread */}
                <path d="M 0 100 Q -15 95 -30 100" stroke="#8B1A1A" strokeWidth="1" strokeDasharray="2 2" />
              </g>
            </svg>
          </div>
        </section>

        {/* PANEL 3: Dye Vat Saturation */}
        <section
          className="w-screen h-full flex flex-col md:flex-row items-center justify-between px-12 md:px-24 py-20 relative overflow-hidden"
          style={{ backgroundColor: "#F4F0E6" }}
        >
          {/* Warm mahogany overlay — evokes fabric pressing/heat */}
          <div
            ref={vatOverlayRef}
            className="absolute inset-0 z-0 pointer-events-none"
            style={{
              backgroundColor: "#2C1810",
              mixBlendMode: "multiply",
              opacity: 0.95,
            }}
          />

          {/* Left Description */}
          <div ref={slide3TextRef} className="w-full md:w-5/12 text-left z-10" style={{ opacity: 0, willChange: "transform, opacity" }}>
            <span
              className="font-sans font-bold uppercase tracking-[0.3em] mb-4 block"
              style={{ fontSize: "9px", color: "#D4AF37" }}
            >
              Heritage Craft // Stage 03
            </span>
            <h2
              className="font-serif font-light uppercase mb-6"
              style={{
                fontSize: "clamp(2rem, 4vw, 3.5rem)",
                color: "#FAF8F5",
                lineHeight: 1.1,
                letterSpacing: "0.02em",
              }}
            >
              The Finishing Hand
            </h2>
            <p className="font-sans text-[12.5px] text-[#FAF8F5]/90 leading-relaxed mb-8 max-w-md">
              Each shirt passes through the hands of a finishing specialist who steams the placket flat, presses the collar roll with a curved iron, and attaches the mother-of-pearl buttons by hand. This final stage cannot be mechanised.
            </p>
          </div>

          {/* Right visual indicator */}
          <div className="w-full md:w-6/12 h-[50vh] md:h-[60vh] flex items-center justify-center relative z-10">
            {/* Centered stylized logo/icon medallion container */}
            <div
              className="rounded-full flex items-center justify-center border border-white/20 p-8 relative overflow-hidden"
              style={{ width: "200px", height: "200px", backgroundColor: "rgba(244,240,230,0.04)" }}
            >
              {/* Outer halo */}
              <div className="absolute inset-2 border border-white/10 rounded-full animate-spin" style={{ animationDuration: "12s" }} />

              <span
                className="font-serif text-[10vw] md:text-[3rem] font-light uppercase text-[#FAF8F5] tracking-widest"
              >
                NAAMI
              </span>
            </div>
          </div>
        </section>

      </div>
    </div>
  );
}
