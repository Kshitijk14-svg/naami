"use client";

import { useEffect, useRef } from "react";
import Image from "next/image";
import { gsap } from "@/lib/gsap";
import type { JourneyStop } from "@/lib/pageContentDefaults";

/** x-position (in the 0-100 viewBox) of a stop's image on desktop: the first
 *  stop sits left, and they alternate from there. */
const imageX = (index: number) => (index % 2 === 0 ? 20 : 80);

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
    <div ref={rootRef} className="mx-auto max-w-5xl pt-6">
      {stops.map((stop, i) => {
        const isRight = i % 2 === 1;
        const last = i === stops.length - 1;
        const curveD = `M ${imageX(i)} 0 C ${imageX(i)} 55, ${imageX(i + 1)} 45, ${imageX(i + 1)} 100`;

        return (
          <div key={i}>
            <div
              className={`journey-reveal flex flex-col items-center gap-6 md:gap-14 md:flex-row ${isRight ? "md:flex-row-reverse" : ""}`}
              style={{ opacity: 0 }}
            >
              {/* Portrait image frame */}
              <div
                className="relative w-[70%] max-w-[280px] shrink-0 overflow-hidden md:w-2/5 md:max-w-none"
                style={{ aspectRatio: "3 / 4", backgroundColor: "#F8F1E5" }}
              >
                <Image
                  src={stop.image}
                  alt={stop.caption || `Journey stop ${i + 1}`}
                  fill
                  className="object-cover"
                  sizes="(max-width: 768px) 70vw, 40vw"
                />
                {/* Selvedge line */}
                <div
                  className="absolute top-0 left-0 bottom-0"
                  style={{ width: "3px", backgroundColor: "#5B1C1C", opacity: 0.75 }}
                />
              </div>

              {/* Caption */}
              <div className="md:w-2/5 text-center md:text-left">
                <p
                  className="font-sans font-bold uppercase tracking-[0.3em] mb-3"
                  style={{ fontSize: "8px", color: "#5B1C1C" }}
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

            {/* Winding dashed connector to the next stop */}
            {!last && (
              <div aria-hidden="true">
                <svg
                  className="hidden md:block w-full"
                  style={{ height: "150px" }}
                  viewBox="0 0 100 100"
                  preserveAspectRatio="none"
                >
                  <path
                    d={curveD}
                    stroke="#5B1C1C"
                    strokeWidth={1.5}
                    fill="none"
                    strokeLinecap="round"
                    strokeDasharray="3 4"
                    vectorEffect="non-scaling-stroke"
                  />
                </svg>
                <svg
                  className="md:hidden w-full"
                  style={{ height: "80px" }}
                  viewBox="0 0 100 100"
                  preserveAspectRatio="none"
                >
                  <path
                    d="M 50 0 L 50 100"
                    stroke="#5B1C1C"
                    strokeWidth={1.5}
                    fill="none"
                    strokeLinecap="round"
                    strokeDasharray="3 4"
                    vectorEffect="non-scaling-stroke"
                  />
                </svg>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
