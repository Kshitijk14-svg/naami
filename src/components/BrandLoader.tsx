"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";

// NAAMI brand colours extracted from the official logo
const NAAMI_BG = "#EDE8DC";       // cream / parchment — matches logo background
const NAAMI_CRIMSON = "#8B1A1A";  // deep crimson — matches logo mark & wordmark

export default function BrandLoader() {
  const containerRef  = useRef<HTMLDivElement>(null);
  const logoIconRef   = useRef<HTMLDivElement>(null);
  const logoCanvasRef = useRef<HTMLCanvasElement>(null);
  const textRef       = useRef<HTMLHeadingElement>(null);
  const leftHalfRef   = useRef<HTMLDivElement>(null);
  const rightHalfRef  = useRef<HTMLDivElement>(null);
  const centerLineRef = useRef<HTMLDivElement>(null);

  /* ── DOM pixel fix: keep only pixels close to the crimson logo colour ── */
  useEffect(() => {
    const canvas = logoCanvasRef.current;
    if (!canvas) return;

    const img = new window.Image();

    img.onload = () => {
      canvas.width  = img.naturalWidth;
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
          (px[i]     - LR) ** 2 +
          (px[i + 1] - LG) ** 2 +
          (px[i + 2] - LB) ** 2
        );

        if (dist >= FADE) {
          // Far from logo crimson (white, cream, off-white) → fully transparent
          px[i + 3] = 0;
        } else if (dist > KEEP) {
          // Anti-aliased edge pixel → fade proportionally
          px[i + 3] = Math.round(px[i + 3] * (1 - (dist - KEEP) / (FADE - KEEP)));
        }
        // else: pixel is the logo crimson → leave it untouched
      }

      ctx.putImageData(imageData, 0, 0);
    };

    img.src = "/images/naami-icon.png";
  }, []);

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
    // 4. Selvedge center line draws across
    .to(centerLineRef.current, { scaleX: 1, duration: 0.55, ease: "power3.inOut" }, "-=0.3")
    // 5. Logo fades out
    .to(logoIconRef.current,  { opacity: 0, duration: 0.25, ease: "power1.in", delay: 0.25 })
    // 6. Text fades out simultaneously
    .to(textRef.current,      { opacity: 0, duration: 0.25, ease: "power1.in" }, "<")
    // 7. Center line fades
    .to(centerLineRef.current, { opacity: 0, duration: 0.2 }, "<")
    // 8. Curtain split
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

      {/* Selvedge line */}
      <div
        ref={centerLineRef}
        className="absolute top-1/2 left-0 w-full -translate-y-1/2"
        style={{
          height: "1.5px",
          background: `linear-gradient(to right, transparent 0%, ${NAAMI_CRIMSON} 20%, #C4763A 50%, ${NAAMI_CRIMSON} 80%, transparent 100%)`,
          transformOrigin: "left center",
          transform: "scaleX(0)",
          zIndex: 101,
        }}
      />

      {/* ── Logo — anchored above the center line ─────────────────────── */}
      <div
        className="absolute flex justify-center items-end"
        style={{
          zIndex: 102,
          left: 0, right: 0,
          bottom: "50%",
          paddingBottom: "0.75rem",  /* gap between logo bottom and center line */
        }}
      >
        <div
          ref={logoIconRef}
          style={{ opacity: 0, width: "clamp(120px, 18vw, 200px)", height: "auto" }}
        >
          {/*
           * Canvas renders the PNG with white pixels zeroed-out via DOM pixel
           * manipulation (getImageData → strip near-white → putImageData).
           * No CSS blend modes, no image wrappers — pure transparent result.
           */}
          <canvas
            ref={logoCanvasRef}
            style={{ width: "100%", height: "auto", display: "block" }}
          />
        </div>
      </div>

      {/* ── Brand name — anchored below the center line ────────────────── */}
      <h1
        ref={textRef}
        className="absolute font-serif uppercase font-light"
        style={{
          zIndex: 102,
          left: 0, right: 0,
          top: "50%",
          paddingTop: "0.75rem",     /* gap between center line and text top */
          textAlign: "center",
          fontSize: "clamp(2rem, 6vw, 5rem)",
          letterSpacing: "0.1em",
          color: NAAMI_CRIMSON,
          opacity: 0,
          margin: 0,
        }}
      >
        NAAMI
      </h1>
    </div>
  );
}
