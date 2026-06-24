"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { gsap, ScrollTrigger } from "@/lib/gsap";

export default function SelvedgeScrollbar() {
  const pathname = usePathname();
  const ribbonRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!ribbonRef.current) return;

    const st = ScrollTrigger.create({
      start: "top top",
      end: "bottom bottom",
      onUpdate: (self) => {
        if (ribbonRef.current) {
          gsap.set(ribbonRef.current, { scaleY: self.progress });
        }
      },
    });

    // Kill ONLY this trigger — not all triggers globally.
    return () => st.kill();
  }, []);

  if (pathname.startsWith("/admin")) return null;

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
