"use client";

import { useRef, useEffect, useState } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import Image from "next/image";
import { useCartStore } from "@/models/cartStore";

gsap.registerPlugin(ScrollTrigger);

interface HotspotData {
  id: number;
  top: string;
  left: string;
  title: string;
  price: string;
  number: string;
}

const hotspots: HotspotData[] = [
  {
    id: 1,
    top: "32%",
    left: "45%",
    title: "RAW INDIGO TRUCKER",
    price: "₹29,900 INR",
    number: "01",
  },
  {
    id: 2,
    top: "68%",
    left: "52%",
    title: "SELVEDGE STRAIGHT FIT",
    price: "₹23,200 INR",
    number: "02",
  },
  {
    id: 3,
    top: "50%",
    left: "48%",
    title: "OXIDIZED BRASS HARDWARE",
    price: "₹9,900 INR",
    number: "03",
  },
];

export default function HotspotBanner() {
  const containerRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLDivElement>(null);
  const incrementItems = useCartStore((state) => state.incrementItems);

  useEffect(() => {
    if (!containerRef.current || !imageRef.current) return;

    gsap.to(imageRef.current, {
      scale: 1.06,
      ease: "none",
      scrollTrigger: {
        trigger: containerRef.current,
        start: "top bottom",
        end: "bottom top",
        scrub: true,
      },
    });
  }, []);

  return (
    <section
      ref={containerRef}
      className="relative w-full overflow-hidden"
      style={{ height: "90vh", backgroundColor: "#EDE8DC" }}
    >
      {/* Parallax Image Container */}
      <div
        ref={imageRef}
        className="absolute inset-0 hw-accelerate"
        style={{ scale: 1, transformOrigin: "center center" }}
      >
        <Image
          src="/images/campaign-new.png"
          alt="NAAMI — AW26 Campaign Lookbook"
          fill
          className="object-cover"
          style={{ filter: "brightness(0.92)" }}
          priority
        />

      </div>

      {/* Section label */}
      <div
        className="absolute top-8 left-12 font-sans font-bold uppercase tracking-[0.25em]"
        style={{ fontSize: "10px", color: "#111111", opacity: 0.6, zIndex: 10 }}
      >
        NAAMI // INTERACTIVE LOOKBOOK
      </div>

      {/* Hotspot nodes */}
      {hotspots.map((spot) => (
        <HotspotNode key={spot.id} data={spot} onAdd={incrementItems} />
      ))}
    </section>
  );
}

function HotspotNode({
  data,
  onAdd,
}: {
  data: HotspotData;
  onAdd: () => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const dotRef = useRef<HTMLDivElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);

  const handleMouseEnter = () => {
    setIsOpen(true);
    if (dotRef.current) {
      gsap.to(dotRef.current, {
        scale: 1.15,
        duration: 0.3,
        ease: "power2.out",
      });
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!dotRef.current) return;
    const rect = dotRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left - rect.width / 2;
    const y = e.clientY - rect.top - rect.height / 2;

    gsap.to(dotRef.current, {
      x: x * 0.35,
      y: y * 0.35,
      duration: 0.25,
      ease: "power2.out",
    });
  };

  const handleMouseLeave = () => {
    setIsOpen(false);
    if (dotRef.current) {
      gsap.to(dotRef.current, {
        x: 0,
        y: 0,
        scale: 1,
        duration: 0.8,
        ease: "elastic.out(1, 0.3)",
      });
    }
  };

  const handleTouch = (e: React.TouchEvent) => {
    e.preventDefault();
    setIsOpen((prev) => !prev);
  };

  return (
    <div
      className="absolute -translate-x-1/2 -translate-y-1/2 cursor-pointer"
      style={{ top: data.top, left: data.left, zIndex: 10 }}
      onMouseEnter={handleMouseEnter}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      onTouchStart={handleTouch}
      data-cursor-text="VIEW PIECE"
    >
      {/* Rivet dot with ping halo */}
      <div
        ref={dotRef}
        className="relative flex items-center justify-center hw-accelerate"
        style={{ width: 28, height: 28 }}
      >
        {/* Outer ping halo */}
        <div
          className="absolute inset-0 rounded-full animate-ping"
          style={{
            backgroundColor: "rgba(212, 175, 55, 0.25)",
            border: "1px solid rgba(212, 175, 55, 0.4)",
          }}
        />
        {/* Secondary static halo ring */}
        <div
          className="absolute rounded-full"
          style={{
            inset: "-4px",
            border: "1px solid rgba(212, 175, 55, 0.25)",
            borderRadius: "50%",
          }}
        />
        {/* Core golden rivet */}
        <div
          className="rounded-full"
          style={{
            width: 14,
            height: 14,
            backgroundColor: "#D4AF37",
            border: "1px solid rgba(17,17,17,0.3)",
            boxShadow: "0 0 10px rgba(212, 175, 55, 0.6), inset 0 1px 2px rgba(255, 255, 255, 0.4)",
          }}
        />
      </div>

      {/* Floating product card */}
      <div
        ref={cardRef}
        className="absolute bottom-full mb-5 left-1/2 -translate-x-1/2 pointer-events-auto transition-all duration-300"
        style={{
          backgroundColor: "#F4F0E6",
          color: "#111111",
          padding: "20px",
          maxWidth: "230px",
          width: "max-content",
          boxShadow: "0 20px 50px rgba(139,26,26,0.12), 0 4px 12px rgba(0,0,0,0.08)",
          borderLeft: `2px solid #8B1A1A`,
          opacity: isOpen ? 1 : 0,
          transform: isOpen ? "translateY(0px)" : "translateY(12px)",
          pointerEvents: isOpen ? "auto" : "none",
        }}
      >
        <div
          className="font-sans font-bold uppercase tracking-[0.15em] mb-1"
          style={{ fontSize: "9px", color: "#8B1A1A" }}
        >
          {data.number}
        </div>
        <h4
          className="font-sans font-bold uppercase tracking-[0.1em] mb-2"
          style={{ fontSize: "11px", color: "#111111", lineHeight: 1.4 }}
        >
          {data.title}
        </h4>
        <p
          className="font-serif mb-5"
          style={{ fontSize: "15px", color: "#111111" }}
        >
          {data.price}
        </p>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onAdd();
          }}
          className="flex items-center gap-2 font-sans font-bold uppercase tracking-widest hover:opacity-60 transition-opacity cursor-pointer"
          style={{
            fontSize: "9px",
            color: "#111111",
            borderBottom: "1px solid #111111",
            paddingBottom: "2px",
          }}
          data-cursor-text="ADD"
        >
          ADD TO CART
          <svg
            width="10"
            height="10"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2.5}
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>
    </div>
  );
}
