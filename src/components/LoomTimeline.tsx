"use client";

import React, { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { gsap } from "@/lib/gsap";
import { sectionBackgroundStyle, type SectionBackgroundFit } from "@/lib/sectionBackground";
import { TITLE_CLASS, titleStyle } from "@/lib/typography";

export interface LoomTimelineContent {
  panel1: { image: string; kicker: string; title: string; body: string; label: string };
  panel2: { image: string; kicker: string; title: string; body: string; label: string };
  panel3: { kicker: string; title: string; body: string };
}

/** Number of panels in the carousel. */
const PANELS = 3;

interface LoomTimelineProps {
  content: LoomTimelineContent;
  backgroundImage?: string;
  backgroundImageFit?: SectionBackgroundFit;
}

export default function LoomTimeline({ content, backgroundImage, backgroundImageFit }: LoomTimelineProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  // SVG / element animation refs
  const slide2ImageRef = useRef<HTMLDivElement>(null);
  const vatOverlayRef = useRef<HTMLDivElement>(null);
  const slide3TextRef = useRef<HTMLDivElement>(null);
  const slide3LogoRef = useRef<HTMLDivElement>(null);

  // Tappable carousel — same mechanism as the Hero section: tap zones on the
  // left/right half advance panels, panels crossfade in place, and a counter
  // + progress bar tracks position. No scroll-linking of any kind.
  const [currentSlide, setCurrentSlide] = useState(0);

  const handleNextSlide = () => {
    setCurrentSlide((prev) => (prev + 1) % PANELS);
  };
  const handlePrevSlide = () => {
    setCurrentSlide((prev) => (prev - 1 + PANELS) % PANELS);
  };

  // Re-plays each panel's reveal animation whenever it becomes the active
  // slide (mirrors Hero's slideTextRef effect keyed on currentSlide).
  useEffect(() => {
    const img2 = slide2ImageRef.current;
    const vat = vatOverlayRef.current;
    const logo3 = slide3LogoRef.current;
    const text3 = slide3TextRef.current;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (currentSlide === 1 && img2) {
      gsap.killTweensOf(img2);
      if (reduced) {
        gsap.set(img2, { opacity: 1, scale: 1 });
      } else {
        gsap.fromTo(
          img2,
          { opacity: 0, scale: 1.1 },
          { opacity: 1, scale: 1, duration: 0.9, ease: "power2.out" }
        );
      }
    }

    if (currentSlide === 2) {
      [vat, logo3, text3].forEach((el) => el && gsap.killTweensOf(el));
      if (reduced) {
        if (vat) gsap.set(vat, { clipPath: "circle(150% at 50% 50%)" });
        if (logo3) gsap.set(logo3, { opacity: 1, scale: 1 });
        if (text3) gsap.set(text3, { opacity: 1, y: 0 });
      } else {
        if (vat) {
          gsap.fromTo(
            vat,
            { clipPath: "circle(0% at 50% 50%)" },
            { clipPath: "circle(150% at 50% 50%)", duration: 0.9, ease: "power2.out" }
          );
        }
        if (logo3) {
          gsap.fromTo(
            logo3,
            { opacity: 0, scale: 0.7 },
            { opacity: 1, scale: 1, duration: 0.6, ease: "back.out(1.4)", delay: 0.15 }
          );
        }
        if (text3) {
          gsap.fromTo(
            text3,
            { opacity: 0, y: 15 },
            { opacity: 1, y: 0, duration: 0.6, ease: "power2.out", delay: 0.15 }
          );
        }
      }
    }
  }, [currentSlide]);

  return (
    <div className="relative w-full">
      <div
        ref={containerRef}
        // h-screen is the 100vh fallback: if a browser does not support svh the
        // inline height below is dropped and the section would lose its height.
        className="relative w-full h-screen [height:80svh] md:[height:100svh] overflow-hidden"
        style={{ backgroundColor: "#F4F0E6", ...sectionBackgroundStyle(backgroundImage, backgroundImageFit) }}
      >
        {/* PANEL 1: Weave & The Count */}
        <section
          className="absolute inset-0 h-full w-full flex flex-col md:flex-row items-center justify-between px-0 md:px-24 py-10 md:py-20 transition-opacity duration-700 ease-in-out"
          style={{
            backgroundColor: "#F4F0E6",
            opacity: currentSlide === 0 ? 1 : 0,
            zIndex: currentSlide === 0 ? 10 : 0,
          }}
        >
          {/* Left Description */}
          <div className="w-full md:w-5/12 text-left z-10 px-4 md:px-0">
            <span
              className="font-sans font-bold uppercase tracking-[0.3em] mb-4 block"
              style={{ fontSize: "9px", color: "#8B1A1A" }}
            >
              {content.panel1.kicker}
            </span>
            <h2 className={`${TITLE_CLASS} mb-6`} style={titleStyle("clamp(2rem, 4vw, 3.5rem)")}>
              {content.panel1.title}
            </h2>
            <p className="font-sans text-[12.5px] text-[#111111]/90 leading-relaxed mb-8 max-w-md">
              {content.panel1.body}
            </p>
          </div>

          {/* Right editorial image */}
          <div className="w-full md:w-6/12 h-[36vh] md:h-[60vh] flex items-center justify-center relative">
            <div
              className="relative w-full h-full overflow-hidden border border-black/5"
              style={{ backgroundColor: "#EDE8DC" }}
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
              {/* Card label */}
              <div
                className="absolute bottom-6 left-6 z-10 font-sans font-bold uppercase tracking-[0.25em]"
                style={{ fontSize: "9px", color: "#FAF8F5" }}
              >
                {content.panel1.label}
              </div>
            </div>
          </div>
        </section>

        {/* PANEL 2: The Cutting Table — editorial image */}
        <section
          className="absolute inset-0 h-full w-full flex flex-col md:flex-row items-center justify-between px-0 md:px-24 py-10 md:py-20 transition-opacity duration-700 ease-in-out"
          style={{
            backgroundColor: "#EDE8DC",
            opacity: currentSlide === 1 ? 1 : 0,
            zIndex: currentSlide === 1 ? 10 : 0,
          }}
        >
          {/* Left Description */}
          <div className="w-full md:w-5/12 text-left z-10 px-4 md:px-0">
            <span
              className="font-sans font-bold uppercase tracking-[0.3em] mb-4 block"
              style={{ fontSize: "9px", color: "#8B1A1A" }}
            >
              {content.panel2.kicker}
            </span>
            <h2 className={`${TITLE_CLASS} mb-6`} style={titleStyle("clamp(2rem, 4vw, 3.5rem)")}>
              {content.panel2.title}
            </h2>
            <p className="font-sans text-[12.5px] text-[#111111]/90 leading-relaxed mb-8 max-w-md">
              {content.panel2.body}
            </p>
          </div>

          {/* Right editorial image */}
          <div className="w-full md:w-6/12 h-[36vh] md:h-[60vh] flex items-center justify-center relative">
            <div
              ref={slide2ImageRef}
              className="relative w-full h-full overflow-hidden border border-black/5"
              style={{ backgroundColor: "#F4F0E6" }}
            >
              <Image
                src={content.panel2.image}
                alt="NAAMI // The Cutting Table"
                fill
                className="object-cover"
                style={{ filter: "brightness(0.94)" }}
                sizes="(max-width: 768px) 100vw, 50vw"
              />
              {/* Card label */}
              <div
                className="absolute bottom-6 left-6 z-10 font-sans font-bold uppercase tracking-[0.25em]"
                style={{ fontSize: "9px", color: "#FAF8F5" }}
              >
                {content.panel2.label}
              </div>
            </div>
          </div>
        </section>

        {/* PANEL 3: The Finishing Hand — brand crimson finale */}
        <section
          className="absolute inset-0 h-full w-full flex flex-col md:flex-row items-center justify-between px-0 md:px-24 py-10 md:py-20 overflow-hidden transition-opacity duration-700 ease-in-out"
          style={{
            backgroundColor: "#F4F0E6",
            opacity: currentSlide === 2 ? 1 : 0,
            zIndex: currentSlide === 2 ? 10 : 0,
          }}
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
            className="w-full md:w-5/12 text-left z-10 px-4 md:px-0"
          >
            <span
              className="font-sans font-bold uppercase tracking-[0.3em] mb-4 block"
              style={{ fontSize: "9px", color: "#E8C977" }}
            >
              {content.panel3.kicker}
            </span>
            <h2 className={`${TITLE_CLASS} mb-6`} style={titleStyle("clamp(2rem, 4vw, 3.5rem)", "#FAF6EC")}>
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
          <div className="w-full md:w-6/12 h-[36vh] md:h-[60vh] flex items-center justify-center relative z-10">
            <div
              ref={slide3LogoRef}
              className="relative flex items-center justify-center"
              style={{ width: "240px", height: "240px" }}
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
                <div style={{ width: "91%", height: "91%", position: "relative" }}>
                  <Image
                    src="/images/hindi-logo-brown.png"
                    alt="नामी"
                    fill
                    className="object-contain"
                    sizes="190px"
                  />
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Tap zones for prev/next navigation — same custom-cursor pattern as Hero */}
        <div
          className="absolute left-0 top-0 bottom-0 w-1/2 z-20 cursor-pointer"
          data-cursor-text="PREV"
          onClick={handlePrevSlide}
        />
        <div
          className="absolute right-0 top-0 bottom-0 w-1/2 z-20 cursor-pointer"
          data-cursor-text="NEXT"
          onClick={handleNextSlide}
        />
      </div>

      {/* ── Panel Counter & Progress Bar ────────────────────────── */}
      <div className="flex flex-col gap-2 mt-4 w-full px-4 md:px-0">
        <div
          className="flex items-center justify-between font-sans font-bold uppercase tracking-[0.2em]"
          style={{ fontSize: "9px", color: "#1A1212" }}
        >
          <span>0{currentSlide + 1}</span>
          <span style={{ opacity: 0.35 }}>/ 0{PANELS}</span>
        </div>
        <div className="w-full h-[1.5px] bg-[#1A1212]/10 relative overflow-hidden">
          <div
            className="absolute left-0 top-0 h-full bg-[#5B1C1C] transition-all duration-700 ease-out"
            style={{ width: `${((currentSlide + 1) / PANELS) * 100}%` }}
          />
        </div>
      </div>
    </div>
  );
}
