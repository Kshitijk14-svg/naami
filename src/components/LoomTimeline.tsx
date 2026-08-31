"use client";

import React, { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { gsap, ScrollTrigger } from "@/lib/gsap";
import { sectionBackgroundStyle, type SectionBackgroundFit } from "@/lib/sectionBackground";
import { TITLE_CLASS, titleStyle } from "@/lib/typography";

export interface LoomTimelineContent {
  panel1: { image: string; kicker: string; title: string; body: string; label: string };
  panel2: { image: string; kicker: string; title: string; body: string; label: string };
  panel3: { kicker: string; title: string; body: string };
}

/** Number of horizontal panels in the track. */
const PANELS = 3;
/** Panel width below `md`, as a fraction of the viewport. The remainder
 *  lets the next panel peek, which is the only cue that the section
 *  scrolls sideways -- global CSS hides every scrollbar. */
const MOBILE_PANEL_VW = 0.9;

interface LoomTimelineProps {
  content: LoomTimelineContent;
  backgroundImage?: string;
  backgroundImageFit?: SectionBackgroundFit;
}

export default function LoomTimeline({ content, backgroundImage, backgroundImageFit }: LoomTimelineProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);

  // SVG / element animation refs
  const slide1ImageRef = useRef<HTMLDivElement>(null);
  const slide2ImageRef = useRef<HTMLDivElement>(null);
  const vatOverlayRef = useRef<HTMLDivElement>(null);
  const slide3TextRef = useRef<HTMLDivElement>(null);
  const slide3LogoRef = useRef<HTMLDivElement>(null);

  // Panels are laid out horizontally at every breakpoint. Below `md` the track
  // is a native CSS scroll-snap swiper (no JS); at `md` and up it becomes a
  // pinned, scrubbed horizontal scroll driven by the timeline below.
  const [mobilePanel, setMobilePanel] = useState(0);

  useEffect(() => {
    const container = containerRef.current;
    const track = trackRef.current;
    if (!container || !track) return;

    const vat = vatOverlayRef.current;
    const text3 = slide3TextRef.current;
    const logo3 = slide3LogoRef.current;
    const img2 = slide2ImageRef.current;

    // Scroll budget is denominated in viewport HEIGHT, never scrollWidth. The
    // previous version spent `track.scrollWidth - innerWidth` (~200vw) as
    // *vertical* scroll, so the section cost 3840px on a 1920 laptop and
    // 6880px on an ultrawide, but only 780px on a phone. 0.9vh per transition
    // is also about one PageDown/Space press, so a keyboard advances one panel.
    const STEP_VH = 0.9; // vertical scroll per panel transition
    const HOLD_VH = 0.4; // magnet-free dwell on the assembled final panel
    const TRANSITIONS = PANELS - 1;

    // Fraction of the timeline spent travelling; the rest is the dwell.
    const TRAVEL = (TRANSITIONS * STEP_VH) / (TRANSITIONS * STEP_VH + HOLD_VH);
    const STEP = TRAVEL / TRANSITIONS;

    // Functions, not captured constants, so invalidateOnRefresh actually
    // recomputes these on resize instead of reusing stale values.
    const travelPx = () => track.scrollWidth - window.innerWidth;
    const scrollTotal = () =>
      window.innerHeight * (TRANSITIONS * STEP_VH + HOLD_VH);

    const mm = gsap.matchMedia();

    mm.add(
      {
        desktop: "(min-width: 768px)",
        motionOK: "(prefers-reduced-motion: no-preference)",
      },
      (ctx) => {
        const { desktop, motionOK } = ctx.conditions as {
          desktop: boolean;
          motionOK: boolean;
        };

        // Mobile or reduced motion: no pin, no scrub, no ScrollTrigger at all.
        // Panel 3 is set to its finished state so the native swiper shows
        // complete content, and the section stops altering document height.
        if (!desktop || !motionOK) {
          if (vat) gsap.set(vat, { clipPath: "circle(150% at 50% 50%)" });
          const done = [text3, logo3, img2].filter(Boolean);
          if (done.length) gsap.set(done, { opacity: 1, scale: 1, y: 0 });
          return;
        }

        if (vat) gsap.set(vat, { clipPath: "circle(0% at 50% 50%)" });
        if (logo3) gsap.set(logo3, { opacity: 0, scale: 0.7 });
        if (text3) gsap.set(text3, { opacity: 0, y: 15 });
        if (img2) gsap.set(img2, { opacity: 0, scale: 1.1 });

        const tl = gsap.timeline({
          defaults: { ease: "none" },
          scrollTrigger: {
            id: "loom-timeline",
            trigger: container,
            start: "top top",
            end: () => "+=" + scrollTotal(),
            pin: true,
            pinSpacing: true,
            // Applies the pin slightly early based on scroll velocity, which
            // removes the one-frame lurch when a fast scroll hits the pin.
            anticipatePin: 1,
            // 0.6, not 1.1: this is content the user steers, not background
            // parallax. Above ~1s the visual position and the snap position
            // disagree, which is the core "it keeps going after I stop" feel.
            scrub: 0.6,
            invalidateOnRefresh: true,
            // This trigger changes document height, so it must refresh before
            // the reveal triggers below it in HomeClient.
            refreshPriority: 1,
            snap: {
              // Magnets sit only on the real panel boundaries. Past TRAVEL the
              // value is returned untouched, so there is zero pull inside the
              // dwell -- nothing yanks you back or shoves you out once panel 3
              // is assembled.
              snapTo: (value: number) =>
                value >= TRAVEL ? value : gsap.utils.snap(STEP, value),
              duration: { min: 0.2, max: 0.4 },
              // 0.05 was shorter than the gap between trackpad flick events, so
              // the snap tween fired mid-gesture, got killed, and re-fired.
              delay: 0.15,
              // power2.out decelerates exactly where the scrub tail is also
              // decelerating, which reads as a double settle.
              ease: "power1.inOut",
              // Stops a small nudge from flinging you to the next panel/exit.
              directional: false,
              // Snap to where you actually stopped, not a projected target.
              inertia: false,
            },
            onToggle: (self) => {
              // Only promote the 300vw three-image layer while it is on screen.
              gsap.set(track, {
                willChange: self.isActive ? "transform" : "auto",
              });
            },
          },
        });

        // Pads the timeline to exactly 1.0 so timeline time maps 1:1 onto
        // scroll progress -- TRAVEL and STEP below are expressed in those
        // units, and the snap callback receives scroll progress. Spanning
        // position 0 rather than being appended is the difference from the old
        // trailing `tl.to({}, { duration: 0.25 })`, which extended the timeline
        // *past* the last real animation and froze ~960px of pinned scroll.
        tl.to({}, { duration: 1 }, 0);

        // Backbone. ease:"none" is deliberate -- easing here would break the
        // direct-manipulation mapping.
        tl.to(track, { x: () => -travelPx(), duration: TRAVEL, force3D: true }, 0);

        // Settles just before panel 2 lands, rather than after it is already
        // centred (the old timing finished at 0.42 vs panel 2 at 0.375).
        if (img2) {
          tl.to(
            img2,
            { opacity: 1, scale: 1, duration: STEP * 0.7, ease: "power2.out" },
            STEP * 0.25
          );
        }

        // Crimson expands while panel 3 slides in instead of trailing it.
        if (vat) {
          tl.to(
            vat,
            { clipPath: "circle(150% at 50% 50%)", duration: STEP * 0.85 },
            STEP * 1.05
          );
        }

        // Logo and copy land just inside the dwell, so the dwell has something
        // to watch before the pin releases.
        if (logo3) {
          tl.to(
            logo3,
            { opacity: 1, scale: 1, duration: STEP * 0.6, ease: "back.out(1.4)" },
            STEP * 1.5
          );
        }
        if (text3) {
          tl.to(
            text3,
            { opacity: 1, y: 0, duration: STEP * 0.6, ease: "power2.out" },
            STEP * 1.5
          );
        }
      }
    );

    // August/Glacial swapping in changes text metrics, which shifts every
    // section below and leaves trigger positions stale.
    let cancelled = false;
    document.fonts?.ready.then(() => {
      if (!cancelled) ScrollTrigger.refresh();
    });

    // Reverts every tween, every gsap.set, and kills every ScrollTrigger made
    // inside the matchMedia scope -- including under StrictMode's double
    // invoke. The old getAll()/kill() loop left GSAP's inline clipPath,
    // opacity and scale on the panels behind.
    return () => {
      cancelled = true;
      mm.revert();
    };
  }, []);

  // Drives the mobile dot indicator. Global CSS hides every scrollbar, so
  // without this there is no affordance that the section scrolls sideways.
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const onScroll = () => {
      const w = el.clientWidth * MOBILE_PANEL_VW;
      if (w > 0) {
        setMobilePanel(
          Math.max(0, Math.min(PANELS - 1, Math.round(el.scrollLeft / w)))
        );
      }
    };
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <div className="relative w-full">
      <div
        ref={containerRef}
        // h-screen is the 100vh fallback: if a browser does not support svh the
        // inline height below is dropped and the pinned section would lose its
        // height entirely.
        className="relative w-full h-screen [height:62svh] md:[height:100svh] overflow-x-auto overflow-y-hidden snap-x snap-mandatory scrollbar-none md:overflow-hidden md:snap-none"
        style={{ backgroundColor: "#F4F0E6", ...sectionBackgroundStyle(backgroundImage, backgroundImageFit) }}
      >
        {/* Horizontal Track */}
        <div
          ref={trackRef}
          className="flex h-full w-[270vw] md:w-[300vw] select-none"
        >
          {/* PANEL 1: Weave & The Count */}
          <section
            className="w-[90vw] md:w-screen shrink-0 snap-center h-full flex flex-col md:flex-row items-center justify-between px-0 md:px-24 py-6 md:py-20 relative"
            style={{ backgroundColor: "#F4F0E6" }}
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
            <div className="w-full md:w-6/12 h-[26vh] md:h-[60vh] flex items-center justify-center relative">
              <div
                ref={slide1ImageRef}
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
            className="w-[90vw] md:w-screen shrink-0 snap-center h-full flex flex-col md:flex-row items-center justify-between px-0 md:px-24 py-6 md:py-20 relative"
            style={{ backgroundColor: "#EDE8DC" }}
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
            <div className="w-full md:w-6/12 h-[26vh] md:h-[60vh] flex items-center justify-center relative">
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
            className="w-[90vw] md:w-screen shrink-0 snap-center h-full flex flex-col md:flex-row items-center justify-between px-0 md:px-24 py-6 md:py-20 relative overflow-hidden"
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
            <div className="w-full md:w-6/12 h-[26vh] md:h-[60vh] flex items-center justify-center relative z-10">
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
        </div>
      </div>

      {/* Mobile swipe affordance. Global CSS hides every scrollbar, so
          without this there is no indication the section scrolls sideways. */}
      <div className="md:hidden absolute bottom-5 left-1/2 -translate-x-1/2 flex gap-2 z-20 pointer-events-none">
        {Array.from({ length: PANELS }, (_, i) => (
          <span
            key={i}
            className="block rounded-full transition-opacity duration-300"
            style={{
              width: 6,
              height: 6,
              backgroundColor: "#5B1C1C",
              opacity: mobilePanel === i ? 0.9 : 0.25,
            }}
          />
        ))}
      </div>
    </div>
  );
}
