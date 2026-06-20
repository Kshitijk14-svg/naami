"use client";

import Image from "next/image";
import { useRef } from "react";
import gsap from "gsap";

export default function CollectionsShowcase() {
  return (
    <section
      className="px-6 md:px-12 py-28 relative"
      style={{ backgroundColor: "#F4F0E6" }}
    >
      {/* Section Header */}
      <div className="mb-20 pb-8 border-b border-black/5 flex flex-col md:flex-row md:items-end justify-between reveal-fade-up">
        <div>
          <span
            className="font-sans font-bold uppercase tracking-[0.3em] mb-3 block"
            style={{ fontSize: "9px", color: "#8B1A1A" }}
          >
            NAAMI // THE ARCHIVAL SERIES
          </span>
          <h2
            className="font-serif font-light uppercase"
            style={{
              fontSize: "clamp(2.5rem, 5vw, 4rem)",
              color: "#111111",
              lineHeight: 1.05,
              letterSpacing: "0.02em",
            }}
          >
            Seasonal
            <br />
            <span style={{ color: "#8B1A1A", fontStyle: "italic" }}>
              Collections
            </span>
          </h2>
        </div>
        <div
          className="mt-6 md:mt-0 font-sans font-bold uppercase tracking-[0.25em] text-left md:text-right"
          style={{ fontSize: "9px", color: "rgba(17,17,17,0.4)", lineHeight: 1.6 }}
        >
          Curated Product Lines
          <br />
          Built on Heritage Methods
        </div>
      </div>

      {/* Asymmetric Editorial Layout Grid */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-10 md:gap-12 items-stretch reveal-stagger-container">

        {/* ROW 1: Portrait Collection 01 - Raw Indigo Series (Left) */}
        <div className="md:col-span-6 flex flex-col reveal-stagger-item">
          <PortraitCollectionCard
            number="01"
            name="RAW INDIGO SERIES"
            tag="THE RIGID BASE"
            description="14oz unwashed Japanese selvedge denim built to break in uniquely to your body's contour lines."
            image="/images/hero-1.png"
          />
        </div>

        {/* ROW 1: Portrait Collection 02 - Japanese Sashiko Weaves (Right) */}
        <div className="md:col-span-6 flex flex-col reveal-stagger-item">
          <PortraitCollectionCard
            number="02"
            name="JAPANESE SASHIKO"
            tag="THE TEXTURAL DEPTH"
            description="Traditional sashiko stitching techniques applied to heavy-duty workwear shirts and heritage vests."
            image="/images/hero-3.png"
          />
        </div>

        {/* ROW 2: Landscape Collection 03 - Oxidized Brass Hardware (Full Width) */}
        <div className="md:col-span-12 mt-4 md:mt-8 reveal-stagger-item">
          <LandscapeCollectionCard
            number="03"
            name="OXIDIZED BRASS"
            tag="THE CORROSIVE DETAIL"
            description="Individually cast solid brass rivets and buttons aged through slow oxidation for vintage texture."
            image="/images/product-hardware.png"
          />
        </div>

      </div>
    </section>
  );
}

/* ========================================================================= */
/* Portrait Collection Card (Row 1)                                          */
/* ========================================================================= */
interface PortraitCardProps {
  number: string;
  name: string;
  tag: string;
  description: string;
  image: string;
}

function PortraitCollectionCard({ number, name, tag, description, image }: PortraitCardProps) {
  const imageRef = useRef<HTMLDivElement>(null);

  const handleMouseEnter = () => {
    if (imageRef.current) {
      gsap.to(imageRef.current, {
        scale: 1.05,
        duration: 0.8,
        ease: "power2.out",
      });
    }
  };

  const handleMouseLeave = () => {
    if (imageRef.current) {
      gsap.to(imageRef.current, {
        scale: 1,
        duration: 0.7,
        ease: "power2.out",
      });
    }
  };

  return (
    <div
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      className="flex flex-col h-full cursor-pointer group"
      data-cursor-text="DISCOVER"
    >
      {/* Image Block */}
      <div
        className="relative overflow-hidden w-full border border-black/5 bg-[#EDE8DC]"
        style={{ aspectRatio: "4/5" }}
      >
        <div ref={imageRef} className="absolute inset-0 w-full h-full">
          <Image
            src={image}
            alt={name}
            fill
            className="object-cover"
            style={{ filter: "brightness(0.94)" }}
            sizes="(max-width: 768px) 100vw, 50vw"
          />
        </div>

        {/* Crimson corner rivet accent */}
        <div
          className="absolute top-4 right-4 rounded-full"
          style={{
            width: 8,
            height: 8,
            backgroundColor: "#8B1A1A",
          }}
        />

        {/* Selvedge red edge line */}
        <div
          className="absolute top-0 left-0 bottom-0"
          style={{ width: "3.5px", backgroundColor: "#8B1A1A", opacity: 0.85 }}
        />

        {/* Floating Category Number Tag */}
        <div
          className="absolute bottom-6 left-6 font-sans font-bold uppercase tracking-[0.25em]"
          style={{
            fontSize: "9px",
            color: "#FAF8F5",
            backgroundColor: "#8B1A1A",
            padding: "4px 8px",
          }}
        >
          COLLECTION {number}
        </div>
      </div>

      {/* Metadata / Details below Image */}
      <div className="pt-6 flex flex-col justify-between flex-grow">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <span
              className="font-sans font-bold uppercase tracking-[0.2em]"
              style={{ fontSize: "9px", color: "rgba(17,17,17,0.4)" }}
            >
              {tag}
            </span>
            <div className="h-px flex-1 bg-black/5" />
          </div>
          <h3
            className="font-serif font-light uppercase mb-3 transition-colors group-hover:text-[#8B1A1A]"
            style={{
              fontSize: "1.6rem",
              color: "#111111",
              letterSpacing: "0.03em",
            }}
          >
            {name}
          </h3>
          <p
            className="font-sans"
            style={{
              fontSize: "12px",
              color: "rgba(17,17,17,0.6)",
              lineHeight: 1.6,
            }}
          >
            {description}
          </p>
        </div>

        <div className="pt-6 flex items-center gap-3">
          <span
            className="font-sans font-bold uppercase tracking-widest"
            style={{
              fontSize: "8.5px",
              color: "#111111",
              borderBottom: "1px solid #111111",
              paddingBottom: "2px",
            }}
          >
            DISCOVER SERIES
          </span>
          <svg
            className="transform group-hover:translate-x-1 transition-transform"
            width="10"
            height="10"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#8B1A1A"
            strokeWidth={3}
          >
            <path d="M9 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
      </div>
    </div>
  );
}

/* ========================================================================= */
/* Landscape Collection Card (Row 2)                                         */
/* ========================================================================= */
interface LandscapeCardProps {
  number: string;
  name: string;
  tag: string;
  description: string;
  image: string;
}

function LandscapeCollectionCard({ number, name, tag, description, image }: LandscapeCardProps) {
  const imageRef = useRef<HTMLDivElement>(null);

  const handleMouseEnter = () => {
    if (imageRef.current) {
      gsap.to(imageRef.current, {
        scale: 1.03,
        duration: 0.8,
        ease: "power2.out",
      });
    }
  };

  const handleMouseLeave = () => {
    if (imageRef.current) {
      gsap.to(imageRef.current, {
        scale: 1,
        duration: 0.7,
        ease: "power2.out",
      });
    }
  };

  return (
    <div
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      className="flex flex-col md:flex-row border border-black/5 bg-[#EDE8DC] hover:border-black/15 transition-colors duration-300 cursor-pointer group"
      data-cursor-text="DISCOVER"
    >
      {/* Image Block (Left/Top) */}
      <div
        className="relative overflow-hidden w-full md:w-7/12 bg-[#EDE8DC]"
        style={{ aspectRatio: "16/10" }}
      >
        <div ref={imageRef} className="absolute inset-0 w-full h-full">
          <Image
            src={image}
            alt={name}
            fill
            className="object-cover"
            style={{ filter: "brightness(0.94)" }}
            sizes="(max-width: 768px) 100vw, 60vw"
          />
        </div>

        {/* Selvedge red edge line */}
        <div
          className="absolute top-0 left-0 bottom-0"
          style={{ width: "3.5px", backgroundColor: "#8B1A1A", opacity: 0.85 }}
        />
      </div>

      {/* Details Block (Right/Bottom) */}
      <div className="w-full md:w-5/12 p-8 md:p-12 flex flex-col justify-between relative">
        {/* Massive Background Accent Number */}
        <div
          className="absolute top-4 right-8 font-serif font-bold pointer-events-none select-none"
          style={{
            fontSize: "8rem",
            color: "rgba(139, 26, 26, 0.05)",
            lineHeight: 1,
          }}
        >
          {number}
        </div>

        <div>
          <span
            className="font-sans font-bold uppercase tracking-[0.25em] mb-4 block"
            style={{ fontSize: "9px", color: "#8B1A1A" }}
          >
            COLLECTION {number} // {tag}
          </span>
          <h3
            className="font-serif font-light uppercase mb-4 transition-colors group-hover:text-[#8B1A1A]"
            style={{
              fontSize: "1.85rem",
              color: "#111111",
              letterSpacing: "0.03em",
              lineHeight: 1.1,
            }}
          >
            {name}
          </h3>
          <p
            className="font-sans mb-8"
            style={{
              fontSize: "12px",
              color: "rgba(17,17,17,0.6)",
              lineHeight: 1.6,
              maxWidth: "360px",
            }}
          >
            {description}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <span
            className="font-sans font-bold uppercase tracking-widest"
            style={{
              fontSize: "8.5px",
              color: "#111111",
              borderBottom: "1px solid #111111",
              paddingBottom: "2px",
            }}
          >
            EXPLORE DETAILS
          </span>
          <svg
            className="transform group-hover:translate-x-1 transition-transform"
            width="10"
            height="10"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#8B1A1A"
            strokeWidth={3}
          >
            <path d="M9 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
      </div>
    </div>
  );
}
