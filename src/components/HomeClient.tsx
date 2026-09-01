"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { gsap } from "@/lib/gsap";
import HotspotBanner from "@/components/HotspotBanner";
import ProductCarousel from "@/components/ProductCarousel";
import EvanliteFooter from "@/components/EvanliteFooter";
import CollectionsShowcase from "@/components/CollectionsShowcase";
import BrandLoader from "@/components/BrandLoader";
import HeroSwipeHint from "@/components/HeroSwipeHint";
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
import SharedMomentsCarousel from "@/components/SharedMomentsCarousel";
import { useCartStore } from "@/models/cartStore";
import { sectionBackgroundStyle, type SectionBackgroundFit } from "@/lib/sectionBackground";
import { TITLE_CLASS, titleStyle } from "@/lib/typography";
import { useDesignSettings } from "@/lib/useDesignSettings";

type CarouselProduct = {
  id: number;
  number: string;
  name: string;
  subtitle: string;
  price: string;
  priceInr: number;
  compareAtPriceInr?: number | null;
  metafields: { name: string; description: string }[];
  image: string;
  thumbnailImage?: string;
  sizes?: { size: string; stock: number }[];
  available?: boolean;
};

type HomepageCollection = {
  id: number;
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

type HotspotData = { id: number; topPct: number; leftPct: number; linkUrl: string | null; product: ResolvedProduct | null };

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

type CollectionsHeader = {
  kicker: string;
  title: string;
  titleAccent: string;
  sideNote: string;
};

type ProductCarouselSection = {
  tag: string;
  title: string;
  gatewayLabel: string;
};

type ShopLookHeader = {
  kicker: string;
  title: string;
};

type SharedMoments = {
  enabled: boolean;
  kicker: string;
  title: string;
  items: { id: string; caption: string; videoUrl: string; thumbnailImage: string }[];
};

type SectionBackground = { image?: string; fit?: SectionBackgroundFit };

type SectionBackgrounds = {
  hero?: SectionBackground;
  collections?: SectionBackground;
  loom?: SectionBackground;
  newArrivals?: SectionBackground;
  lookbookBanner?: SectionBackground;
  hotspotCards?: SectionBackground;
  bestsellers?: SectionBackground;
  coinPocket?: SectionBackground;
  sharedMoments?: SectionBackground;
  manifesto?: SectionBackground;
};

type SectionsEnabled = Record<
  | "collections"
  | "loom"
  | "newArrivals"
  | "lookbookBanner"
  | "hotspotCards"
  | "bestsellers"
  | "coinPocket"
  | "manifesto",
  boolean
>;

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
  collectionsHeader: CollectionsHeader;
  newArrivalsSection: ProductCarouselSection;
  bestsellersSection: ProductCarouselSection;
  shopLookHeader: ShopLookHeader;
  sharedMoments: SharedMoments;
  sectionBackgrounds: SectionBackgrounds;
  sectionsEnabled: SectionsEnabled;
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
  collectionsHeader,
  newArrivalsSection,
  bestsellersSection,
  shopLookHeader,
  sharedMoments,
  sectionBackgrounds,
  sectionsEnabled,
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
  const cms = useDesignSettings();

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
          delay: 0.3,
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
      style={{ backgroundColor: "#FFF9EF", color: "#1A1212" }}
    >
      {/* Cinematic unzipping loader */}
      <BrandLoader />

      {/* ── Hero Section ───────────────────────────────────────── */}
      <section
        className="pt-20 pb-6 md:pt-24 md:pb-10 px-0 md:px-12"
        style={{ backgroundColor: "#FFF9EF", ...sectionBackgroundStyle(sectionBackgrounds.hero?.image, sectionBackgrounds.hero?.fit) }}
      >
        <div
          ref={heroTitleRef}
          className="relative w-full h-[65vh] md:h-[75vh] overflow-hidden border border-black/5"
          style={{ opacity: 0 }}
        >
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

          {/* Mobile-only "tap sides to explore" affordance */}
          <HeroSwipeHint />

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
              style={{ fontSize: "9px", color: "#FFF9EF", opacity: 0.7 }}
            >
              {heroSlides[currentSlide].tag}
            </span>
            <h2 className={`${TITLE_CLASS} mb-3`} style={titleStyle("clamp(2.5rem, 6vw, 5.5rem)", "#FFF9EF")}>
              {heroSlides[currentSlide].title}
            </h2>
            <p
              className="font-sans font-bold uppercase tracking-[0.2em]"
              style={{ fontSize: "10px", color: "#5B1C1C" }}
            >
              {heroSlides[currentSlide].subtitle}
            </p>
          </div>
        </div>

        {/* ── Slide Counter & Progress Bar ────────────────────────── */}
        <div
          ref={heroSubRef}
          className="flex flex-col gap-2 mt-4 w-full px-4 md:px-0"
          style={{ opacity: 0 }}
        >
          <div className="flex items-center justify-between font-sans font-bold uppercase tracking-[0.2em]" style={{ fontSize: "9px", color: "#1A1212" }}>
            <span>0{currentSlide + 1}</span>
            <span style={{ opacity: 0.35 }}>/ 0{heroSlides.length}</span>
          </div>
          {/* Progress bar track */}
          <div className="w-full h-[1.5px] bg-[#1A1212]/10 relative overflow-hidden">
            <div
              className="absolute left-0 top-0 h-full bg-[#5B1C1C] transition-all duration-700 ease-out"
              style={{
                width: `${((currentSlide + 1) / heroSlides.length) * 100}%`,
              }}
            />
          </div>
        </div>
      </section>

      {/* ── Collections Showcase ─────────────────────────────────── */}
      {sectionsEnabled.collections && (
        <CollectionsShowcase
          collections={homepageCollections}
          kicker={collectionsHeader.kicker}
          title={collectionsHeader.title}
          titleAccent={collectionsHeader.titleAccent}
          sideNote={collectionsHeader.sideNote}
          backgroundImage={sectionBackgrounds.collections?.image}
          backgroundImageFit={sectionBackgrounds.collections?.fit}
        />
      )}

      {/* ── Scroll-Pinned Loom Horizontal Timeline ── */}
      {sectionsEnabled.loom && (
        <LoomTimeline
          content={loomContent}
          backgroundImage={sectionBackgrounds.loom?.image}
          backgroundImageFit={sectionBackgrounds.loom?.fit}
        />
      )}

      {/* ── New Arrivals Section ────────────────────────────────── */}
      {sectionsEnabled.newArrivals && (
        <div className="reveal-fade-up">
          <ProductCarousel
            title={newArrivalsSection.title}
            tag={newArrivalsSection.tag}
            products={newArrivals}
            gatewayLabel={newArrivalsSection.gatewayLabel}
            backgroundImage={sectionBackgrounds.newArrivals?.image}
            backgroundImageFit={sectionBackgrounds.newArrivals?.fit}
          />
        </div>
      )}

      {/* ── Hotspot Banner ─────────────────────────────────────── */}
      {sectionsEnabled.lookbookBanner && (
        <div className="reveal-fade-up">
          <HotspotBanner
            image={lookbookBanner.image}
            label={lookbookBanner.label}
            hotspots={lookbookBanner.hotspots}
            backgroundImage={sectionBackgrounds.lookbookBanner?.image}
            backgroundImageFit={sectionBackgrounds.lookbookBanner?.fit}
          />
        </div>
      )}

      {/* ── Hotspot Cards Section ──────────────────────────────── */}
      {sectionsEnabled.hotspotCards && (
        <HotspotCards
          lookCards={lookCards}
          kicker={shopLookHeader.kicker}
          title={shopLookHeader.title}
          backgroundImage={sectionBackgrounds.hotspotCards?.image}
          backgroundImageFit={sectionBackgrounds.hotspotCards?.fit}
        />
      )}

      {/* ── Bestsellers Section ─────────────────────────────────── */}
      {sectionsEnabled.bestsellers && (
        <div className="reveal-fade-up">
          <ProductCarousel
            title={bestsellersSection.title}
            tag={bestsellersSection.tag}
            products={bestsellers}
            gatewayLabel={bestsellersSection.gatewayLabel}
            backgroundImage={sectionBackgrounds.bestsellers?.image}
            backgroundImageFit={sectionBackgrounds.bestsellers?.fit}
          />
        </div>
      )}

      {/* ── Coin Pocket Pull-Drag Reveal ── */}
      {sectionsEnabled.coinPocket && (
        <div className="reveal-fade-up">
          <CoinPocketReveal
            content={coinPocketContent}
            backgroundImage={sectionBackgrounds.coinPocket?.image}
            backgroundImageFit={sectionBackgrounds.coinPocket?.fit}
          />
        </div>
      )}

      {/* ── Shared Moments (admin-uploaded video clips) ──────────── */}
      {sharedMoments.enabled && (
        <SharedMomentsCarousel
          kicker={sharedMoments.kicker}
          title={sharedMoments.title}
          items={sharedMoments.items}
          backgroundImage={sectionBackgrounds.sharedMoments?.image}
          backgroundImageFit={sectionBackgrounds.sharedMoments?.fit}
        />
      )}

      {/* ── Asymmetric Manifesto Split ─────────────────────────── */}
      {sectionsEnabled.manifesto && (
      <section
        className="px-0 md:px-12 py-10 md:py-14 grid grid-cols-1 md:grid-cols-12 gap-12 md:gap-8 items-center reveal-stagger-container"
        style={{ backgroundColor: "#FFF9EF", ...sectionBackgroundStyle(sectionBackgrounds.manifesto?.image, sectionBackgrounds.manifesto?.fit) }}
      >
        {/* Left: Editorial lookbook block */}
        <div className="md:col-span-6 reveal-stagger-item">
          <div
            className="relative overflow-hidden hw-accelerate border-y border-x-0 md:border-x border-black/5"
            style={{
              aspectRatio: "3/4",
              backgroundColor: "#F8F1E5",
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
              style={{ fontSize: "9px", color: "#1A1212", opacity: 0.7 }}
            >
              {cms.manifesto_card_label}
            </div>
            {/* Crimson corner rivet accent */}
            <div
              className="absolute top-5 left-5 rounded-full"
              style={{
                width: 8,
                height: 8,
                backgroundColor: "#5B1C1C",
                boxShadow: "0 0 8px rgba(139,26,26,0.4)",
              }}
            />
            {/* Selvedge red edge line */}
            <div
              className="absolute top-0 left-0 bottom-0"
              style={{ width: "3px", backgroundColor: "#5B1C1C", opacity: 0.75 }}
            />
          </div>
        </div>

        {/* Right: Brand manifesto quote */}
        <div
          className="px-4 md:px-0 md:col-span-5 md:col-start-8 reveal-stagger-item"
        >
          <div
            className="font-sans font-bold uppercase tracking-[0.25em] mb-6"
            style={{ fontSize: "9px", color: "#5B1C1C" }}
          >
            {manifesto.kicker}
          </div>
          <p
            className="font-serif font-light leading-relaxed mb-8"
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
              background: `linear-gradient(to right, #5B1C1C 2px, rgba(17,17,17,0.1) 2px, transparent)`,
            }}
          />
        </div>
      </section>
      )}

      {/* ── Evanlite-inspired Footer ─────────────────────────────── */}
      <EvanliteFooter />
    </main>
  );
}
