"use client";

import Image from "next/image";
import Link from "next/link";
import { useRef } from "react";
import gsap from "gsap";
import { sectionBackgroundStyle, type SectionBackgroundFit } from "@/lib/sectionBackground";
import { PRODUCT_NAME_CLASS, TITLE_CLASS, TITLE_ACCENT_CLASS, TITLE_ACCENT_STYLE, titleStyle } from "@/lib/typography";

type CollectionItem = {
  id?: number;
  number: string;
  name: string;
  tag: string;
  description: string;
  image: string;
};

const FALLBACK_COLLECTIONS: CollectionItem[] = [
  {
    number: "01",
    name: "OXFORD WHITES",
    tag: "THE CLEAN SLATE",
    description: "100% Egyptian cotton Oxford cloth woven on heritage shuttle looms. Each shirt builds to a unique softness through careful long-term wear.",
    image: "/images/hero-1.png",
  },
  {
    number: "02",
    name: "LINEN NATURALS",
    tag: "THE WOVEN LIGHT",
    description: "European flax spun into 8oz linen, garment-dyed in natural earth pigments. The fabric breathes and softens with every wash cycle.",
    image: "/images/hero-3.png",
  },
  {
    number: "03",
    name: "CHAMBRAY BLUES",
    tag: "THE WORKWEAR ROOT",
    description: "Cone Mills chambray woven in the American South. Heavy-duty utility with mother-of-pearl shell buttons, felled seams, and box-pleat back for unrestricted movement.",
    image: "/images/product-hardware.png",
  },
];

interface Props {
  collections?: CollectionItem[];
  kicker?: string;
  title?: string;
  titleAccent?: string;
  sideNote?: string;
  backgroundImage?: string;
  backgroundImageFit?: SectionBackgroundFit;
}

const DEFAULT_KICKER = "NAAMI // THE ARCHIVAL SERIES";
const DEFAULT_TITLE = "Seasonal";
const DEFAULT_TITLE_ACCENT = "Collections";
const DEFAULT_SIDE_NOTE = "Curated Product Lines\nBuilt on Heritage Methods";

export default function CollectionsShowcase({
  collections,
  kicker,
  title,
  titleAccent,
  sideNote,
  backgroundImage,
  backgroundImageFit,
}: Props) {
  const items = collections && collections.length > 0 ? collections : FALLBACK_COLLECTIONS;
  const portraitItems = items.slice(0, 2);
  const landscapeItems = items.slice(2);

  const headerKicker = kicker || DEFAULT_KICKER;
  const headerTitle = title || DEFAULT_TITLE;
  const headerTitleAccent = titleAccent || DEFAULT_TITLE_ACCENT;
  const sideNoteLines = (sideNote || DEFAULT_SIDE_NOTE).split("\n");

  return (
    <section
      className="px-6 md:px-12 py-28 relative"
      style={{ backgroundColor: "#FFF9EF", ...sectionBackgroundStyle(backgroundImage, backgroundImageFit) }}
    >
      {/* Section Header */}
      <div className="mb-20 pb-8 border-b border-black/5 flex flex-col md:flex-row md:items-end justify-between reveal-fade-up">
        <div>
          <span
            className="font-sans font-bold uppercase tracking-[0.3em] mb-3 block"
            style={{ fontSize: "9px", color: "#5B1C1C" }}
          >
            {headerKicker}
          </span>
          <h2 className={TITLE_CLASS} style={titleStyle("clamp(2.5rem, 5vw, 4rem)")}>
            {headerTitle}
            <br />
            <span className={TITLE_ACCENT_CLASS} style={TITLE_ACCENT_STYLE}>
              {headerTitleAccent}
            </span>
          </h2>
        </div>
        <div
          className="mt-6 md:mt-0 font-sans font-bold uppercase tracking-[0.25em] text-left md:text-right"
          style={{ fontSize: "9px", color: "rgba(17,17,17,0.4)", lineHeight: 1.6 }}
        >
          {sideNoteLines.map((line, idx) => (
            <span key={idx}>
              {idx > 0 && <br />}
              {line}
            </span>
          ))}
        </div>
      </div>

      {/* Asymmetric Editorial Layout Grid */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-10 md:gap-12 items-stretch reveal-stagger-container">

        {/* ROW 1: Portrait Cards */}
        {portraitItems.map((item) => (
          <div key={item.number} className="md:col-span-6 flex flex-col reveal-stagger-item">
            <PortraitCollectionCard
              id={item.id}
              number={item.number}
              name={item.name}
              tag={item.tag}
              description={item.description}
              image={item.image}
            />
          </div>
        ))}

        {/* ROW 2: Landscape Cards */}
        {landscapeItems.map((item) => (
          <div key={item.number} className="md:col-span-12 mt-4 md:mt-8 reveal-stagger-item">
            <LandscapeCollectionCard
              id={item.id}
              number={item.number}
              name={item.name}
              tag={item.tag}
              description={item.description}
              image={item.image}
            />
          </div>
        ))}

      </div>
    </section>
  );
}

/* ========================================================================= */
/* Portrait Collection Card (Row 1)                                          */
/* ========================================================================= */
interface PortraitCardProps {
  id?: number;
  number: string;
  name: string;
  tag: string;
  description: string;
  image: string;
}

function PortraitCollectionCard({ id, number, name, tag, description, image }: PortraitCardProps) {
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
    <Link
      href={id != null ? `/collection?collection=${id}` : "/collection"}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      className="flex flex-col h-full cursor-pointer group"
      data-cursor-text="DISCOVER"
    >
      {/* Image Block */}
      <div
        className="relative overflow-hidden w-full border border-black/5 bg-[#F8F1E5]"
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

        {/* Floating Category Number Tag */}
        <div
          className="absolute bottom-6 left-6 font-sans font-bold uppercase tracking-[0.25em]"
          style={{
            fontSize: "9px",
            color: "#FFF9EF",
            backgroundColor: "#5B1C1C",
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
            className={`${PRODUCT_NAME_CLASS} mb-3 transition-colors group-hover:text-[#5B1C1C]`}
            style={{
              fontSize: "1.6rem",
              color: "#1A1212",
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
              color: "#1A1212",
              borderBottom: "1px solid #1A1212",
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
            stroke="#5B1C1C"
            strokeWidth={3}
          >
            <path d="M9 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
      </div>
    </Link>
  );
}

/* ========================================================================= */
/* Landscape Collection Card (Row 2)                                         */
/* ========================================================================= */
interface LandscapeCardProps {
  id?: number;
  number: string;
  name: string;
  tag: string;
  description: string;
  image: string;
}

function LandscapeCollectionCard({ id, number, name, tag, description, image }: LandscapeCardProps) {
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
    <Link
      href={id != null ? `/collection?collection=${id}` : "/collection"}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      className="flex flex-col md:flex-row border border-black/5 bg-[#F8F1E5] hover:border-black/15 transition-colors duration-300 cursor-pointer group"
      data-cursor-text="DISCOVER"
    >
      {/* Image Block (Left/Top) */}
      <div
        className="relative overflow-hidden w-full md:w-7/12 bg-[#F8F1E5]"
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
            style={{ fontSize: "9px", color: "#5B1C1C" }}
          >
            COLLECTION {number} // {tag}
          </span>
          <h3
            className={`${PRODUCT_NAME_CLASS} mb-4 transition-colors group-hover:text-[#5B1C1C]`}
            style={{
              fontSize: "1.85rem",
              color: "#1A1212",
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
              color: "#1A1212",
              borderBottom: "1px solid #1A1212",
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
            stroke="#5B1C1C"
            strokeWidth={3}
          >
            <path d="M9 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
      </div>
    </Link>
  );
}
