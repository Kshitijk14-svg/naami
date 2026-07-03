"use client";

import { useState, useRef } from "react";
import Image from "next/image";
import gsap from "gsap";
import { useCartStore } from "@/models/cartStore";
import { formatINR } from "@/lib/format";

interface ResolvedProduct {
  id: number;
  name: string;
  priceInr: number;
  image: string;
}

interface CardHotspot {
  id: number;
  topPct: number;
  leftPct: number;
  product: ResolvedProduct | null;
}

interface LookCardData {
  id: number;
  title: string;
  subtitle: string;
  image: string;
  hotspots: CardHotspot[];
}

// Shown only when no admin-configured look cards exist yet.
const FALLBACK_LOOK_CARDS: LookCardData[] = [
  {
    id: 1,
    title: "Look 01: Raw Uniform",
    subtitle: "Heavyweight utility layer combination",
    image: "/images/hero-2.png",
    hotspots: [
      { id: 101, topPct: 32, leftPct: 52, product: null },
      { id: 102, topPct: 72, leftPct: 48, product: null },
    ],
  },
  {
    id: 2,
    title: "Look 02: Textured Layers",
    subtitle: "Indigo-dyed sashiko weave & hardware focus",
    image: "/images/campaign.jpg",
    hotspots: [
      { id: 201, topPct: 38, leftPct: 54, product: null },
      { id: 202, topPct: 76, leftPct: 58, product: null },
    ],
  },
  {
    id: 3,
    title: "Look 03: Heritage Workwear",
    subtitle: "Classic denim overalls & loom-state canvas",
    image: "/images/campaign-new.png",
    hotspots: [
      { id: 301, topPct: 50, leftPct: 46, product: null },
      { id: 302, topPct: 78, leftPct: 52, product: null },
    ],
  },
];

interface HotspotCardsProps {
  lookCards?: LookCardData[];
}

export default function HotspotCards({ lookCards }: HotspotCardsProps) {
  const cards = lookCards && lookCards.length > 0 ? lookCards : FALLBACK_LOOK_CARDS;
  const addItem = useCartStore((state) => state.addItem);
  const trackRef = useRef<HTMLDivElement>(null);

  const handleNavClick = (direction: "prev" | "next") => {
    const track = trackRef.current;
    if (!track) return;

    // Kill any active tweens on the track to avoid conflict
    gsap.killTweensOf(track);

    const scrollAmount = window.innerWidth >= 768 ? 440 : 340; // card width + gap
    const target =
      direction === "prev"
        ? track.scrollLeft - scrollAmount
        : track.scrollLeft + scrollAmount;

    gsap.to(track, {
      scrollLeft: target,
      duration: 0.6,
      ease: "power3.out",
    });
  };

  return (
    <section
      className="px-6 md:px-12 py-24 relative overflow-hidden"
      style={{ backgroundColor: "#EDE8DC" }}
    >
      {/* Header and Controls */}
      <div className="mb-14 flex flex-row items-end justify-between reveal-fade-up">
        <div>
          <span
            className="font-sans font-bold uppercase tracking-[0.3em] mb-2 block"
            style={{ fontSize: "9px", color: "#8B1A1A" }}
          >
            NAAMI // INTERACTIVE CO-ORDINATES
          </span>
          <h2
            className="font-serif font-light uppercase"
            style={{
              fontSize: "clamp(2rem, 4vw, 3rem)",
              color: "#111111",
              lineHeight: 1.1,
              letterSpacing: "0.02em",
            }}
          >
            Shop The Look
          </h2>
        </div>

        {/* Carousel Navigation Arrows */}
        <div className="flex items-center gap-4">
          <button
            onClick={() => handleNavClick("prev")}
            className="w-10 h-10 flex items-center justify-center border border-black/10 hover:border-black/35 hover:text-[#8B1A1A] transition-colors cursor-pointer"
            aria-label="Previous Look"
            data-cursor-text="PREV"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <path d="M19 12H5M12 19l-7-7 7-7" />
            </svg>
          </button>
          <button
            onClick={() => handleNavClick("next")}
            className="w-10 h-10 flex items-center justify-center border border-black/10 hover:border-black/35 hover:text-[#8B1A1A] transition-colors cursor-pointer"
            aria-label="Next Look"
            data-cursor-text="NEXT"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <path d="M5 12h14M12 5l7 7 7 7" />
            </svg>
          </button>
        </div>
      </div>

      {/* Carousel Track Wrapper */}
      <div className="relative w-full reveal-stagger-container">

        {/* Extreme Edge Nav Hover Zones (Slick custom cursor follower hooks) */}
        <div
          className="absolute left-0 top-0 bottom-0 w-12 z-20 cursor-pointer hidden md:block"
          data-cursor-text="PREV"
          onClick={() => handleNavClick("prev")}
        />
        <div
          className="absolute right-0 top-0 bottom-0 w-12 z-20 cursor-pointer hidden md:block"
          data-cursor-text="NEXT"
          onClick={() => handleNavClick("next")}
        />

        {/* Horizontal Scroll Track */}
        <div
          ref={trackRef}
          className="flex gap-6 md:gap-8 overflow-x-auto whitespace-nowrap scrollbar-none pb-6"
          style={{
            scrollBehavior: "auto",
            WebkitOverflowScrolling: "touch",
          }}
        >
          {cards.map((look) => (
            <div
              key={look.id}
              className="inline-block w-[300px] md:w-[400px] flex-shrink-0 bg-[#F4F0E6] p-6 border border-black/5 reveal-stagger-item whitespace-normal select-none"
            >
              {/* Card Meta Info */}
              <div className="mb-4">
                <h3
                  className="font-serif font-light uppercase"
                  style={{ fontSize: "1.25rem", color: "#111111" }}
                >
                  {look.title}
                </h3>
                <p
                  className="font-sans truncate"
                  style={{ fontSize: "11px", color: "#111111", opacity: 0.5 }}
                >
                  {look.subtitle}
                </p>
              </div>

              {/* Image Container with Hotspots */}
              <div
                className="relative overflow-hidden w-full border border-black/5"
                style={{ aspectRatio: "4/5" }}
              >
                <Image
                  src={look.image}
                  alt={look.title}
                  fill
                  className="object-cover pointer-events-none"
                  style={{ filter: "brightness(0.94)" }}
                  sizes="(max-width: 768px) 300px, 400px"
                />

                {/* Selvedge red edge line */}
                <div
                  className="absolute top-0 left-0 bottom-0"
                  style={{ width: "2.5px", backgroundColor: "#8B1A1A", opacity: 0.8 }}
                />

                {/* Hotspot Nodes */}
                {look.hotspots.map((spot, idx) => (
                  <HotspotCardNode
                    key={spot.id}
                    spot={spot}
                    number={String(idx + 1).padStart(2, "0")}
                    onAdd={addItem}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function HotspotCardNode({
  spot,
  number,
  onAdd,
}: {
  spot: CardHotspot;
  number: string;
  onAdd: (item: { productId: number; name: string; priceInr: number; image: string; size: string }) => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const dotRef = useRef<HTMLDivElement>(null);

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
    e.stopPropagation();
    setIsOpen((prev) => !prev);
  };

  const product = spot.product;

  return (
    <div
      className="absolute -translate-x-1/2 -translate-y-1/2 cursor-pointer z-30"
      style={{ top: `${spot.topPct}%`, left: `${spot.leftPct}%` }}
      onMouseEnter={handleMouseEnter}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      onTouchStart={handleTouch}
    >
      {/* Rivet dot with ping halo */}
      <div
        ref={dotRef}
        className="relative flex items-center justify-center"
        style={{ width: 24, height: 24 }}
      >
        {/* Outer ping halo */}
        <div
          className="absolute inset-0 rounded-full animate-ping"
          style={{
            backgroundColor: "rgba(212, 175, 55, 0.2)",
            border: "1px solid rgba(212, 175, 55, 0.35)",
          }}
        />
        {/* Core golden rivet */}
        <div
          className="rounded-full"
          style={{
            width: 12,
            height: 12,
            backgroundColor: "#D4AF37",
            border: "1px solid rgba(17,17,17,0.3)",
            boxShadow: "0 0 8px rgba(212, 175, 55, 0.5)",
          }}
        />
      </div>

      {/* Popover Product Tooltip Card */}
      <div
        className="absolute bottom-full mb-3 left-1/2 -translate-x-1/2 pointer-events-auto transition-all duration-300"
        style={{
          backgroundColor: "#F4F0E6",
          color: "#111111",
          padding: "16px",
          width: "200px",
          boxShadow: "0 12px 32px rgba(139,26,26,0.1), 0 4px 8px rgba(0,0,0,0.06)",
          borderLeft: `2px solid #8B1A1A`,
          opacity: isOpen ? 1 : 0,
          transform: isOpen ? "translateY(0px)" : "translateY(8px)",
          pointerEvents: isOpen ? "auto" : "none",
        }}
      >
        <div
          className="font-sans font-bold uppercase tracking-[0.15em] mb-1"
          style={{ fontSize: "8px", color: "#8B1A1A" }}
        >
          {number} // PIECE
        </div>
        {product ? (
          <>
            <h4
              className="font-sans font-bold uppercase tracking-[0.1em] mb-1"
              style={{ fontSize: "10px", color: "#111111", lineHeight: 1.3 }}
            >
              {product.name}
            </h4>
            <p
              className="font-serif mb-4"
              style={{ fontSize: "14px", color: "#111111" }}
            >
              {formatINR(product.priceInr)}
            </p>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onAdd({
                  productId: product.id,
                  name: product.name,
                  priceInr: product.priceInr,
                  image: product.image,
                  size: "One Size",
                });
              }}
              className="flex items-center gap-2 font-sans font-bold uppercase tracking-widest hover:opacity-60 transition-opacity cursor-pointer"
              style={{
                fontSize: "8px",
                color: "#111111",
                borderBottom: "1px solid #111111",
                paddingBottom: "1px",
              }}
            >
              ADD TO CART
              <svg
                width="8"
                height="8"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={3}
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </>
        ) : (
          <p
            className="font-sans"
            style={{ fontSize: "10px", color: "#111111", opacity: 0.5 }}
          >
            Item unavailable
          </p>
        )}
      </div>
    </div>
  );
}
