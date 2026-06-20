"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

export default function SelvedgeScrollbar() {
  const ribbonRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!ribbonRef.current) return;

    // Map scroll progress to scaleY of the ribbon
    ScrollTrigger.create({
      start: "top top",
      end: "bottom bottom",
      onUpdate: (self) => {
        if (ribbonRef.current) {
          gsap.set(ribbonRef.current, { scaleY: self.progress });
        }
      },
    });

    return () => {
      ScrollTrigger.getAll().forEach((t) => t.kill());
    };
  }, []);

  return (
    <div
      className="selvedge-track"
      role="presentation"
      aria-hidden="true"
    >
      <div
        ref={ribbonRef}
        className="selvedge-ribbon hw-accelerate"
      >
        <div className="selvedge-ribbon-inner" />
      </div>
    </div>
  );
}
