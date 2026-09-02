"use client";

import { useEffect, useRef } from "react";
import Image from "next/image";
import { gsap } from "@/lib/gsap";
import type { JourneyStop } from "@/lib/pageContentDefaults";

const INK = "#5B1C1C";

/** Small airplane glyph (Material "airplanemode" silhouette), drawn in a 24×24 box. */
function PlaneGlyph({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg viewBox="0 0 24 24" className={className} style={style} fill={INK} aria-hidden="true">
      <path d="M21 16v-2l-8-5V3.5C13 2.67 12.33 2 11.5 2S10 2.67 10 3.5V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z" />
    </svg>
  );
}

/**
 * Winding dashed trail between two stops, styled after the hand-drawn
 * treasure-map reference. `flip` mirrors it horizontally so the route zig-zags,
 * and the arrowhead always points toward the next stop. `plane` drops a small
 * airplane riding the trail.
 */
function TrailConnector({ flip, plane }: { flip: boolean; plane: boolean }) {
  return (
    <div aria-hidden="true" className="relative w-full">
      <svg
        className="mx-auto block w-full max-w-[520px]"
        style={{ height: "132px" }}
        viewBox="0 0 200 120"
        fill="none"
      >
        <g transform={flip ? "translate(200 0) scale(-1 1)" : undefined}>
          <path
            d="M 14 8 C 78 8 74 100 186 106"
            stroke={INK}
            strokeWidth={1}
            strokeLinecap="round"
            strokeDasharray="2 5"
            vectorEffect="non-scaling-stroke"
          />
          {/* arrowhead at the end, pointing toward the next stop */}
          <path
            d="M 176 98 L 188 106 L 174 112"
            stroke={INK}
            strokeWidth={1}
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
            vectorEffect="non-scaling-stroke"
          />
        </g>
      </svg>
      {plane && (
        <PlaneGlyph
          className="absolute"
          style={{
            width: "15px",
            height: "15px",
            left: "48%",
            top: "44%",
            opacity: 0.8,
            transform: `rotate(${flip ? -28 : 28}deg)`,
          }}
        />
      )}
    </div>
  );
}

/** Short vertical dashed hop used on mobile, with an arrowhead at the bottom. */
function MobileConnector() {
  return (
    <svg
      aria-hidden="true"
      className="mx-auto block"
      style={{ height: "64px", width: "24px" }}
      viewBox="0 0 24 64"
      fill="none"
    >
      <path
        d="M 12 2 L 12 54"
        stroke={INK}
        strokeWidth={1}
        strokeLinecap="round"
        strokeDasharray="2 5"
      />
      <path
        d="M 6 48 L 12 58 L 18 48"
        stroke={INK}
        strokeWidth={1}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default function OurJourneyMap({ stops }: { stops: JourneyStop[] }) {
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    const reveals = gsap.utils.toArray<HTMLElement>(".journey-reveal", root);
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (reduced) {
      gsap.set(reveals, { opacity: 1, y: 0 });
      return;
    }

    const ctx = gsap.context(() => {
      reveals.forEach((node) => {
        gsap.fromTo(
          node,
          { opacity: 0, y: 32 },
          {
            opacity: 1,
            y: 0,
            duration: 0.75,
            ease: "power2.out",
            scrollTrigger: { trigger: node, start: "top 88%", once: true },
          },
        );
      });
    }, root);

    return () => ctx.revert();
  }, [stops.length]);

  return (
    <div
      ref={rootRef}
      className="relative mx-auto max-w-4xl px-4 py-10 md:px-10 md:py-14"
      style={{
        backgroundColor: "#FBF3E1",
        borderRadius: "2px",
        boxShadow: "inset 0 0 60px rgba(91,28,28,0.06)",
        backgroundImage:
          "radial-gradient(120% 55% at 50% 0%, rgba(91,28,28,0.06), transparent 60%), radial-gradient(120% 55% at 50% 100%, rgba(91,28,28,0.05), transparent 60%)",
      }}
    >
      {stops.map((stop, i) => {
        const isRight = i % 2 === 1;
        const last = i === stops.length - 1;

        return (
          <div key={i}>
            <div
              className={`journey-reveal flex flex-col items-center gap-5 md:gap-10 md:flex-row ${
                isRight ? "md:flex-row-reverse" : ""
              }`}
              style={{ opacity: 0 }}
            >
              {/* Framed photo — scrapbook tape / pin */}
              <div
                className={`tape-frame tape-frame--${i % 2 === 0 ? "pin" : "tape"} shrink-0 w-[190px] md:w-[240px]`}
                style={{ "--tilt": `${isRight ? 2 : -2}deg` } as React.CSSProperties}
              >
                <div className="relative w-full overflow-hidden" style={{ aspectRatio: "3 / 4" }}>
                  <Image
                    src={stop.image}
                    alt={stop.caption || `Journey stop ${i + 1}`}
                    fill
                    className="object-cover"
                    sizes="(max-width: 768px) 190px, 240px"
                  />
                </div>
              </div>

              {/* Caption */}
              <div className="md:flex-1 text-center md:text-left">
                <p
                  className="font-sans font-bold uppercase tracking-[0.3em] mb-3"
                  style={{ fontSize: "8px", color: INK }}
                >
                  {String(i + 1).padStart(2, "0")}
                </p>
                {stop.caption && (
                  <p
                    className="font-sans mx-auto md:mx-0"
                    style={{ fontSize: "13px", color: "rgba(17,17,17,0.7)", lineHeight: 1.75, maxWidth: "34ch" }}
                  >
                    {stop.caption}
                  </p>
                )}
              </div>
            </div>

            {!last && (
              <>
                <div className="hidden md:block">
                  <TrailConnector flip={isRight} plane={i % 2 === 0} />
                </div>
                <div className="md:hidden">
                  <MobileConnector />
                </div>
              </>
            )}
          </div>
        );
      })}

      {/* Route end marker */}
      <div className="journey-reveal mt-8 flex items-center justify-center gap-3" style={{ opacity: 0 }}>
        <svg aria-hidden="true" width="64" height="16" viewBox="0 0 64 16" fill="none">
          <path d="M 2 8 L 52 8" stroke={INK} strokeWidth={1} strokeLinecap="round" strokeDasharray="2 5" />
          <path d="M 46 3 L 56 8 L 46 13" stroke={INK} strokeWidth={1} strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        <span className="font-serif" style={{ fontStyle: "italic", fontSize: "1.5rem", color: INK }}>
          end
        </span>
      </div>

      {/* Corner sparkle */}
      <svg
        aria-hidden="true"
        className="absolute bottom-4 right-4"
        width="22"
        height="22"
        viewBox="0 0 22 22"
        fill="none"
      >
        <path
          d="M11 1 C 11 7, 15 11, 21 11 C 15 11, 11 15, 11 21 C 11 15, 7 11, 1 11 C 7 11, 11 7, 11 1 Z"
          fill={INK}
          opacity={0.35}
        />
      </svg>
    </div>
  );
}
