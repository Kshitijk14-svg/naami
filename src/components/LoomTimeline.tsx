"use client";

import React, { useEffect, useRef } from "react";
import Image from "next/image";
import { gsap, ScrollTrigger } from "@/lib/gsap";

export interface LoomTimelineContent {
  panel1: { image: string; kicker: string; title: string; body: string };
  panel2: { image: string; kicker: string; title: string; body: string };
  panel3: { kicker: string; title: string; body: string };
}

interface LoomTimelineProps {
  content: LoomTimelineContent;
}

export default function LoomTimeline({ content }: LoomTimelineProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);

  // SVG / element animation refs
  const slide1ImageRef = useRef<HTMLDivElement>(null);
  const slide2ImageRef = useRef<HTMLDivElement>(null);
  const vatOverlayRef = useRef<HTMLDivElement>(null);
  const slide3TextRef = useRef<HTMLDivElement>(null);
  const slide3LogoRef = useRef<HTMLDivElement>(null);
  const logoCanvasRef = useRef<HTMLCanvasElement>(null);

  // Load and clean the logo image to strip the checkerboard background
  useEffect(() => {
    const canvas = logoCanvasRef.current;
    if (!canvas) return;

    const img = new window.Image();
    img.onload = () => {
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;

      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      ctx.drawImage(img, 0, 0);

      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const px = imageData.data;

      // Known logo crimson: #8B1A1A = (139, 26, 26)
      const LR = 139, LG = 26, LB = 26;
      // Keep pixels within KEEP distance, fade pixels up to FADE, erase the rest
      const KEEP = 110;
      const FADE = 170;

      for (let i = 0; i < px.length; i += 4) {
        const dist = Math.sqrt(
          (px[i] - LR) ** 2 +
          (px[i + 1] - LG) ** 2 +
          (px[i + 2] - LB) ** 2
        );

        if (dist >= FADE) {
          // Far from logo crimson (white, grey, checkerboard) -> fully transparent
          px[i + 3] = 0;
        } else if (dist > KEEP) {
          // Anti-aliased edge pixel -> fade proportionally
          px[i + 3] = Math.round(px[i + 3] * (1 - (dist - KEEP) / (FADE - KEEP)));
        }
      }

      ctx.putImageData(imageData, 0, 0);
    };
    img.src = "/images/naami-icon.png";
  }, []);

  useEffect(() => {
    const container = containerRef.current;
    const track = trackRef.current;
    if (!container || !track) return;

    const pinDistance = track.scrollWidth - window.innerWidth;

    const tl = gsap.timeline({
      scrollTrigger: {
        trigger: container,
        start: "top top",
        end: `+=${pinDistance}`,
        pin: true,
        scrub: 1.1,
        invalidateOnRefresh: true,
        snap: {
          snapTo: [0.0, 0.375, 0.75, 1.0],
          duration: { min: 0.25, max: 0.5 },
          delay: 0.05,
          ease: "power2.out",
        },
      },
    });

    // 1. Translate track horizontally (backbone)
    tl.to(track, {
      x: -pinDistance,
      ease: "none",
      duration: 0.75,
    }, 0);

    // Slide 3 — circle reveal of the brand crimson background and content (follow scroll)
    if (vatOverlayRef.current && slide3TextRef.current) {
      tl.fromTo(
        vatOverlayRef.current,
        { clipPath: "circle(0% at 50% 50%)" },
        { clipPath: "circle(150% at 50% 50%)", ease: "none", duration: 0.375 },
        0.375
      );
      if (slide3LogoRef.current) {
        tl.fromTo(
          slide3LogoRef.current,
          { opacity: 0, scale: 0.7 },
          { opacity: 1, scale: 1, ease: "back.out(1.6)", duration: 0.3 },
          0.45
        );
      }
      tl.fromTo(
        slide3TextRef.current,
        { opacity: 0, y: 15 },
        { opacity: 1, y: 0, ease: "power2.out", duration: 0.3 },
        0.45
      );
    }

    // Slide 1 — image scales/fades into frame as it scrolls in
    if (slide1ImageRef.current) {
      tl.fromTo(
        slide1ImageRef.current,
        { opacity: 0, scale: 1.12 },
        { opacity: 1, scale: 1, duration: 0.12, ease: "power2.out" },
        0.02
      );
    }

    // Slide 2 — image scales/fades into frame as it scrolls in
    if (slide2ImageRef.current) {
      tl.fromTo(
        slide2ImageRef.current,
        { opacity: 0, scale: 1.12 },
        { opacity: 1, scale: 1, duration: 0.12, ease: "power2.out" },
        0.3
      );
    }

    // Dwell — hold the fully-assembled slide 3 in view before the pin releases.
    tl.to({}, { duration: 0.25 });

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
              {content.panel1.kicker}
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
              {content.panel1.title}
            </h2>
            <p className="font-sans text-[12.5px] text-[#111111]/90 leading-relaxed mb-8 max-w-md">
              {content.panel1.body}
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

          {/* Right editorial image */}
          <div className="w-full md:w-6/12 h-[50vh] md:h-[60vh] flex items-center justify-center relative">
            <div
              ref={slide1ImageRef}
              className="relative w-full h-full overflow-hidden border border-black/5"
              style={{ backgroundColor: "#EDE8DC", willChange: "transform, opacity" }}
            >
              <Image
                src={content.panel1.image}
                alt="NAAMI // The Weave & The Count"
                fill
                className="object-cover"
                style={{ filter: "brightness(0.94)" }}
                sizes="(max-width: 768px) 100vw, 50vw"
                priority
              />
              {/* Selvedge red edge line */}
              <div
                className="absolute top-0 left-0 bottom-0 z-10"
                style={{ width: "3px", backgroundColor: "#8B1A1A", opacity: 0.8 }}
              />
              {/* Card label */}
              <div
                className="absolute bottom-6 left-6 z-10 font-sans font-bold uppercase tracking-[0.25em]"
                style={{ fontSize: "9px", color: "#FAF8F5" }}
              >
                NAAMI // THE LOOM
              </div>
            </div>
          </div>
        </section>

        {/* PANEL 2: The Cutting Table — editorial image */}
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
              {content.panel2.kicker}
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
              {content.panel2.title}
            </h2>
            <p className="font-sans text-[12.5px] text-[#111111]/90 leading-relaxed mb-8 max-w-md">
              {content.panel2.body}
            </p>
          </div>

          {/* Right editorial image */}
          <div className="w-full md:w-6/12 h-[50vh] md:h-[60vh] flex items-center justify-center relative">
            <div
              ref={slide2ImageRef}
              className="relative w-full h-full overflow-hidden border border-black/5"
              style={{ backgroundColor: "#F4F0E6", willChange: "transform, opacity" }}
            >
              <Image
                src={content.panel2.image}
                alt="NAAMI // The Cutting Table"
                fill
                className="object-cover"
                style={{ filter: "brightness(0.94)" }}
                sizes="(max-width: 768px) 100vw, 50vw"
              />
              {/* Selvedge red edge line */}
              <div
                className="absolute top-0 left-0 bottom-0 z-10"
                style={{ width: "3px", backgroundColor: "#8B1A1A", opacity: 0.8 }}
              />
              {/* Card label */}
              <div
                className="absolute bottom-6 left-6 z-10 font-sans font-bold uppercase tracking-[0.25em]"
                style={{ fontSize: "9px", color: "#FAF8F5" }}
              >
                NAAMI // ATELIER FLOOR
              </div>
            </div>
          </div>
        </section>

        {/* PANEL 3: The Finishing Hand — brand crimson finale */}
        <section
          className="w-screen h-full flex flex-col md:flex-row items-center justify-between px-12 md:px-24 py-20 relative overflow-hidden"
          style={{ backgroundColor: "#F4F0E6" }}
        >
          {/* Crimson brand reveal */}
          <div
            ref={vatOverlayRef}
            className="absolute inset-0 z-0 pointer-events-none"
            style={{
              background:
                "radial-gradient(circle at 50% 40%, #9E2020 0%, #8B1A1A 45%, #5E1010 100%)",
            }}
          />
          {/* Subtle weave texture over the crimson */}
          <div
            className="absolute inset-0 z-0 pointer-events-none opacity-[0.08] mix-blend-overlay"
            style={{
              backgroundImage: `repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.4) 2px, rgba(0,0,0,0.4) 3px), repeating-linear-gradient(90deg, transparent, transparent 4px, rgba(0,0,0,0.25) 4px, rgba(0,0,0,0.25) 5px)`,
            }}
          />

          {/* Left Description */}
          <div
            ref={slide3TextRef}
            className="w-full md:w-5/12 text-left z-10"
            style={{ opacity: 0, willChange: "transform, opacity" }}
          >
            <span
              className="font-sans font-bold uppercase tracking-[0.3em] mb-4 block"
              style={{ fontSize: "9px", color: "#E8C977" }}
            >
              {content.panel3.kicker}
            </span>
            <h2
              className="font-serif font-light uppercase mb-6"
              style={{
                fontSize: "clamp(2rem, 4vw, 3.5rem)",
                color: "#FAF6EC",
                lineHeight: 1.1,
                letterSpacing: "0.02em",
              }}
            >
              {content.panel3.title}
            </h2>
            <p className="font-sans text-[12.5px] text-[#FAF6EC]/85 leading-relaxed mb-8 max-w-md">
              {content.panel3.body}
            </p>
            {/* Gold hairline accent */}
            <div
              style={{
                width: "120px",
                height: "1px",
                background:
                  "linear-gradient(to right, #E8C977 2px, rgba(250,246,236,0.25) 2px, transparent)",
              }}
            />
          </div>

          {/* Right: brand logo medallion */}
          <div className="w-full md:w-6/12 h-[50vh] md:h-[60vh] flex items-center justify-center relative z-10">
            <div
              ref={slide3LogoRef}
              className="relative flex items-center justify-center"
              style={{ width: "240px", height: "240px", willChange: "transform, opacity" }}
            >
              {/* Rotating gold ring */}
              <div
                className="absolute inset-0 rounded-full border animate-spin"
                style={{ borderColor: "rgba(232,201,119,0.35)", animationDuration: "18s" }}
              />
              <div
                className="absolute inset-3 rounded-full border"
                style={{ borderColor: "rgba(250,246,236,0.18)" }}
              />
              {/* Cream logo disc */}
              <div
                className="rounded-full flex items-center justify-center overflow-hidden"
                style={{
                  width: "190px",
                  height: "190px",
                  backgroundColor: "#FAF6EC",
                  boxShadow: "0 18px 50px rgba(0,0,0,0.35)",
                }}
              >
                <div style={{ width: "70%", height: "70%" }} className="flex items-center justify-center">
                  <canvas
                    ref={logoCanvasRef}
                    style={{ width: "100%", height: "auto", display: "block" }}
                  />
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
