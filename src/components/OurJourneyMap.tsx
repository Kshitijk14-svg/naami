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
 * treasure-map reference. It stretches the full width and stays short, so its
 * ends sit right under / over the framed photos on either side. `fromRight` is
 * true when the stop above sits on the right — the trail then curves back to
 * the left, and the arrowhead + plane always face the next stop.
 */
function TrailConnector({ fromRight, plane }: { fromRight: boolean; plane: boolean }) {
  const fromX = fromRight ? 82 : 18;
  const toX = fromRight ? 18 : 82;
  const goingRight = toX > fromX;

  return (
    <div aria-hidden="true" className="relative w-full" style={{ height: "62px" }}>
      <svg
        className="absolute inset-0 h-full w-full"
        viewBox="0 0 100 60"
        preserveAspectRatio="none"
      >
        <path
          d={`M ${fromX} 1 C ${fromX} 33, ${toX} 24, ${toX} 59`}
          stroke={INK}
          strokeWidth={1}
          strokeLinecap="round"
          strokeDasharray="2 4"
          fill="none"
          vectorEffect="non-scaling-stroke"
        />
      </svg>

      {/* Arrowhead at the trail's landing point (kept aspect-correct) */}
      <svg
        className="absolute"
        width="12"
        height="12"
        viewBox="0 0 12 12"
        fill="none"
        style={{ left: `${toX}%`, bottom: "-2px", transform: "translateX(-50%)" }}
      >
        <path
          d={goingRight ? "M 3 2 L 8 7 L 2 9" : "M 9 2 L 4 7 L 10 9"}
          stroke={INK}
          strokeWidth={1}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>

      {plane && (
        <PlaneGlyph
          className="absolute"
          style={{
            width: "15px",
            height: "15px",
            left: "50%",
            top: "38%",
            opacity: 0.8,
            transform: `translateX(-50%) rotate(${goingRight ? 24 : -24}deg)`,
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
      style={{ height: "40px", width: "24px" }}
      viewBox="0 0 24 40"
      fill="none"
    >
      <path d="M 12 1 L 12 32" stroke={INK} strokeWidth={1} strokeLinecap="round" strokeDasharray="2 4" />
      <path d="M 7 27 L 12 35 L 17 27" stroke={INK} strokeWidth={1} strokeLinecap="round" strokeLinejoin="round" />
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
    <div ref={rootRef} className="mx-auto max-w-3xl">
      {stops.map((stop, i) => {
        const isRight = i % 2 === 1;
        const last = i === stops.length - 1;

        return (
          <div key={i}>
            <div
              className={`journey-reveal flex flex-col items-center gap-3 md:gap-8 md:flex-row ${
                isRight ? "md:flex-row-reverse" : ""
              }`}
              style={{ opacity: 0 }}
            >
              {/* Framed photo — scrapbook tape / pin */}
              <div
                className={`tape-frame tape-frame--${i % 2 === 0 ? "pin" : "tape"} shrink-0 w-[180px] md:w-[220px]`}
                style={{ "--tilt": `${isRight ? 2 : -2}deg` } as React.CSSProperties}
              >
                <div className="relative w-full overflow-hidden" style={{ aspectRatio: "3 / 4" }}>
                  <Image
                    src={stop.image}
                    alt={stop.caption || `Journey stop ${i + 1}`}
                    fill
                    className="object-cover"
                    sizes="(max-width: 768px) 180px, 220px"
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
                  <TrailConnector fromRight={isRight} plane={i % 2 === 0} />
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
      <div className="journey-reveal mt-4 flex items-center justify-center gap-3" style={{ opacity: 0 }}>
        <svg aria-hidden="true" width="60" height="16" viewBox="0 0 60 16" fill="none">
          <path d="M 2 8 L 48 8" stroke={INK} strokeWidth={1} strokeLinecap="round" strokeDasharray="2 4" />
          <path d="M 42 3 L 52 8 L 42 13" stroke={INK} strokeWidth={1} strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        <span className="font-serif" style={{ fontStyle: "italic", fontSize: "1.4rem", color: INK }}>
          end
        </span>
      </div>
    </div>
  );
}
