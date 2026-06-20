"use client";

import { useRef, useState, useCallback } from "react";
import gsap from "gsap";
import Image from "next/image";
import { useCartStore } from "@/models/cartStore";

interface Product {
  id: number;
  number: string;
  name: string;
  subtitle: string;
  price: string;
  material: string;
  fit: string;
  origin: string;
  image: string;
  colSpan: string;
  colStart: string;
}

const products: Product[] = [
  {
    id: 1,
    number: "001",
    name: "RAW INDIGO TRUCKER",
    subtitle: "Heavy Selvedge Jacket",
    price: "$360",
    material: "14oz Japanese Selvedge Denim",
    fit: "Relaxed trucker silhouette",
    origin: "Handcrafted in Portugal",
    image: "/images/product-jacket.png",
    colSpan: "md:col-span-5",
    colStart: "md:col-start-1",
  },
  {
    id: 2,
    number: "002",
    name: "SELVEDGE STRAIGHT",
    subtitle: "Rigid Fit Jeans",
    price: "$280",
    material: "12oz Cone Mills Selvedge",
    fit: "Straight, high-rise",
    origin: "Handcrafted in Portugal",
    image: "/images/product-jeans.png",
    colSpan: "md:col-span-4",
    colStart: "md:col-start-7",
  },
  {
    id: 3,
    number: "003",
    name: "BRASS HARDWARE KIT",
    subtitle: "Oxidized Rivet Set",
    price: "$120",
    material: "Forged solid brass alloy",
    fit: "Universal hardware sizing",
    origin: "Cast in Japan",
    image: "/images/product-hardware.png",
    colSpan: "md:col-span-3",
    colStart: "md:col-start-4",
  },
];

interface ExpandedState {
  productId: number | null;
  originRect: DOMRect | null;
}

export default function ProductGrid() {
  const incrementItems = useCartStore((state) => state.incrementItems);
  const [expanded, setExpanded] = useState<ExpandedState>({
    productId: null,
    originRect: null,
  });
  const overlayRef = useRef<HTMLDivElement>(null);
  const overlayContentRef = useRef<HTMLDivElement>(null);

  const openProduct = useCallback(
    (product: Product, rect: DOMRect) => {
      setExpanded({ productId: product.id, originRect: rect });

      if (!overlayRef.current || !overlayContentRef.current) return;

      // Start from card's position/size
      gsap.set(overlayRef.current, {
        x: rect.left,
        y: rect.top,
        width: rect.width,
        height: rect.height,
        opacity: 1,
        display: "block",
        borderRadius: 0,
      });
      gsap.set(overlayContentRef.current, { opacity: 0, y: 20 });

      // Expand to full screen
      gsap.to(overlayRef.current, {
        x: 0,
        y: 0,
        width: "100vw",
        height: "100vh",
        duration: 0.65,
        ease: "power3.inOut",
        onComplete: () => {
          // Fade in overlay content
          gsap.to(overlayContentRef.current, {
            opacity: 1,
            y: 0,
            duration: 0.45,
            ease: "power2.out",
          });
        },
      });
    },
    []
  );

  const closeProduct = useCallback(() => {
    if (!overlayRef.current || !overlayContentRef.current || !expanded.originRect)
      return;

    const rect = expanded.originRect;

    gsap.to(overlayContentRef.current, {
      opacity: 0,
      y: 10,
      duration: 0.2,
      ease: "power2.in",
      onComplete: () => {
        if (!overlayRef.current) return;
        gsap.to(overlayRef.current, {
          x: rect.left,
          y: rect.top,
          width: rect.width,
          height: rect.height,
          duration: 0.55,
          ease: "power3.inOut",
          onComplete: () => {
            gsap.set(overlayRef.current, { display: "none", opacity: 0 });
            setExpanded({ productId: null, originRect: null });
          },
        });
      },
    });
  }, [expanded.originRect]);

  const expandedProduct = products.find((p) => p.id === expanded.productId);

  return (
    <>
      {/* Expanded Product Overlay */}
      <div
        ref={overlayRef}
        className="hw-accelerate"
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          zIndex: 50,
          backgroundColor: "#080C14",
          display: "none",
          opacity: 0,
          overflow: "hidden",
        }}
      >
        {expandedProduct && (
          <div
            ref={overlayContentRef}
            className="relative w-full h-full flex flex-col md:flex-row"
          >
            {/* Image side */}
            <div className="relative w-full md:w-1/2 h-[50vh] md:h-full overflow-hidden">
              <Image
                src={expandedProduct.image}
                alt={expandedProduct.name}
                fill
                className="object-cover"
                style={{ filter: "brightness(0.92)" }}
              />
              {/* No gradient overlay */}
            </div>

            {/* Detail side */}
            <div
              className="w-full md:w-1/2 flex flex-col justify-center px-10 md:px-16 py-16"
              style={{ backgroundColor: "#080C14" }}
            >
              <div
                className="font-sans font-bold uppercase tracking-[0.3em] mb-4"
                style={{ fontSize: "10px", color: "#D4AF37" }}
              >
                {expandedProduct.number} // NAAMI DENIM
              </div>
              <h2
                className="font-serif font-light uppercase mb-2"
                style={{
                  fontSize: "clamp(2rem, 4vw, 3.5rem)",
                  color: "#FAF8F5",
                  lineHeight: 1,
                  letterSpacing: "0.02em",
                }}
              >
                {expandedProduct.name}
              </h2>
              <p
                className="font-sans font-bold uppercase tracking-[0.2em] mb-10"
                style={{ fontSize: "10px", color: "#FAF8F5", opacity: 0.4 }}
              >
                {expandedProduct.subtitle}
              </p>

              <div
                className="mb-10"
                style={{
                  borderTop: "1px solid rgba(250,248,245,0.1)",
                  paddingTop: "28px",
                }}
              >
                {[
                  ["Material", expandedProduct.material],
                  ["Construction", expandedProduct.fit],
                  ["Origin", expandedProduct.origin],
                ].map(([label, value]) => (
                  <div
                    key={label}
                    className="flex justify-between mb-4"
                    style={{ borderBottom: "1px solid rgba(250,248,245,0.06)", paddingBottom: "16px" }}
                  >
                    <span
                      className="font-sans font-bold uppercase tracking-[0.15em]"
                      style={{ fontSize: "9px", color: "#FAF8F5", opacity: 0.35 }}
                    >
                      {label}
                    </span>
                    <span
                      className="font-sans text-right"
                      style={{ fontSize: "11px", color: "#FAF8F5", opacity: 0.8, maxWidth: "60%" }}
                    >
                      {value}
                    </span>
                  </div>
                ))}
              </div>

              <div className="flex items-end justify-between mb-8">
                <span
                  className="font-serif font-light"
                  style={{ fontSize: "2.5rem", color: "#FAF8F5" }}
                >
                  {expandedProduct.price}
                </span>
                <span
                  className="font-sans"
                  style={{ fontSize: "10px", color: "#FAF8F5", opacity: 0.3 }}
                >
                  USD
                </span>
              </div>

              <button
                onClick={() => {
                  incrementItems();
                  closeProduct();
                }}
                className="flex items-center justify-between font-sans font-bold uppercase tracking-[0.2em] transition-opacity hover:opacity-70 mb-4"
                style={{
                  fontSize: "10px",
                  color: "#080C14",
                  backgroundColor: "#D4AF37",
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
            </div>

            {/* Close button */}
            <button
              onClick={closeProduct}
              className="absolute top-8 right-8 flex items-center gap-2 font-sans font-bold uppercase tracking-[0.2em] hover:opacity-60 transition-opacity"
              style={{ fontSize: "9px", color: "#FAF8F5" }}
              data-cursor-text="CLOSE"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                <path d="M18 6L6 18M6 6l12 12" strokeLinecap="round" />
              </svg>
              CLOSE
            </button>
          </div>
        )}
      </div>

      {/* Grid Section */}
      <section
        className="px-6 md:px-12 py-32"
        style={{ backgroundColor: "#080C14" }}
      >
        {/* Section Header */}
        <div className="flex items-end justify-between mb-16">
          <div>
            <div
              className="font-sans font-bold uppercase tracking-[0.3em] mb-3"
              style={{ fontSize: "9px", color: "#B22222" }}
            >
              AW26 // THE COLLECTION
            </div>
            <h2
              className="font-serif font-light uppercase"
              style={{
                fontSize: "clamp(2.5rem, 5vw, 4rem)",
                color: "#FAF8F5",
                lineHeight: 0.95,
                letterSpacing: "0.02em",
              }}
            >
              Selected
              <br />
              <span style={{ color: "#FAF8F5", opacity: 0.4, fontStyle: "italic" }}>
                Pieces
              </span>
            </h2>
          </div>
          <div
            className="hidden md:block font-sans font-bold uppercase tracking-[0.25em] text-right"
            style={{ fontSize: "9px", color: "#FAF8F5", opacity: 0.3 }}
          >
            3 Pieces Available
            <br />
            Limited Run
          </div>
        </div>

        {/* Asymmetric Product Grid */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 md:gap-8 items-start">
          {products.map((product) => (
            <ProductCard
              key={product.id}
              product={product}
              onExpand={openProduct}
            />
          ))}
        </div>
      </section>
    </>
  );
}

function ProductCard({
  product,
  onExpand,
}: {
  product: Product;
  onExpand: (product: Product, rect: DOMRect) => void;
}) {
  const cardRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLDivElement>(null);

  const handleClick = () => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    onExpand(product, rect);
  };

  const handleMouseEnter = () => {
    if (imageRef.current) {
      gsap.to(imageRef.current, {
        scale: 1.04,
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
      className={`${product.colSpan} ${product.colStart}`}
      onClick={handleClick}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      data-cursor-text="VIEW"
    >
      {/* Card number tag */}
      <div
        className="flex items-center gap-3 mb-4"
      >
        <span
          className="font-sans font-bold"
          style={{ fontSize: "9px", color: "#D4AF37", letterSpacing: "0.25em" }}
        >
          {product.number}
        </span>
        <div
          style={{
            height: "1px",
            flex: 1,
            background: "linear-gradient(to right, rgba(212,175,55,0.4), transparent)",
          }}
        />
      </div>

      {/* Image container */}
      <div
        ref={cardRef}
        className="relative overflow-hidden hw-accelerate"
        style={{
          aspectRatio: "3/4",
          backgroundColor: "#101622",
        }}
      >
        <div
          ref={imageRef}
          className="absolute inset-0 hw-accelerate"
        >
          <Image
            src={product.image}
            alt={product.name}
            fill
            className="object-cover"
            style={{ filter: "brightness(0.9)" }}
          />
        </div>

        {/* No gradient overlay */}

        {/* Hover CTA */}
        <div
          className="absolute bottom-6 left-6 right-6 flex items-center justify-between opacity-0 transition-opacity duration-300 group-hover:opacity-100"
          style={{ opacity: 0 }}
        >
          <span
            className="font-sans font-bold uppercase tracking-[0.2em]"
            style={{ fontSize: "9px", color: "#FAF8F5" }}
          >
            EXPAND VIEW
          </span>
        </div>

        {/* Brass corner accent */}
        <div
          className="absolute top-4 right-4"
          style={{
            width: 8,
            height: 8,
            borderRadius: "50%",
            backgroundColor: "#D4AF37",
            boxShadow: "0 0 6px rgba(212,175,55,0.7)",
          }}
        />
      </div>

      {/* Card info */}
      <div className="mt-5">
        <h3
          className="font-serif font-light uppercase mb-1"
          style={{
            fontSize: "1.25rem",
            color: "#FAF8F5",
            lineHeight: 1.1,
            letterSpacing: "0.03em",
          }}
        >
          {product.name}
        </h3>
        <div className="flex items-center justify-between mt-3">
          <span
            className="font-sans"
            style={{ fontSize: "11px", color: "#FAF8F5", opacity: 0.4 }}
          >
            {product.subtitle}
          </span>
          <span
            className="font-serif"
            style={{ fontSize: "1.1rem", color: "#FAF8F5" }}
          >
            {product.price}
          </span>
        </div>
        {/* Selvedge red underline */}
        <div
          style={{
            height: "1px",
            marginTop: "12px",
            background: `linear-gradient(to right, #B22222, transparent)`,
            opacity: 0.6,
          }}
        />
      </div>
    </div>
  );
}
