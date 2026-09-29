"use client";

import Image from "next/image";
import Link from "next/link";
import { useRef } from "react";
import gsap from "gsap";
import { sectionBackgroundStyle, type SectionBackgroundFit } from "@/lib/sectionBackground";
import { PRODUCT_NAME_CLASS } from "@/lib/typography";
import SectionTitle from "@/components/SectionTitle";

type CollectionItem = {
  id?: number;
  number: string;
  name: string;
  tag: string;
  description: string;
  image: string;
};

interface Props {
  collections?: CollectionItem[];
  kicker?: string;
  title?: string;
  titleAccent?: string;
  sideNote?: string;
  backgroundImage?: string;
  backgroundImageFit?: SectionBackgroundFit;
}

// Distance (px) the mouse must travel before a press becomes a drag.
const DRAG_THRESHOLD = 5;

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
  const items = collections ?? [];
  const trackRef = useRef<HTMLDivElement>(null);
  const dragState = useRef({
    pressed: false,
    dragging: false,
    suppressClick: false,
    pointerId: -1,
    startX: 0,
    startScrollLeft: 0,
  });

  // Mouse-only drag-to-scroll (touch uses native scrolling). Pointer capture is
  // deferred until the mouse passes DRAG_THRESHOLD so plain clicks still reach
  // the card links.
  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.pointerType !== "mouse") return;
    const track = trackRef.current;
    if (!track) return;
    dragState.current = {
      pressed: true,
      dragging: false,
      suppressClick: false,
      pointerId: e.pointerId,
      startX: e.clientX,
      startScrollLeft: track.scrollLeft,
    };
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const state = dragState.current;
    if (!state.pressed) return;
    const track = trackRef.current;
    if (!track) return;
    const delta = e.clientX - state.startX;
    if (!state.dragging) {
      if (Math.abs(delta) < DRAG_THRESHOLD) return;
      state.dragging = true;
      track.setPointerCapture(state.pointerId);
      track.setAttribute("data-cursor-text", "DRAGGING");
    }
    track.scrollLeft = state.startScrollLeft - delta;
  };

  const endDrag = () => {
    const state = dragState.current;
    if (!state.pressed) return;
    const track = trackRef.current;
    if (state.dragging && track?.hasPointerCapture(state.pointerId)) {
      track.releasePointerCapture(state.pointerId);
    }
    track?.setAttribute("data-cursor-text", "DRAG");
    // A real drag ends with a click that must not navigate; swallow just that one.
    state.suppressClick = state.dragging;
    state.pressed = false;
    state.dragging = false;
  };

  const handleClickCapture = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!dragState.current.suppressClick) return;
    dragState.current.suppressClick = false;
    e.stopPropagation();
    e.preventDefault();
  };

  const headerKicker = kicker || DEFAULT_KICKER;
  const headerTitle = title || DEFAULT_TITLE;
  const headerTitleAccent = titleAccent || DEFAULT_TITLE_ACCENT;
  const sideNoteLines = (sideNote || DEFAULT_SIDE_NOTE).split("\n");

  return (
    <section
      className="px-0 md:px-12 py-12 md:py-16 relative"
      style={{ backgroundColor: "#FFF9EF", ...sectionBackgroundStyle(backgroundImage, backgroundImageFit) }}
    >
      {/* Section Header */}
      <div className="px-4 md:px-0 mb-8 md:mb-12 flex flex-col md:flex-row md:items-end justify-between reveal-fade-up">
        <SectionTitle
          kicker={headerKicker}
          title={headerTitle}
          accent={headerTitleAccent}
          size="clamp(2.5rem, 5vw, 4rem)"
        />
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

      {/* Horizontal carousel — swipe on touch, drag-to-scroll with a mouse */}
      <div
        ref={trackRef}
        className="flex items-stretch gap-3 md:gap-8 overflow-x-auto scrollbar-none px-4 md:px-0 pb-4 reveal-stagger-container"
        data-cursor-text="DRAG"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={endDrag}
        onPointerLeave={endDrag}
        onPointerCancel={endDrag}
        onClickCapture={handleClickCapture}
        onDragStart={(e) => e.preventDefault()}
      >
        {items.map((item) => (
          <div key={item.number} className="w-[82vw] md:w-[380px] lg:w-[420px] flex-shrink-0 flex flex-col reveal-stagger-item">
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

function PortraitCollectionCard({ id, name, tag, description, image }: PortraitCardProps) {
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
            quality={90}
          />
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
            className={`${PRODUCT_NAME_CLASS} mb-3`}
            style={{
              fontSize: "1.6rem",
              color: "#5B1C1C",
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
