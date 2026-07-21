"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useSearchParams } from "next/navigation";
import { CarouselProduct } from "@/models/products";
import EvanliteFooter from "@/components/EvanliteFooter";
import { useCartStore } from "@/models/cartStore";
import { formatINR } from "@/lib/format";

gsap.registerPlugin(ScrollTrigger);

type FilterKey = "ALL" | "SHIRTS" | "ACCESSORIES" | "LIMITED";

const FILTER_KEYWORDS: Record<FilterKey, string[]> = {
  ALL: [],
  SHIRTS: ["shirt", "camp", "overshirt", "kurta", "henley", "poplin", "chambray", "tuxedo", "haori"],
  ACCESSORIES: ["button", "stay", "set"],
  LIMITED: ["sashiko", "haori", "kurta", "gurkha"],
};

function isFilterKey(value: string | null): value is FilterKey {
  return value === "ALL" || value === "SHIRTS" || value === "ACCESSORIES" || value === "LIMITED";
}

function getDiscount(product: CarouselProduct) {
  if (!product.compareAtPriceInr || product.compareAtPriceInr <= product.priceInr) return null;
  const percentOff = Math.round(
    ((product.compareAtPriceInr - product.priceInr) / product.compareAtPriceInr) * 100
  );
  return { compareAtPrice: formatINR(product.compareAtPriceInr), percentOff };
}

function matchesFilter(product: CarouselProduct, filter: FilterKey): boolean {
  if (filter === "ALL") return true;
  const keywords = FILTER_KEYWORDS[filter];
  const searchText = (product.name + " " + product.subtitle).toLowerCase();
  return keywords.some((kw) => searchText.includes(kw));
}

type CollectionInfo = {
  id: number;
  name: string;
  tag: string;
  description: string;
  productIds: number[];
};

export default function CollectionPageContent() {
  const searchParams = useSearchParams();
  const filterParam = searchParams.get("filter");
  const collectionParam = searchParams.get("collection");

  const [activeFilter, setActiveFilter] = useState<FilterKey>(
    isFilterKey(filterParam) ? filterParam : "ALL"
  );
  const [allProducts, setAllProducts] = useState<CarouselProduct[]>([]);
  const [collectionInfo, setCollectionInfo] = useState<CollectionInfo | null>(null);
  const [expandedProduct, setExpandedProduct] = useState<CarouselProduct | null>(null);
  const gridRef = useRef<HTMLDivElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const cartItemsCount = useCartStore((s) => s.cartItemsCount);
  const incrementItems = useCartStore((s) => s.incrementItems);

  useEffect(() => {
    fetch("/api/products")
      .then((r) => r.json())
      .then((data: CarouselProduct[]) => setAllProducts(data))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!collectionParam) {
      setCollectionInfo(null);
      return;
    }
    fetch(`/api/collections/${collectionParam}`)
      .then((r) => {
        if (!r.ok) throw new Error("Collection not found");
        return r.json();
      })
      .then((data: CollectionInfo) => setCollectionInfo(data))
      .catch(() => setCollectionInfo(null));
  }, [collectionParam]);

  const filtered = allProducts
    .filter((p) => matchesFilter(p, activeFilter))
    .filter((p) => !collectionInfo || collectionInfo.productIds.includes(p.id));

  // Card stagger animations
  useEffect(() => {
    const ctx = gsap.context(() => {
      const cards = gsap.utils.toArray<HTMLElement>(".collection-card");
      cards.forEach((card, i) => {
        gsap.fromTo(
          card,
          { opacity: 0, y: 30 },
          {
            opacity: 1,
            y: 0,
            duration: 0.65,
            ease: "power2.out",
            delay: i * 0.06,
            scrollTrigger: {
              trigger: card,
              start: "top 90%",
              once: true,
            },
          }
        );
      });
    }, gridRef);
    return () => ctx.revert();
  }, [filtered]);

  const openProduct = (product: CarouselProduct) => {
    setExpandedProduct(product);
    if (overlayRef.current) {
      gsap.fromTo(
        overlayRef.current,
        { opacity: 0 },
        { opacity: 1, duration: 0.35, ease: "power2.out" }
      );
    }
    document.body.style.overflow = "hidden";
  };

  const closeProduct = () => {
    if (overlayRef.current) {
      gsap.to(overlayRef.current, {
        opacity: 0,
        duration: 0.25,
        ease: "power2.in",
        onComplete: () => {
          setExpandedProduct(null);
          document.body.style.overflow = "";
        },
      });
    } else {
      setExpandedProduct(null);
      document.body.style.overflow = "";
    }
  };

  return (
    <main className="w-full min-h-screen flex flex-col" style={{ backgroundColor: "#FFF9EF", color: "#1A1212" }}>

      {/* Hero bar */}
      <section className="pb-8 px-8 md:px-12" style={{ borderBottom: "1px solid rgba(17,17,17,0.06)", paddingTop: "calc(var(--site-header-h) + 2rem)" }}>
        <span
          className="font-sans font-bold uppercase tracking-[0.3em] mb-3 block"
          style={{ fontSize: "9px", color: "#5B1C1C" }}
        >
          {collectionInfo ? `NAAMI // ${collectionInfo.tag}` : "NAAMI // AW26"}
        </span>
        <h1
          className="font-serif font-light uppercase"
          style={{
            fontSize: "clamp(2.5rem, 6vw, 5rem)",
            color: "#1A1212",
            lineHeight: 1.0,
            letterSpacing: "0.02em",
          }}
        >
          {collectionInfo ? (
            collectionInfo.name
          ) : (
            <>
              The
              <br />
              <span style={{ color: "#5B1C1C", fontStyle: "italic" }}>Collection</span>
            </>
          )}
        </h1>
      </section>

      {/* Filters */}
      <section className="px-8 md:px-12 py-6 flex items-center gap-6 overflow-x-auto" style={{ borderBottom: "1px solid rgba(17,17,17,0.06)" }}>
        {(["ALL", "SHIRTS", "ACCESSORIES", "LIMITED"] as FilterKey[]).map((f) => (
          <button
            key={f}
            onClick={() => setActiveFilter(f)}
            className="font-sans font-bold uppercase tracking-[0.2em] transition-colors whitespace-nowrap"
            style={{
              fontSize: "9px",
              color: activeFilter === f ? "#5B1C1C" : "rgba(17,17,17,0.35)",
              borderBottom: activeFilter === f ? "1.5px solid #5B1C1C" : "1.5px solid transparent",
              paddingBottom: "4px",
            }}
          >
            {f}
          </button>
        ))}
        <span
          className="ml-auto font-sans"
          style={{ fontSize: "10px", color: "rgba(17,17,17,0.35)", whiteSpace: "nowrap" }}
        >
          {filtered.length} items
        </span>
      </section>

      {/* Product grid */}
      <section ref={gridRef} className="px-8 md:px-12 py-12 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 md:gap-8 flex-1">
        {filtered.map((product) => (
          <div
            key={product.id}
            className="collection-card flex flex-col cursor-pointer group"
            style={{ opacity: 0 }}
            onClick={() => openProduct(product)}
          >
            {/* Image */}
            <div
              className="relative overflow-hidden w-full border border-black/5 bg-[#F8F1E5]"
              style={{ aspectRatio: "3/4" }}
            >
              {/* Selvedge edge */}
              <div className="absolute top-0 left-0 bottom-0 z-10" style={{ width: "3px", backgroundColor: "#5B1C1C", opacity: 0.7 }} />
              <Image
                src={product.thumbnailImage ?? product.image}
                alt={product.name}
                fill
                className="object-cover transition-transform duration-700 group-hover:scale-105"
                sizes="(max-width: 768px) 50vw, 25vw"
                style={{ filter: "brightness(0.94)" }}
              />
              {/* Number badge */}
              <div
                className="absolute bottom-3 left-3 font-sans font-bold uppercase tracking-[0.2em]"
                style={{ fontSize: "8px", color: "#FFF9EF", backgroundColor: "#5B1C1C", padding: "3px 6px", zIndex: 10 }}
              >
                {product.number}
              </div>
            </div>

            {/* Details */}
            <div className="pt-4">
              <h3
                className="font-serif font-light uppercase mb-0.5 group-hover:text-[#5B1C1C] transition-colors"
                style={{ fontSize: "0.95rem", letterSpacing: "0.03em", lineHeight: 1.2 }}
              >
                {product.name}
              </h3>
              <p className="font-sans mb-2" style={{ fontSize: "10px", color: "rgba(17,17,17,0.5)" }}>
                {product.subtitle}
              </p>
              <p className="flex items-baseline gap-1.5">
                <span className="font-sans font-bold" style={{ fontSize: "12px", color: "#1A1212" }}>
                  {product.price}
                </span>
                {getDiscount(product) && (
                  <>
                    <span
                      className="font-sans"
                      style={{ fontSize: "10px", color: "#1A1212", opacity: 0.4, textDecoration: "line-through" }}
                    >
                      {getDiscount(product)!.compareAtPrice}
                    </span>
                    <span className="font-sans font-bold" style={{ fontSize: "9px", color: "#5B1C1C" }}>
                      −{getDiscount(product)!.percentOff}%
                    </span>
                  </>
                )}
              </p>
            </div>
          </div>
        ))}
      </section>

      <EvanliteFooter />

      {/* Expanded product overlay */}
      {expandedProduct && (
        <div
          ref={overlayRef}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 md:p-10"
          style={{ backgroundColor: "rgba(17,17,17,0.75)", backdropFilter: "blur(4px)", opacity: 0 }}
          onClick={(e) => { if (e.target === e.currentTarget) closeProduct(); }}
        >
          <div
            className="relative w-full max-w-3xl flex flex-col md:flex-row overflow-hidden shadow-2xl"
            style={{ backgroundColor: "#FFF9EF", maxHeight: "90vh" }}
          >
            {/* Close */}
            <button
              onClick={closeProduct}
              className="absolute top-4 right-4 z-10 font-sans font-bold text-[10px] uppercase tracking-widest hover:opacity-60 transition-opacity"
              style={{ color: "#1A1212" }}
            >
              ✕ Close
            </button>

            {/* Selvedge edge */}
            <div className="absolute top-0 left-0 bottom-0" style={{ width: "3.5px", backgroundColor: "#5B1C1C", opacity: 0.8 }} />

            {/* Image */}
            <div className="relative w-full md:w-5/12 bg-[#F8F1E5]" style={{ minHeight: "260px" }}>
              <Image
                src={expandedProduct.image}
                alt={expandedProduct.name}
                fill
                className="object-cover"
                sizes="400px"
              />
            </div>

            {/* Details */}
            <div className="w-full md:w-7/12 p-8 md:p-10 flex flex-col justify-between overflow-y-auto">
              <div>
                <span className="font-sans font-bold uppercase tracking-[0.25em] block mb-2" style={{ fontSize: "9px", color: "#5B1C1C" }}>
                  {expandedProduct.number} // NAAMI ATELIER
                </span>
                <h2
                  className="font-serif font-light uppercase mb-2"
                  style={{ fontSize: "clamp(1.4rem, 3vw, 2rem)", letterSpacing: "0.02em", lineHeight: 1.1 }}
                >
                  {expandedProduct.name}
                </h2>
                <p className="font-sans mb-6" style={{ fontSize: "12px", color: "rgba(17,17,17,0.5)" }}>
                  {expandedProduct.subtitle}
                </p>

                <div className="flex flex-col gap-3 mb-8" style={{ borderTop: "1px solid rgba(17,17,17,0.06)", paddingTop: "20px" }}>
                  {expandedProduct.metafields.slice(0, 3).map(({ name, description }) => (
                    <div key={name} className="flex justify-between" style={{ borderBottom: "1px solid rgba(139,26,26,0.05)", paddingBottom: "10px" }}>
                      <span className="font-sans font-bold" style={{ fontSize: "10px", color: "rgba(17,17,17,0.4)" }}>{name}</span>
                      <span className="font-sans" style={{ fontSize: "10px", color: "#1A1212" }}>{description}</span>
                    </div>
                  ))}
                </div>

                <p className="flex items-baseline gap-2">
                  <span className="font-serif" style={{ fontSize: "1.5rem", color: "#1A1212", letterSpacing: "0.02em" }}>
                    {expandedProduct.price}
                  </span>
                  {getDiscount(expandedProduct) && (
                    <>
                      <span
                        className="font-sans"
                        style={{ fontSize: "13px", color: "#1A1212", opacity: 0.4, textDecoration: "line-through" }}
                      >
                        {getDiscount(expandedProduct)!.compareAtPrice}
                      </span>
                      <span className="font-sans font-bold" style={{ fontSize: "10px", color: "#5B1C1C" }}>
                        −{getDiscount(expandedProduct)!.percentOff}%
                      </span>
                    </>
                  )}
                </p>
              </div>

              <button
                onClick={() => { incrementItems(); closeProduct(); }}
                className="mt-6 w-full py-4 font-sans font-bold uppercase tracking-[0.25em] hover:opacity-80 transition-opacity"
                style={{ fontSize: "10px", backgroundColor: "#5B1C1C", color: "#FFF9EF" }}
              >
                Add to Wardrobe
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
