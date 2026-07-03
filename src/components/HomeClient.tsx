"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { gsap } from "@/lib/gsap";
import BrandLoader from "@/components/BrandLoader";
import HotspotBanner from "@/components/HotspotBanner";
import ProductCarousel from "@/components/ProductCarousel";
import EvanliteFooter from "@/components/EvanliteFooter";
import CollectionsShowcase from "@/components/CollectionsShowcase";
// LoomTimeline, HotspotCards, and CoinPocketReveal all stay as regular
// top-level imports rather than next/dynamic: this file's global scroll-reveal
// effect (below) scans the whole document for .reveal-fade-up/.reveal-stagger-*
// elements on mount, and LoomTimeline additionally creates a pinned
// ScrollTrigger that resizes total document scroll height. Deferring any of
// these components' mount via next/dynamic races that timing — confirmed to
// cause a hydration mismatch (HotspotCards) and stale/misaligned scroll
// triggers in sections below (LoomTimeline) — so all three load eagerly.
import HotspotCards from "@/components/HotspotCards";
import LoomTimeline, { type LoomTimelineContent } from "@/components/LoomTimeline";
import CoinPocketReveal, { type CoinPocketContent } from "@/components/CoinPocketReveal";
import { useCartStore } from "@/models/cartStore";

type CarouselProduct = {
  id: number;
  number: string;
  name: string;
  subtitle: string;
  price: string;
  priceInr: number;
  material: string;
  fit: string;
  origin: string;
  image: string;
  thumbnailImage?: string;
  sizes?: string[];
};

type HomepageCollection = {
  number: string;
  name: string;
  tag: string;
  description: string;
  image: string;
  thumbnailImage?: string;
};

type HeroSlide = {
  image: string;
  title: string;
  subtitle: string;
  tag: string;
};

type ResolvedProduct = { id: number; name: string; priceInr: number; image: string };

type HotspotData = { id: number; topPct: number; leftPct: number; product: ResolvedProduct | null };

type LookCardData = {
  id: number;
  title: string;
  subtitle: string;
  image: string;
  hotspots: HotspotData[];
};

type LookbookBanner = {
  image?: string;
  label?: string;
  hotspots: HotspotData[];
};

type Manifesto = {
  image: string;
  kicker: string;
  quote: string;
  attribution: string;
};

interface HomeClientProps {
  heroSlides: HeroSlide[];
  newArrivals: CarouselProduct[];
  bestsellers: CarouselProduct[];
  homepageCollections: HomepageCollection[];
  lookCards: LookCardData[];
  lookbookBanner: LookbookBanner;
  loomContent: LoomTimelineContent;
  coinPocketContent: CoinPocketContent;
  manifesto: Manifesto;
}

export default function HomeClient({
  heroSlides,
  newArrivals,
  bestsellers,
  homepageCollections,
  lookCards,
  lookbookBanner,
  loomContent,
  coinPocketContent,
  manifesto,
}: HomeClientProps) {
  // Force scroll to top on reload/mount
  useEffect(() => {
    window.scrollTo(0, 0);
    if ('scrollRestoration' in history) {
      history.scrollRestoration = 'manual';
    }
  }, []);

  const cartItemsCount = useCartStore((state) => state.cartItemsCount);
  const incrementItems = useCartStore((state) => state.incrementItems);

  const [currentSlide, setCurrentSlide] = useState(0);
  const slideTextRef = useRef<HTMLDivElement>(null);

  const handleNextSlide = () => {
    setCurrentSlide((prev) => (prev + 1) % heroSlides.length);
  };

  const handlePrevSlide = () => {
    setCurrentSlide((prev) => (prev - 1 + heroSlides.length) % heroSlides.length);
  };

  useEffect(() => {
    if (!slideTextRef.current) return;
    gsap.killTweensOf(slideTextRef.current);
    gsap.fromTo(
      slideTextRef.current,
      { opacity: 0, y: 15 },
      { opacity: 1, y: 0, duration: 0.6, ease: "power2.out" }
    );
  }, [currentSlide]);

  const heroTitleRef = useRef<HTMLDivElement>(null);
  const heroSubRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      // Hero entrance
      gsap.fromTo(
        heroTitleRef.current,
        { opacity: 0, y: 40 },
        {
          opacity: 1,
          y: 0,
          duration: 1.1,
          ease: "power3.out",
          delay: 3.2,
        }
      );

      gsap.fromTo(
        heroSubRef.current,
        { opacity: 0, y: 20 },
        {
          opacity: 1,
          y: 0,
          duration: 0.9,
          ease: "power3.out",
          delay: 3.6,
        }
      );

      // Global stagger container reveals
      const staggerContainers = gsap.utils.toArray<HTMLElement>(".reveal-stagger-container");
      staggerContainers.forEach((container) => {
        const items = container.querySelectorAll(".reveal-stagger-item");
        if (items.length === 0) return;
        gsap.fromTo(
          items,
          { opacity: 0, y: 35 },
          {
            opacity: 1,
            y: 0,
            duration: 0.9,
            ease: "power2.out",
            stagger: 0.15,
            scrollTrigger: {
              trigger: container,
              start: "top 80%",
              toggleActions: "play reverse play reverse",
            },
          }
        );
      });

      // Global fade up reveals
      const fadeUpElements = gsap.utils.toArray<HTMLElement>(".reveal-fade-up");
      fadeUpElements.forEach((el) => {
        gsap.fromTo(
          el,
          { opacity: 0, y: 40 },
          {
            opacity: 1,
            y: 0,
            duration: 1,
            ease: "power3.out",
            scrollTrigger: {
              trigger: el,
              start: "top 85%",
              toggleActions: "play reverse play reverse",
            },
          }
        );
      });
    });

    return () => ctx.revert();
  }, []);

  return (
    <main
      className="relative w-full min-h-screen"
      style={{ backgroundColor: "#F4F0E6", color: "#111111" }}
    >
      {/* Cinematic unzipping loader */}
      <BrandLoader />

      {/* ── Hero Section ───────────────────────────────────────── */}
      <section
        className="pt-28 pb-10 px-6 md:px-12"
        style={{ backgroundColor: "#F4F0E6" }}
      >
        <div
          ref={heroTitleRef}
          className="relative w-full h-[65vh] md:h-[75vh] overflow-hidden border border-black/5"
          style={{ opacity: 0 }}
        >
          {/* Red edge selvedge line */}
          <div
            className="absolute top-0 left-0 bottom-0 z-30"
            style={{ width: "3.5px", backgroundColor: "#8B1A1A", opacity: 0.85 }}
          />

          {heroSlides.map((slide, idx) => (
            <div
              key={idx}
              className="absolute inset-0 transition-opacity duration-700 ease-in-out"
              style={{
                opacity: idx === currentSlide ? 1 : 0,
                zIndex: idx === currentSlide ? 10 : 0,
              }}
            >
              <Image
                src={slide.image}
                alt={slide.title}
                fill
                className="object-cover"
                style={{ filter: "brightness(0.9)" }}
                priority={idx === 0}
                sizes="100vw"
              />
              {/* Denim texture overlay */}
              <div
                className="absolute inset-0 opacity-[0.04] mix-blend-overlay"
                style={{
                  backgroundImage: `repeating-linear-gradient(
                    0deg,
                    transparent,
                    transparent 2px,
                    rgba(17,17,17,0.3) 2px,
                    rgba(17,17,17,0.3) 3px
                  ), repeating-linear-gradient(
                    90deg,
                    transparent,
                    transparent 4px,
                    rgba(17,17,17,0.15) 4px,
                    rgba(17,17,17,0.15) 5px
                  )`,
                }}
              />
              {/* Vignette overlay */}
              {/* No gradient overlay */}
            </div>
          ))}

          {/* ODD RITUAL GOLF Hover Zones for Custom Cursor Navigation */}
          <div
            className="absolute left-0 top-0 bottom-0 w-1/2 z-20 cursor-pointer"
            data-cursor-text="PREV"
            onClick={handlePrevSlide}
          />
          <div
            className="absolute right-0 top-0 bottom-0 w-1/2 z-20 cursor-pointer"
            data-cursor-text="NEXT"
            onClick={handleNextSlide}
          />

          {/* Slide Text details */}
          <div
            ref={slideTextRef}
            className="absolute bottom-8 left-8 md:bottom-12 md:left-12 z-30 pointer-events-none select-none"
          >
            <span
              className="font-sans font-bold uppercase tracking-[0.3em] mb-3 block"
              style={{ fontSize: "9px", color: "#8B1A1A" }}
            >
              {heroSlides[currentSlide].tag}
            </span>
            <h2
              className="font-serif font-light uppercase leading-none mb-3"
              style={{
                fontSize: "clamp(2.5rem, 6vw, 5.5rem)",
                color: "#FAF8F5",
                letterSpacing: "-0.01em",
              }}
            >
              {heroSlides[currentSlide].title}
            </h2>
            <p
              className="font-sans font-bold uppercase tracking-[0.2em]"
              style={{ fontSize: "10px", color: "#FAF8F5", opacity: 0.7 }}
            >
              {heroSlides[currentSlide].subtitle}
            </p>
          </div>
        </div>

        {/* ── Slide Counter & Progress Bar ────────────────────────── */}
        <div
          ref={heroSubRef}
          className="flex flex-col gap-2 mt-4 w-full"
          style={{ opacity: 0 }}
        >
          <div className="flex items-center justify-between font-sans font-bold uppercase tracking-[0.2em]" style={{ fontSize: "9px", color: "#111111" }}>
            <span>0{currentSlide + 1}</span>
            <span style={{ opacity: 0.35 }}>/ 0{heroSlides.length}</span>
          </div>
          {/* Progress bar track */}
          <div className="w-full h-[1.5px] bg-[#111111]/10 relative overflow-hidden">
            <div
              className="absolute left-0 top-0 h-full bg-[#8B1A1A] transition-all duration-700 ease-out"
              style={{
                width: `${((currentSlide + 1) / heroSlides.length) * 100}%`,
              }}
            />
          </div>
        </div>
      </section>

      {/* ── Collections Showcase ─────────────────────────────────── */}
      <CollectionsShowcase collections={homepageCollections} />

      {/* ── Scroll-Pinned Loom Horizontal Timeline ── */}
      <LoomTimeline content={loomContent} />

      {/* ── Stitch Separator ── */}
      <div className="w-full h-8 flex items-center justify-center overflow-hidden" style={{ backgroundColor: "#F4F0E6" }}>
        <svg width="100%" height="8" className="w-full opacity-50">
          <line x1="0" y1="4" x2="100%" y2="4" stroke="#8B1A1A" strokeWidth="1.2" className="reveal-stitch-line" />
        </svg>
      </div>

      {/* ── New Arrivals Section ────────────────────────────────── */}
      <div className="reveal-fade-up">
        <ProductCarousel
          title="New Arrivals"
          tag="NAAMI // THE LATEST PIECES"
          products={newArrivals}
          gatewayLabel="Discover New Products"
        />
      </div>

      {/* ── Hotspot Banner ─────────────────────────────────────── */}
      <div className="reveal-fade-up">
        <HotspotBanner
          image={lookbookBanner.image}
          label={lookbookBanner.label}
          hotspots={lookbookBanner.hotspots}
        />
      </div>

      {/* ── Hotspot Cards Section ──────────────────────────────── */}
      <HotspotCards lookCards={lookCards} />

      {/* ── Stitch Separator ── */}
      <div className="w-full h-8 flex items-center justify-center overflow-hidden" style={{ backgroundColor: "#EDE8DC" }}>
        <svg width="100%" height="8" className="w-full opacity-40">
          <line x1="0" y1="4" x2="100%" y2="4" stroke="#8B1A1A" strokeWidth="1.2" className="reveal-stitch-line" />
        </svg>
      </div>

      {/* ── Bestsellers Section ─────────────────────────────────── */}
      <div className="reveal-fade-up">
        <ProductCarousel
          title="Bestsellers"
          tag="NAAMI // DEMAND CLASSICS"
          products={bestsellers}
          gatewayLabel="Discover Bestsellers"
        />
      </div>

      {/* ── Coin Pocket Pull-Drag Reveal ── */}
      <div className="reveal-fade-up">
        <CoinPocketReveal content={coinPocketContent} />
      </div>

      {/* ── Stitch Separator ── */}
      <div className="w-full h-8 flex items-center justify-center overflow-hidden" style={{ backgroundColor: "#F4F0E6" }}>
        <svg width="100%" height="8" className="w-full opacity-50">
          <line x1="0" y1="4" x2="100%" y2="4" stroke="#8B1A1A" strokeWidth="1.2" className="reveal-stitch-line" />
        </svg>
      </div>

      {/* ── Asymmetric Manifesto Split ─────────────────────────── */}
      <section
        className="px-6 md:px-12 py-16 grid grid-cols-1 md:grid-cols-12 gap-12 md:gap-8 items-center reveal-stagger-container"
        style={{ backgroundColor: "#F4F0E6" }}
      >
        {/* Left: Editorial lookbook block */}
        <div className="md:col-span-6 reveal-stagger-item">
          <div
            className="relative overflow-hidden hw-accelerate border border-black/5"
            style={{
              aspectRatio: "3/4",
              backgroundColor: "#EDE8DC",
            }}
            data-cursor-text="EXPLORE"
          >
            <Image
              src={manifesto.image}
              alt="NAAMI // Campaign Lookbook"
              fill
              className="object-cover"
              style={{ filter: "brightness(0.92)" }}
              sizes="(max-width: 768px) 100vw, 50vw"
            />
            {/* Denim texture overlay */}
            <div
              className="absolute inset-0 opacity-[0.05] mix-blend-overlay"
              style={{
                backgroundImage: `repeating-linear-gradient(
                  0deg,
                  transparent,
                  transparent 2px,
                  rgba(17,17,17,0.3) 2px,
                  rgba(17,17,17,0.3) 3px
                ), repeating-linear-gradient(
                  90deg,
                  transparent,
                  transparent 4px,
                  rgba(17,17,17,0.15) 4px,
                  rgba(17,17,17,0.15) 5px
                )`,
              }}
            />
            {/* No gradient overlay */}
            {/* Card label */}
            <div
              className="absolute bottom-6 left-6 font-sans font-bold uppercase tracking-[0.25em]"
              style={{ fontSize: "9px", color: "#111111", opacity: 0.7 }}
            >
              NAAMI // COLLECTION
            </div>
            {/* Crimson corner rivet accent */}
            <div
              className="absolute top-5 left-5 rounded-full"
              style={{
                width: 8,
                height: 8,
                backgroundColor: "#8B1A1A",
                boxShadow: "0 0 8px rgba(139,26,26,0.4)",
              }}
            />
            {/* Selvedge red edge line */}
            <div
              className="absolute top-0 left-0 bottom-0"
              style={{ width: "3px", backgroundColor: "#8B1A1A", opacity: 0.75 }}
            />
          </div>
        </div>

        {/* Right: Brand manifesto quote */}
        <div
          className="md:col-span-5 md:col-start-8 reveal-stagger-item"
        >
          <div
            className="font-sans font-bold uppercase tracking-[0.25em] mb-6"
            style={{ fontSize: "9px", color: "#8B1A1A" }}
          >
            {manifesto.kicker}
          </div>
          <p
            className="font-serif font-light italic leading-relaxed mb-8"
            style={{
              fontSize: "clamp(1.35rem, 2.5vw, 2rem)",
              color: "rgba(17,17,17,0.88)",
              lineHeight: 1.55,
            }}
          >
            &ldquo;{manifesto.quote}&rdquo;
          </p>
          <div
            className="font-sans font-bold uppercase tracking-[0.2em]"
            style={{ fontSize: "9px", color: "rgba(17,17,17,0.45)" }}
          >
            {manifesto.attribution}
          </div>

          {/* Selvedge rule */}
          <div
            className="mt-10"
            style={{
              height: "1px",
              background: `linear-gradient(to right, #8B1A1A 2px, rgba(17,17,17,0.1) 2px, transparent)`,
            }}
          />
        </div>
      </section>

      {/* ── Evanlite-inspired Footer ─────────────────────────────── */}
      <EvanliteFooter />
    </main>
  );
}
