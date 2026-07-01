"use client";

import { use, useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useCartStore } from "@/models/cartStore";
import { trackEvent } from "@/components/MetaPixel";
import SizeGuideModal from "@/components/SizeGuideModal";
import EvanliteFooter from "@/components/EvanliteFooter";
import WishlistButton from "@/components/WishlistButton";

type Product = {
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
  sizes?: string[];
};

export default function ProductPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const productId = parseInt(resolvedParams.id, 10);

  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  const addItem = useCartStore((state) => state.addItem);

  const [selectedSize, setSelectedSize] = useState<string>("");
  const [showSizeGuide, setShowSizeGuide] = useState(false);
  const [added, setAdded] = useState(false);
  const [sizeError, setSizeError] = useState(false);

  useEffect(() => {
    window.scrollTo(0, 0);
    setLoading(true);
    fetch(`/api/products/${productId}`)
      .then((r) => {
        if (!r.ok) { setNotFound(true); setLoading(false); return null; }
        return r.json();
      })
      .then((data: Product | null) => {
        if (!data) return;
        setProduct(data);
        setLoading(false);
        trackEvent("ViewContent", {
          content_ids: [String(data.id)],
          content_name: data.name,
          content_type: "product",
          value: data.priceInr / 100,
          currency: "INR",
        });
      })
      .catch(() => { setNotFound(true); setLoading(false); });
  }, [productId]);

  const handleAddToCart = () => {
    if (!product) return;
    const sizes = product.sizes ?? [];
    if (sizes.length > 1 && !selectedSize) {
      setSizeError(true);
      setTimeout(() => setSizeError(false), 2000);
      return;
    }
    const size = selectedSize || sizes[0] || "One Size";
    addItem({
      productId: product.id,
      name: product.name,
      priceInr: product.priceInr,
      image: product.image,
      size,
    });
    trackEvent("AddToCart", {
      content_ids: [String(product.id)],
      content_name: product.name,
      value: product.priceInr / 100,
      currency: "INR",
    });
    setAdded(true);
    setTimeout(() => setAdded(false), 2200);
  };

  if (loading) {
    return (
      <main
        className="w-full min-h-screen flex flex-col items-center justify-center font-serif text-xl"
        style={{ backgroundColor: "#F4F0E6", color: "#111111" }}
      >
        <p style={{ opacity: 0.4, fontSize: "12px", fontFamily: "sans-serif", letterSpacing: "0.2em" }}>
          LOADING…
        </p>
      </main>
    );
  }

  if (notFound || !product) {
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

  const sizes = product.sizes ?? [];

  return (
    <main
      className="relative w-full min-h-screen flex flex-col justify-between pt-20"
      style={{ backgroundColor: "#F4F0E6", color: "#111111" }}
    >
      {showSizeGuide && <SizeGuideModal onClose={() => setShowSizeGuide(false)} />}

      {/* ── Product Split Section ─────────────────────────────── */}
      <section className="flex-1 flex flex-col md:flex-row w-full max-w-7xl mx-auto px-6 md:px-12 py-12 md:py-20 gap-12 md:gap-16 items-stretch">

        {/* Left Side: Editorial Product Image */}
        <div className="w-full md:w-1/2 flex items-center justify-center">
          <div
            className="relative overflow-hidden w-full border border-black/5"
            style={{ aspectRatio: "3/4", backgroundColor: "#EDE8DC" }}
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
            <div
              className="absolute top-0 left-0 bottom-0"
              style={{ width: "3px", backgroundColor: "#8B1A1A", opacity: 0.8 }}
            />
            {/* Wishlist button */}
            <div className="absolute top-4 right-4 z-10">
              <WishlistButton productId={product.id} />
            </div>
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
              style={{ borderTop: "1px solid rgba(139, 26, 26, 0.15)", paddingTop: "24px" }}
            >
              {[
                ["Fabric & Weave", product.material],
                ["Collar & Silhouette", product.fit],
                ["Origin Atelier", product.origin],
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
            <div className="flex items-end justify-between mb-6">
              <span
                className="font-serif font-light"
                style={{ fontSize: "2.75rem", color: "#111111" }}
              >
                {product.price}
              </span>
              <span className="font-sans" style={{ fontSize: "10px", color: "#111111", opacity: 0.3 }}>
                INR
              </span>
            </div>

            {/* Size Selector */}
            {sizes.length > 0 && (
              <div className="mb-6">
                <div className="flex items-center justify-between mb-3">
                  <span
                    className="font-sans font-bold uppercase tracking-[0.2em]"
                    style={{ fontSize: "9px", color: sizeError ? "#8B1A1A" : "rgba(17,17,17,0.5)" }}
                  >
                    {sizeError ? "Please select a size" : "Select Size"}
                  </span>
                  <button
                    onClick={() => setShowSizeGuide(true)}
                    className="font-sans font-bold uppercase tracking-[0.15em] hover:opacity-50 transition-opacity cursor-pointer"
                    style={{
                      fontSize: "8px",
                      color: "#8B1A1A",
                      paddingBottom: "1px",
                      background: "none",
                      border: "none",
                      borderBottom: "1px solid rgba(139,26,26,0.4)",
                      cursor: "pointer",
                    }}
                  >
                    Size Guide
                  </button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {sizes.map((sz) => (
                    <button
                      key={sz}
                      onClick={() => { setSelectedSize(sz); setSizeError(false); }}
                      className="font-sans font-bold uppercase tracking-[0.15em] transition-all cursor-pointer"
                      style={{
                        fontSize: "10px",
                        padding: "8px 14px",
                        border: selectedSize === sz
                          ? "1.5px solid #8B1A1A"
                          : "1.5px solid rgba(17,17,17,0.15)",
                        color: selectedSize === sz ? "#8B1A1A" : "#111",
                        backgroundColor: selectedSize === sz ? "rgba(139,26,26,0.05)" : "transparent",
                      }}
                    >
                      {sz}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Add to Cart + Wishlist row */}
            <div className="flex gap-3 items-stretch mb-3">
              <button
                onClick={handleAddToCart}
                className="flex-1 flex items-center justify-between font-sans font-bold uppercase tracking-[0.2em] transition-all hover:opacity-90 cursor-pointer"
                style={{
                  fontSize: "11px",
                  color: "#F4F0E6",
                  backgroundColor: added ? "#2E6B3A" : "#8B1A1A",
                  padding: "18px 28px",
                  transition: "background-color 0.3s ease",
                }}
                data-cursor-text={added ? "DONE" : "ADD"}
              >
                {added ? "ADDED TO WARDROBE ✓" : "ADD TO WARDROBE"}
                {!added && (
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
                    <path d="M5 12h14M12 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                )}
              </button>
              <WishlistButton productId={product.id} />
            </div>

            <Link
              href="/cart"
              className="block w-full text-center font-sans font-bold uppercase tracking-[0.2em] mt-3 py-3 hover:opacity-60 transition-opacity"
              style={{
                fontSize: "9px",
                color: "#8B1A1A",
                border: "1px solid rgba(139,26,26,0.2)",
              }}
            >
              View Cart →
            </Link>
          </div>
        </div>
      </section>

      <EvanliteFooter />
    </main>
  );
}
