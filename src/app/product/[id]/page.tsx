"use client";

import { use, useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { allProducts } from "@/models/products";
import { useCartStore } from "@/models/cartStore";
import CustomCursor from "@/components/CustomCursor";
import EvanliteFooter from "@/components/EvanliteFooter";

export default function ProductPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const productId = parseInt(resolvedParams.id, 10);
  const product = allProducts.find((p) => p.id === productId);

  const cartItemsCount = useCartStore((state) => state.cartItemsCount);
  const incrementItems = useCartStore((state) => state.incrementItems);

  // Force scroll to top on page mount
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  if (!product) {
    return (
      <main
        className="w-full min-h-screen flex flex-col items-center justify-center font-serif text-xl"
        style={{ backgroundColor: "#F4F0E6", color: "#111111" }}
      >
        <p>Product not found.</p>
        <Link
          href="/"
          className="mt-4 font-sans font-bold uppercase tracking-[0.2em] text-[10px] text-[#8B1A1A] border-b border-[#8B1A1A] pb-1"
        >
          Return to Atelier
        </Link>
      </main>
    );
  }

  return (
    <main
      className="relative w-full min-h-screen flex flex-col justify-between"
      style={{ backgroundColor: "#F4F0E6", color: "#111111" }}
    >
      {/* Slinger Medallion follow-cursor */}
      <CustomCursor />

      {/* ── Header Navigation ──────────────────────────────────── */}
      <header
        className="w-full h-20 flex justify-between items-center px-6 md:px-12 border-b border-black/5"
        style={{
          zIndex: 40,
          backgroundColor: "#F4F0E6",
        }}
      >
        <Link
          href="/"
          className="font-serif uppercase font-semibold hover:opacity-75 transition-opacity"
          style={{
            fontSize: "1.15rem",
            letterSpacing: "0.18em",
            color: "#8B1A1A",
          }}
          data-cursor-text="BACK"
        >
          Naami
        </Link>

        {/* Navigation */}
        <nav className="flex items-center gap-8">
          <Link
            href="/"
            className="hidden md:block hover:opacity-50 transition-opacity font-sans font-bold uppercase tracking-[0.2em] text-[10px]"
            data-cursor-text="HOME"
          >
            Home
          </Link>
          <span className="hidden md:block opacity-20">|</span>
          <button
            onClick={incrementItems}
            className="flex items-center gap-2 hover:opacity-55 transition-opacity font-sans font-bold uppercase tracking-[0.2em] cursor-pointer text-[10px]"
            data-cursor-text="CART"
          >
            Cart
            {cartItemsCount > 0 && (
              <span
                className="flex items-center justify-center rounded-full font-bold"
                style={{
                  width: 16,
                  height: 16,
                  fontSize: "8px",
                  backgroundColor: "#8B1A1A",
                  color: "#F4F0E6",
                }}
              >
                {cartItemsCount}
              </span>
            )}
          </button>
        </nav>
      </header>

      {/* ── Product Split Section ─────────────────────────────── */}
      <section className="flex-1 flex flex-col md:flex-row w-full max-w-7xl mx-auto px-6 md:px-12 py-12 md:py-20 gap-12 md:gap-16 items-stretch">
        
        {/* Left Side: Editorial Product Image */}
        <div className="w-full md:w-1/2 flex items-center justify-center">
          <div
            className="relative overflow-hidden w-full border border-black/5"
            style={{
              aspectRatio: "3/4",
              backgroundColor: "#EDE8DC",
            }}
          >
            <Image
              src={product.image}
              alt={product.name}
              fill
              className="object-cover"
              style={{ filter: "brightness(0.94)" }}
              priority
              sizes="(max-width: 768px) 100vw, 50vw"
            />
            {/* Red edge selvedge line */}
            <div
              className="absolute top-0 left-0 bottom-0"
              style={{
                width: "3px",
                backgroundColor: "#8B1A1A",
                opacity: 0.8,
              }}
            />
            {/* Solid Crimson corner rivet accent */}
            <div
              className="absolute top-5 right-5"
              style={{
                width: 8,
                height: 8,
                borderRadius: "50%",
                backgroundColor: "#8B1A1A",
                boxShadow: "0 0 8px rgba(139,26,26,0.5)",
              }}
            />
          </div>
        </div>

        {/* Right Side: Product Details Column */}
        <div className="w-full md:w-1/2 flex flex-col justify-between py-2">
          <div>
            <div className="flex justify-between items-center mb-6">
              <span
                className="font-sans font-bold uppercase tracking-[0.3em]"
                style={{ fontSize: "10px", color: "#8B1A1A" }}
              >
                {product.number} // NAAMI ATELIER
              </span>
              <Link
                href="/"
                className="font-sans font-bold uppercase tracking-[0.15em] hover:opacity-50 transition-opacity text-[9px] border-b border-black/20 pb-0.5"
                data-cursor-text="ATELIER"
              >
                ← Back to Homepage
              </Link>
            </div>

            <h1
              className="font-serif font-light uppercase mb-3"
              style={{
                fontSize: "clamp(2.5rem, 5vw, 3.75rem)",
                color: "#111111",
                lineHeight: 1.05,
                letterSpacing: "0.02em",
              }}
            >
              {product.name}
            </h1>

            <p
              className="font-sans font-bold uppercase tracking-[0.2em] mb-8"
              style={{ fontSize: "11px", color: "#111111", opacity: 0.4 }}
            >
              {product.subtitle}
            </p>

            <div
              className="mb-8"
              style={{
                borderTop: "1px solid rgba(139, 26, 26, 0.15)",
                paddingTop: "24px",
              }}
            >
              {[
                ["Fabric Detail", product.material],
                ["Cut & Silhouette", product.fit],
                ["Origin Tag", product.origin],
              ].map(([label, value]) => (
                <div
                  key={label}
                  className="flex justify-between mb-4"
                  style={{ borderBottom: "1px solid rgba(139, 26, 26, 0.08)", paddingBottom: "14px" }}
                >
                  <span
                    className="font-sans font-bold uppercase tracking-[0.15em]"
                    style={{ fontSize: "9px", color: "#111111", opacity: 0.35 }}
                  >
                    {label}
                  </span>
                  <span
                    className="font-sans text-right text-wrap"
                    style={{ fontSize: "12px", color: "#111111", opacity: 0.8, maxWidth: "65%" }}
                  >
                    {value}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div>
            <div className="flex items-end justify-between mb-8">
              <span
                className="font-serif font-light"
                style={{ fontSize: "2.75rem", color: "#111111" }}
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

            <button
              onClick={incrementItems}
              className="w-full flex items-center justify-between font-sans font-bold uppercase tracking-[0.2em] transition-opacity hover:opacity-90 cursor-pointer"
              style={{
                fontSize: "11px",
                color: "#F4F0E6",
                backgroundColor: "#8B1A1A",
                padding: "18px 28px",
              }}
              data-cursor-text="ADD"
            >
              ADD TO WARDROBE
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={2.5}
              >
                <path d="M5 12h14M12 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <EvanliteFooter />
    </main>
  );
}
