"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { createPortal } from "react-dom";
import gsap from "gsap";
import Image from "next/image";
import { useCartStore } from "@/models/cartStore";
import NaamiGatewayButton from "./NaamiGatewayButton";

export interface CarouselProduct {
  id: number;
  number: string;
  name: string;
  subtitle: string;
  price: string;
  material: string;
  fit: string;
  origin: string;
  image: string;
}

interface ProductCarouselProps {
  title: string;
  tag: string;
  products: CarouselProduct[];
  gatewayLabel?: string;
}

interface ExpandedState {
  productId: number | null;
  originRect: DOMRect | null;
}

export default function ProductCarousel({ title, tag, products, gatewayLabel }: ProductCarouselProps) {
  const incrementItems = useCartStore((state) => state.incrementItems);
  const trackRef = useRef<HTMLDivElement>(null);
  const autoScrollRaf = useRef<number | null>(null);
  const isHovered = useRef(false);
  const isScrollingRef = useRef(false);
  const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const [expanded, setExpanded] = useState<ExpandedState>({
    productId: null,
    originRect: null,
  });
  const [isAnimating, setIsAnimating] = useState(false);
  const [isDesktop, setIsDesktop] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const overlayRef = useRef<HTMLDivElement>(null);
  const bookContainerRef = useRef<HTMLDivElement>(null);
  const coverRef = useRef<HTMLDivElement>(null);

  // Keep track of desktop mode responsively
  useEffect(() => {
    setIsDesktop(window.innerWidth >= 768);
    const handleResize = () => setIsDesktop(window.innerWidth >= 768);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Coordinate calculator for 3D Book Animation
  const getLayoutCoords = useCallback((rect: DOMRect) => {
    const desktop = window.innerWidth >= 768;
    
    // Closed position
    const closed = {
      left: desktop ? rect.left - rect.width : rect.left,
      top: rect.top,
      width: desktop ? rect.width * 2 : rect.width,
      height: rect.height,
    };

    // Open position (centered in screen)
    let openWidth = 0;
    let openHeight = 0;
    let openLeft = 0;
    let openTop = 0;

    if (desktop) {
      const pageW = Math.min(window.innerWidth * 0.42, 460);
      const pageH = Math.min(window.innerHeight * 0.8, 620);
      openWidth = pageW * 2;
      openHeight = pageH;
      openLeft = (window.innerWidth - openWidth) / 2;
      openTop = (window.innerHeight - openHeight) / 2;
    } else {
      openWidth = window.innerWidth * 0.9;
      openHeight = window.innerHeight * 0.82;
      openLeft = window.innerWidth * 0.05;
      openTop = window.innerHeight * 0.09;
    }

    const open = {
      left: openLeft,
      top: openTop,
      width: openWidth,
      height: openHeight,
    };

    return { closed, open, desktop };
  }, []);

  // Expand product / Open booklet
  const openProduct = useCallback((product: CarouselProduct, rect: DOMRect) => {
    if (isAnimating) return;
    setExpanded({ productId: product.id, originRect: rect });
  }, [isAnimating]);

  // Close booklet
  const closeProduct = useCallback(() => {
    if (expanded.productId === null || !expanded.originRect || isAnimating) return;

    setIsAnimating(true);
    const rect = expanded.originRect;
    const { closed } = getLayoutCoords(rect);

    const tl = gsap.timeline({
      onComplete: () => {
        // Re-enable background scroll
        document.body.style.overflow = "";

        setExpanded({ productId: null, originRect: null });
        setIsAnimating(false);
        if (overlayRef.current) {
          gsap.set(overlayRef.current, { display: "none" });
        }
      },
    });

    // Fade out backdrop blur overlay
    tl.to(overlayRef.current, {
      opacity: 0,
      duration: 0.45,
      ease: "power2.in",
    }, 0);

    // Fold the cover Y axis back to 0deg (closed)
    tl.to(coverRef.current, {
      rotateY: 0,
      duration: 0.8,
      ease: "power2.inOut",
    }, 0);

    // Shrink book container back to product card size & position
    tl.to(bookContainerRef.current, {
      left: closed.left,
      top: closed.top,
      width: closed.width,
      height: closed.height,
      duration: 0.8,
      ease: "power2.inOut",
    }, 0);
  }, [expanded.productId, expanded.originRect, isAnimating, getLayoutCoords]);

  // Handle Booklet Entrance Animation (Triggered when expanded state changes)
  useEffect(() => {
    if (expanded.productId === null || !expanded.originRect) return;

    setIsAnimating(true);
    const rect = expanded.originRect;
    const { closed, open } = getLayoutCoords(rect);

    // Disable background scroll when booklet is open
    document.body.style.overflow = "hidden";

    // Prepare overlay and components
    if (overlayRef.current) {
      gsap.set(overlayRef.current, { display: "block", opacity: 0 });
    }

    if (bookContainerRef.current) {
      gsap.set(bookContainerRef.current, {
        left: closed.left,
        top: closed.top,
        width: closed.width,
        height: closed.height,
        transform: "rotateY(0deg)",
      });
    }

    if (coverRef.current) {
      gsap.set(coverRef.current, {
        rotateY: 0,
      });
    }

    const tl = gsap.timeline({
      onComplete: () => {
        setIsAnimating(false);
      },
    });

    // 1. Fade in the backdrop overlay
    tl.to(overlayRef.current, {
      opacity: 1,
      duration: 0.4,
      ease: "power2.out",
    }, 0);

    // 2. Animate cover flip open to -180deg
    tl.to(coverRef.current, {
      rotateY: -180,
      duration: 0.9,
      ease: "power2.inOut",
    }, 0);

    // 3. Move/Scale booklet container to center screen
    tl.to(bookContainerRef.current, {
      left: open.left,
      top: open.top,
      width: open.width,
      height: open.height,
      duration: 0.9,
      ease: "power2.inOut",
    }, 0);

  }, [expanded.productId, expanded.originRect, getLayoutCoords]);

  // Cleanup body scroll override on unmount
  useEffect(() => {
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  // Auto-scroll: run only while the carousel is visible in the viewport.
  // IntersectionObserver pauses the RAF loop when scrolled past, saving CPU
  // for two always-mounted carousels on the home page.
  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;

    let lastTime = performance.now();
    const speed = 0.07;
    let visible = false;

    const loop = (time: number) => {
      const delta = time - lastTime;
      lastTime = time;

      if (visible && !isHovered.current && !isScrollingRef.current) {
        track.scrollLeft += speed * (delta || 16);
        const halfWidth = track.scrollWidth / 2;
        if (track.scrollLeft >= halfWidth) {
          track.scrollLeft -= halfWidth;
        }
      }

      autoScrollRaf.current = requestAnimationFrame(loop);
    };

    const obs = new IntersectionObserver(
      ([entry]) => { visible = entry.isIntersecting; },
      { threshold: 0 }
    );
    obs.observe(track);

    autoScrollRaf.current = requestAnimationFrame(loop);

    return () => {
      obs.disconnect();
      if (autoScrollRaf.current) cancelAnimationFrame(autoScrollRaf.current);
    };
  }, []);

  const handleMouseEnter = () => {
    isHovered.current = true;
  };

  const handleMouseLeave = () => {
    isHovered.current = false;
  };

  // Navigating left / right on click
  const handleNavClick = (direction: "prev" | "next") => {
    const track = trackRef.current;
    if (!track) return;

    // Pause auto-scrolling temporarily
    isScrollingRef.current = true;
    if (scrollTimeoutRef.current) clearTimeout(scrollTimeoutRef.current);
    scrollTimeoutRef.current = setTimeout(() => {
      isScrollingRef.current = false;
    }, 1000); // Resume auto-scrolling after 1 second

    // Kill any active tweens on the track to avoid conflict
    gsap.killTweensOf(track);

    const scrollAmount = 320; // width of a card plus gap
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

  // Duplicate items for infinite seamless scroll
  const displayProducts = [...products, ...products];

  const expandedProduct = products.find((p) => p.id === expanded.productId);

  return (
    <>
      {/* Product Detail Overlay Modal */}
      {/* Product Detail Booklet Overlay */}
      {mounted && createPortal(
        <div
          ref={overlayRef}
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            width: "100vw",
            height: "100vh",
            zIndex: 100000,
            backgroundColor: "rgba(17, 17, 17, 0.15)",
            backdropFilter: "blur(5px)",
            display: "none",
            opacity: 0,
            pointerEvents: "auto",
          }}
          onClick={closeProduct}
        >
        {expandedProduct && (
          <div
            ref={bookContainerRef}
            className="absolute shadow-[0_30px_70px_rgba(17,17,17,0.25)] select-none"
            style={{
              backgroundColor: "#F4F0E6",
              transformStyle: "preserve-3d",
              perspective: "2000px",
              pointerEvents: "auto",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* 3D BOOK COVER LEAF (Flipping Page) */}
            <div
              ref={coverRef}
              className="absolute top-0 h-full"
              style={{
                left: isDesktop ? "50%" : "0%",
                width: isDesktop ? "50%" : "100%",
                transformOrigin: "left center",
                transformStyle: "preserve-3d",
                zIndex: 30,
              }}
            >
              {/* FRONT FACE (Card Cover showing product photo) */}
              <div
                className="absolute inset-0 overflow-hidden border border-black/5"
                style={{
                  backfaceVisibility: "hidden",
                  backgroundColor: "#EDE8DC",
                  transform: "rotateY(0deg)",
                }}
              >
                <Image
                  src={expandedProduct.image}
                  alt={expandedProduct.name}
                  fill
                  className="object-cover pointer-events-none"
                  style={{ filter: "brightness(0.94)" }}
                />
                {/* No gradient overlay */}
                <div
                  className="absolute top-4 right-4"
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: "50%",
                    backgroundColor: "#8B1A1A",
                    boxShadow: "0 0 6px rgba(139,26,26,0.5)",
                  }}
                />
                <div
                  className="absolute top-0 left-0 bottom-0"
                  style={{
                    width: "2.5px",
                    backgroundColor: "#8B1A1A",
                    opacity: 0.75,
                  }}
                />
              </div>

              {/* BACK FACE */}
              <div
                className="absolute inset-0 overflow-y-auto scrollbar-none"
                style={{
                  backfaceVisibility: "hidden",
                  backgroundColor: "#F4F0E6",
                  transform: "rotateY(180deg)",
                  borderRight: isDesktop ? "1px solid rgba(17,17,17,0.08)" : "none",
                }}
              >
                {isDesktop ? (
                  <div className="relative w-full h-full overflow-hidden">
                    <Image
                      src={expandedProduct.image}
                      alt={expandedProduct.name}
                      fill
                      className="object-cover pointer-events-none"
                      style={{ filter: "brightness(0.95)" }}
                    />
                    <div
                      className="absolute top-0 right-0 bottom-0 w-px pointer-events-none"
                      style={{
                        backgroundColor: "rgba(17, 17, 17, 0.08)",
                      }}
                    />
                  </div>
                ) : (
                  <ProductDetailContent product={expandedProduct} onClose={closeProduct} incrementItems={incrementItems} isMobile />
                )}
              </div>
            </div>

            {/* STATIC RIGHT PAGE (Desktop only) */}
            {isDesktop && (
              <div
                className="absolute top-0 right-0 h-full overflow-y-auto scrollbar-none"
                style={{
                  left: "50%",
                  width: "50%",
                  backgroundColor: "#F4F0E6",
                  zIndex: 10,
                }}
              >
                <div
                  className="absolute top-0 left-0 bottom-0 w-px pointer-events-none z-20"
                  style={{
                    backgroundColor: "rgba(17, 17, 17, 0.08)",
                  }}
                />
                <ProductDetailContent product={expandedProduct} onClose={closeProduct} incrementItems={incrementItems} />
              </div>
            )}

            {/* BOOK CENTER SPINE DETAILS (Desktop only) */}
            {isDesktop && (
              <>
                <div
                  className="absolute top-0 bottom-0 pointer-events-none z-40"
                  style={{
                    left: "calc(50% - 1.5px)",
                    width: "3px",
                    backgroundColor: "rgba(0,0,0,0.04)",
                  }}
                />
                <div
                  className="absolute top-0 bottom-0 z-40"
                  style={{
                    left: "calc(50% - 0.5px)",
                    width: "1px",
                    backgroundColor: "#8B1A1A",
                    opacity: 0.3,
                  }}
                />
              </>
            )}
          </div>
        )}
      </div>,
      document.body
      )}

      {/* Carousel Section Container */}
       <section
        className="pt-12 pb-4 relative overflow-hidden"
        style={{ backgroundColor: "#F4F0E6" }}
      >
        <div className="px-6 md:px-12 mb-4 flex flex-col md:flex-row md:items-end justify-between">
          <div>
            <span
              className="font-sans font-bold uppercase tracking-[0.3em] mb-2 block"
              style={{ fontSize: "9px", color: "#8B1A1A" }}
            >
              {tag}
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
              {title}
            </h2>
          </div>
        </div>

        {/* Carousel Outer Wrapper containing track and hover overlay zones */}
        <div
          className="relative w-full group"
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
        >
          {/* ODD RITUAL GOLF Hover Zones for Custom Cursor Navigation */}
          <div
            className="absolute left-0 top-0 bottom-0 w-1/2 z-20 cursor-pointer"
            data-cursor-text="PREV"
            onClick={() => handleNavClick("prev")}
          />
          <div
            className="absolute right-0 top-0 bottom-0 w-1/2 z-20 cursor-pointer"
            data-cursor-text="NEXT"
            onClick={() => handleNavClick("next")}
          />

          {/* Scrolling Horizontal Track */}
          <div
            ref={trackRef}
            className="flex gap-6 md:gap-8 overflow-x-auto whitespace-nowrap scrollbar-none px-6 md:px-12 pb-6"
            style={{
              scrollBehavior: "auto",
              WebkitOverflowScrolling: "touch",
            }}
          >
            {displayProducts.map((product, idx) => (
              <ProductCard
                key={`${product.id}-${idx}`}
                product={product}
                onOpenProduct={openProduct}
              />
            ))}
          </div>
        </div>

        {gatewayLabel && (
          <div className="flex justify-center mt-2 pb-4">
            <NaamiGatewayButton label={gatewayLabel} />
          </div>
        )}
      </section>
    </>
  );
}

// Inner Product Card Component
interface ProductCardProps {
  product: CarouselProduct;
  onOpenProduct: (product: CarouselProduct, rect: DOMRect) => void;
}

function ProductCard({ product, onOpenProduct }: ProductCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLDivElement>(null);

  const handleClick = (e: React.MouseEvent) => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    onOpenProduct(product, rect);
  };

  const handleMouseEnter = () => {
    if (imageRef.current) {
      gsap.to(imageRef.current, {
        scale: 1.05,
        duration: 0.6,
        ease: "power2.out",
      });
    }
  };

  const handleMouseLeave = () => {
    if (imageRef.current) {
      gsap.to(imageRef.current, {
        scale: 1,
        duration: 0.5,
        ease: "power2.out",
      });
    }
  };

  return (
    <div
      onClick={handleClick}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      className="inline-block relative w-[280px] md:w-[320px] flex-shrink-0 cursor-pointer select-none z-30"
      data-cursor-text="VIEW"
    >
      {/* Symmetrical number tag */}
      <div className="flex items-center gap-3 mb-4">
        <span
          className="font-sans font-bold"
          style={{ fontSize: "9px", color: "#8B1A1A", letterSpacing: "0.25em" }}
        >
          {product.number}
        </span>
        <div
          style={{
            height: "1px",
            flex: 1,
            background: "linear-gradient(to right, rgba(139,26,26,0.3), transparent)",
          }}
        />
      </div>

      {/* Image container */}
      <div
        ref={cardRef}
        className="relative overflow-hidden w-full border border-black/5"
        style={{
          aspectRatio: "3/4",
          backgroundColor: "#EDE8DC",
        }}
      >
        <div ref={imageRef} className="absolute inset-0 w-full h-full">
          <Image
            src={product.image}
            alt={product.name}
            fill
            className="object-cover pointer-events-none"
            style={{ filter: "brightness(0.94)" }}
            sizes="(max-width: 768px) 280px, 320px"
          />
        </div>

        {/* No gradient overlay */}

        {/* Solid Crimson corner rivet accent */}
        <div
          className="absolute top-4 right-4"
          style={{
            width: 8,
            height: 8,
            borderRadius: "50%",
            backgroundColor: "#8B1A1A",
            boxShadow: "0 0 6px rgba(139,26,26,0.5)",
          }}
        />

        {/* Red edge selvedge line */}
        <div
          className="absolute top-0 left-0 bottom-0"
          style={{
            width: "2.5px",
            backgroundColor: "#8B1A1A",
            opacity: 0.75,
          }}
        />
      </div>

      {/* Product metadata */}
      <div className="mt-5 text-left">
        <h3
          className="font-serif font-light uppercase mb-1 truncate text-wrap"
          style={{
            fontSize: "1.2rem",
            color: "#111111",
            lineHeight: 1.1,
            letterSpacing: "0.03em",
          }}
        >
          {product.name}
        </h3>
        <div className="flex items-center justify-between mt-2">
          <span
            className="font-sans truncate max-w-[70%]"
            style={{ fontSize: "11px", color: "#111111", opacity: 0.5 }}
          >
            {product.subtitle}
          </span>
          <span
            className="font-serif font-medium"
            style={{ fontSize: "1.05rem", color: "#111111" }}
          >
            {product.price}
          </span>
        </div>
        {/* Underline decorative */}
        <div
          style={{
            height: "1px",
            marginTop: "12px",
            background: `linear-gradient(to right, #8B1A1A, transparent)`,
            opacity: 0.45,
          }}
        />
      </div>
    </div>
  );
}

function ProductDetailContent({
  product,
  onClose,
  incrementItems,
  isMobile,
}: {
  product: CarouselProduct;
  onClose: () => void;
  incrementItems: () => void;
  isMobile?: boolean;
}) {
  return (
    <div
      className={`relative w-full h-full flex flex-col justify-between ${
        isMobile ? "px-6 py-10" : "px-12 py-12 md:px-16 md:py-14"
      }`}
      style={{ backgroundColor: "#F4F0E6", minHeight: "100%" }}
    >
      <div>
        {/* Header Metadata */}
        <div className="flex justify-between items-center mb-6">
          <span
            className="font-sans font-bold uppercase tracking-[0.3em]"
            style={{ fontSize: "9px", color: "#8B1A1A" }}
          >
            {product.number} // NAAMI // AW26
          </span>
        </div>

        {/* Title */}
        <h2
          className="font-serif font-light uppercase mb-2"
          style={{
            fontSize: isMobile ? "1.85rem" : "clamp(2rem, 3.5vw, 3rem)",
            color: "#111111",
            lineHeight: 1.1,
            letterSpacing: "0.02em",
          }}
        >
          {product.name}
        </h2>

        {/* Subtitle */}
        <p
          className="font-sans font-bold uppercase tracking-[0.2em] mb-6 md:mb-8"
          style={{ fontSize: "10px", color: "#111111", opacity: 0.4 }}
        >
          {product.subtitle}
        </p>

        {/* Specifications */}
        <div
          className="mb-8"
          style={{
            borderTop: "1px solid rgba(139, 26, 26, 0.15)",
            paddingTop: "20px",
          }}
        >
          {[
            ["Fabric & Weave", product.material],
            ["Collar & Silhouette", product.fit],
            ["Origin Atelier", product.origin],
          ].map(([label, value]) => (
            <div
              key={label}
              className="flex justify-between mb-3"
              style={{ borderBottom: "1px solid rgba(139, 26, 26, 0.05)", paddingBottom: "10px" }}
            >
              <span
                className="font-sans font-bold uppercase tracking-[0.15em]"
                style={{ fontSize: "9px", color: "#111111", opacity: 0.35 }}
              >
                {label}
              </span>
              <span
                className="font-sans text-right text-wrap"
                style={{ fontSize: "11px", color: "#111111", opacity: 0.8, maxWidth: "60%" }}
              >
                {value}
              </span>
            </div>
          ))}
        </div>
      </div>

      <div>
        {/* Price & Checkout */}
        <div className="flex items-end justify-between mb-6">
          <span
            className="font-serif font-light"
            style={{ fontSize: isMobile ? "2rem" : "2.25rem", color: "#111111" }}
          >
            {product.price}
          </span>
          <span
            className="font-sans"
            style={{ fontSize: "10px", color: "#111111", opacity: 0.3 }}
          >
            INR
          </span>
        </div>

        {/* Add button */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            incrementItems();
            onClose();
          }}
          className="w-full flex items-center justify-between font-sans font-bold uppercase tracking-[0.2em] transition-opacity hover:opacity-90 cursor-pointer"
          style={{
            fontSize: "10px",
            color: "#F4F0E6",
            backgroundColor: "#8B1A1A",
            padding: "16px 24px",
          }}
          data-cursor-text="ADD"
        >
          ADD TO WARDROBE
          <svg
            width="12"
            height="12"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2.5}
          >
            <path d="M5 12h14M12 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>

        {/* View Full Details link */}
        <div className="flex justify-center mt-5">
          <a
            href={`/product/${product.id}`}
            target="_blank"
            rel="noopener noreferrer"
            className="font-sans font-bold uppercase tracking-[0.15em] hover:opacity-50 transition-opacity cursor-pointer text-center"
            style={{
              fontSize: "9px",
              color: "#8B1A1A",
              borderBottom: "1px solid rgba(139, 26, 26, 0.4)",
              paddingBottom: "2px",
            }}
            data-cursor-text="OPEN"
          >
            View Full Details ↗
          </a>
        </div>
      </div>

      {/* Close button inside page */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          onClose();
        }}
        className="absolute top-6 right-6 font-sans font-bold uppercase tracking-[0.2em] opacity-40 hover:opacity-100 transition-opacity cursor-pointer z-50"
        style={{ fontSize: "8px", color: "#111111" }}
        data-cursor-text="CLOSE"
      >
        ✕ CLOSE
      </button>
    </div>
  );
}
