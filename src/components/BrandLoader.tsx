"use client";

import { useEffect, useRef } from "react";
import Image from "next/image";
import { gsap } from "@/lib/gsap";

// NAAMI brand colours extracted from the official logo
const NAAMI_BG = "#F8F1E5";       // cream / parchment — matches logo background
const NAAMI_CRIMSON = "#5B1C1C";  // deep crimson — matches logo mark & wordmark

export default function BrandLoader() {
  const containerRef  = useRef<HTMLDivElement>(null);
  const logoIconRef   = useRef<HTMLDivElement>(null);
  const textRef       = useRef<HTMLHeadingElement>(null);
  const leftHalfRef   = useRef<HTMLDivElement>(null);
  const rightHalfRef  = useRef<HTMLDivElement>(null);

  /* ── GSAP animation timeline ─────────────────────────────────────── */
  useEffect(() => {
    const tl = gsap.timeline({
      defaults: { ease: "power2.out" },
      onComplete: () => {
        if (containerRef.current) {
          containerRef.current.style.display      = "none";
          containerRef.current.style.pointerEvents = "none";
        }
      },
    });

    // 1. Logo slides in from above + fades in
    tl.fromTo(
      logoIconRef.current,
      { y: -60, opacity: 0 },
      { y: 0,   opacity: 1, duration: 0.9, ease: "power3.out" }
    )
    // 2. Brand text fades in
    .to(textRef.current, { opacity: 1, duration: 0.7 }, "-=0.2")
    // 3. Letter-spacing expands simultaneously
    .to(textRef.current, { letterSpacing: "0.45em", duration: 1.4, ease: "power2.inOut" }, "<")
    // 4. Hold the fully-assembled lockup on screen for a beat
    .to({}, { duration: 0.6 })
    // 5. Logo fades out
    .to(logoIconRef.current,  { opacity: 0, duration: 0.25, ease: "power1.in" })
    // 6. Text fades out simultaneously
    .to(textRef.current,      { opacity: 0, duration: 0.25, ease: "power1.in" }, "<")
    // 7. Curtain split
    .to(
      [leftHalfRef.current, rightHalfRef.current],
      { xPercent: (i: number) => (i === 0 ? -100 : 100), duration: 1.2, ease: "power4.inOut", stagger: 0 }
    )
    .set(containerRef.current, { pointerEvents: "none" })
    .set(containerRef.current, { display: "none" });

    return () => { tl.kill(); };
  }, []);

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 flex"
      style={{ zIndex: 100, pointerEvents: "auto" }}
      aria-hidden="true"
    >
      {/* Left curtain */}
      <div ref={leftHalfRef}  className="w-1/2 h-full hw-accelerate" style={{ backgroundColor: NAAMI_BG }} />
      {/* Right curtain */}
      <div ref={rightHalfRef} className="w-1/2 h-full hw-accelerate" style={{ backgroundColor: NAAMI_BG }} />

      {/* ── Logo + wordmark lockup — simple centered stack, no divider line ── */}
      <div
        className="absolute inset-0 flex flex-col items-center justify-center gap-4"
        style={{ zIndex: 102 }}
      >
        <div
          ref={logoIconRef}
          style={{ opacity: 0, width: "clamp(120px, 18vw, 200px)", height: "auto" }}
        >
          <Image
            src="/images/naami-logo-mark.png"
            alt="NAAMI"
            width={391}
            height={509}
            priority
            style={{ width: "100%", height: "auto", display: "block" }}
          />
        </div>

        <h1
          ref={textRef}
          className="font-wordmark lowercase font-bold"
          style={{
            textAlign: "center",
            fontSize: "clamp(2rem, 6vw, 5rem)",
            letterSpacing: "0.1em",
            color: NAAMI_CRIMSON,
            opacity: 0,
            margin: 0,
          }}
        >
          naami
        </h1>
      </div>
    </div>
  );
}
