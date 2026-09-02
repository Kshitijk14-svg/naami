"use client";

import { useRef, useEffect, useState } from "react";
import { gsap, ScrollTrigger } from "@/lib/gsap";
import Image from "next/image";
import Link from "next/link";
import { useCartStore } from "@/models/cartStore";
import { formatINR } from "@/lib/format";
import { sectionBackgroundStyle, type SectionBackgroundFit } from "@/lib/sectionBackground";
import { PRICE_CLASS } from "@/lib/typography";

interface ResolvedProduct {
  id: number;
  name: string;
  priceInr: number;
  image: string;
}

interface HotspotData {
  id: number;
  topPct: number;
  leftPct: number;
  linkUrl: string | null;
  product: ResolvedProduct | null;
}

/** Turns a hotspot link URL ("/collection", "https://…/our-journey") into a short
 *  human label for the popover CTA. Falls back to "Explore". */
function linkLabel(url: string): string {
  try {
    const path = url.startsWith("http") ? new URL(url).pathname : url;
    const seg = path.split("/").filter(Boolean)[0];
    if (!seg) return "Explore";
    return seg.charAt(0).toUpperCase() + seg.slice(1).replace(/-/g, " ");
  } catch {
    return "Explore";
  }
}

// Shown only when no admin-configured lookbook banner data exists yet.
const FALLBACK_IMAGE = "/images/campaign-new.png";
const FALLBACK_LABEL = "NAAMI // INTERACTIVE LOOKBOOK";
const FALLBACK_HOTSPOTS: HotspotData[] = [
  { id: 1, topPct: 32, leftPct: 45, linkUrl: null, product: null },
  { id: 2, topPct: 68, leftPct: 52, linkUrl: null, product: null },
  { id: 3, topPct: 50, leftPct: 48, linkUrl: null, product: null },
];

interface HotspotBannerProps {
  image?: string;
  label?: string;
  hotspots?: HotspotData[];
  backgroundImage?: string;
  backgroundImageFit?: SectionBackgroundFit;
}

export default function HotspotBanner({ image, label, hotspots, backgroundImage, backgroundImageFit }: HotspotBannerProps) {
  const bannerImage = image || FALLBACK_IMAGE;
  const bannerLabel = label || FALLBACK_LABEL;
  const bannerHotspots = hotspots && hotspots.length > 0 ? hotspots : FALLBACK_HOTSPOTS;

  const containerRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLDivElement>(null);
  const addItem = useCartStore((state) => state.addItem);

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
      style={{ height: "90vh", backgroundColor: "#F8F1E5", ...sectionBackgroundStyle(backgroundImage, backgroundImageFit) }}
    >
      {/* Parallax Image Container */}
      <div
        ref={imageRef}
        className="absolute inset-0 hw-accelerate"
        style={{ scale: 1, transformOrigin: "center center" }}
      >
        <Image
          src={bannerImage}
          alt="NAAMI — AW26 Campaign Lookbook"
          fill
          className="object-cover"
          style={{ filter: "brightness(0.92)" }}
          sizes="100vw"
        />

      </div>

      {/* Section label */}
      <div
        className="absolute top-8 left-4 md:left-12 font-sans font-bold uppercase tracking-[0.25em]"
        style={{ fontSize: "10px", color: "#1A1212", opacity: 0.6, zIndex: 10 }}
      >
        {bannerLabel}
      </div>

      {/* Hotspot nodes */}
      {bannerHotspots.map((spot, idx) => (
        <HotspotNode key={spot.id} data={spot} number={String(idx + 1).padStart(2, "0")} onAdd={addItem} />
      ))}
    </section>
  );
}

function HotspotNode({
  data,
  number,
  onAdd,
}: {
  data: HotspotData;
  number: string;
  onAdd: (item: { productId: number; name: string; priceInr: number; image: string; size: string }) => void;
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

  const product = data.product;
  const link = data.linkUrl && data.linkUrl.trim() !== "" ? data.linkUrl.trim() : null;

  return (
    <div
      className="absolute -translate-x-1/2 -translate-y-1/2 cursor-pointer"
      style={{ top: `${data.topPct}%`, left: `${data.leftPct}%`, zIndex: 10 }}
      onMouseEnter={handleMouseEnter}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      onTouchStart={handleTouch}
      data-cursor-text={link ? "VIEW" : "VIEW PIECE"}
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
          backgroundColor: "#FFF9EF",
          color: "#1A1212",
          padding: "20px",
          maxWidth: "230px",
          width: "max-content",
          boxShadow: "0 20px 50px rgba(139,26,26,0.12), 0 4px 12px rgba(0,0,0,0.08)",
          borderLeft: `2px solid #5B1C1C`,
          opacity: isOpen ? 1 : 0,
          transform: isOpen ? "translateY(0px)" : "translateY(12px)",
          pointerEvents: isOpen ? "auto" : "none",
        }}
      >
        <div
          className="font-sans font-bold uppercase tracking-[0.15em] mb-1"
          style={{ fontSize: "9px", color: "#5B1C1C" }}
        >
          {number}
        </div>
        {link ? (
          <Link
            href={link}
            onClick={(e) => e.stopPropagation()}
            className="flex items-center gap-2 font-sans font-bold uppercase tracking-widest hover:opacity-60 transition-opacity cursor-pointer"
            style={{
              fontSize: "10px",
              color: "#1A1212",
              borderBottom: "1px solid #1A1212",
              paddingBottom: "2px",
            }}
            data-cursor-text="VIEW"
          >
            {linkLabel(link)}
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
          </Link>
        ) : product ? (
          <>
            <h4
              className="font-sans font-bold uppercase tracking-[0.1em] mb-2"
              style={{ fontSize: "11px", color: "#1A1212", lineHeight: 1.4 }}
            >
              {product.name}
            </h4>
            <p
              className={`${PRICE_CLASS} mb-5`}
              style={{ fontSize: "15px", color: "#1A1212" }}
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
                fontSize: "9px",
                color: "#1A1212",
                borderBottom: "1px solid #1A1212",
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
          </>
        ) : (
          <p className="font-sans" style={{ fontSize: "10px", color: "#1A1212", opacity: 0.5 }}>
            Item unavailable
          </p>
        )}
      </div>
    </div>
  );
}
