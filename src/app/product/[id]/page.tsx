"use client";

import { use, useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useCartStore } from "@/models/cartStore";
import { formatINR } from "@/lib/format";
import { trackEvent } from "@/components/MetaPixel";
import SizeGuideModal from "@/components/SizeGuideModal";
import EvanliteFooter from "@/components/EvanliteFooter";
import WishlistButton from "@/components/WishlistButton";

type ProductImage = { url: string; thumbnailUrl: string | null };
type ProductMetafield = { name: string; description: string };

type Product = {
  id: number;
  number: string;
  name: string;
  subtitle: string;
  price: string;
  priceInr: number;
  compareAtPriceInr?: number | null;
  image: string;
  images?: ProductImage[];
  metafields?: ProductMetafield[];
  sizes?: { size: string; stock: number }[];
  available?: boolean;
};

function getDiscount(product: Product) {
  if (!product.compareAtPriceInr || product.compareAtPriceInr <= product.priceInr) return null;
  const percentOff = Math.round(
    ((product.compareAtPriceInr - product.priceInr) / product.compareAtPriceInr) * 100
  );
  return { compareAtPrice: formatINR(product.compareAtPriceInr), percentOff };
}

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
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);

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
        setSelectedImageIndex(0);
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
    if (!product || product.available === false) return;
    const sizes = product.sizes ?? [];
    if (sizes.length > 1 && !selectedSize) {
      setSizeError(true);
      setTimeout(() => setSizeError(false), 2000);
      return;
    }
    const size = selectedSize || sizes[0]?.size || "One Size";
    // Defense in depth: size buttons for 0-stock sizes are disabled, but
    // guard here too in case selectedSize was set before a stock refresh.
    const sizeStock = sizes.find((s) => s.size === size)?.stock;
    if (sizes.length > 0 && sizeStock === 0) {
      setSizeError(true);
      setTimeout(() => setSizeError(false), 2000);
      return;
    }
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
        style={{ backgroundColor: "#FFF9EF", color: "#1A1212" }}
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
        style={{ backgroundColor: "#FFF9EF", color: "#1A1212" }}
      >
        <p>Product not found.</p>
        <Link
          href="/"
          className="mt-4 font-sans font-bold uppercase tracking-[0.2em] text-[10px] text-[#5B1C1C] border-b border-[#5B1C1C] pb-1"
        >
          Return to Atelier
        </Link>
      </main>
    );
  }

  const sizes = product.sizes ?? [];
  const gallery: ProductImage[] = product.images?.length ? product.images : [{ url: product.image, thumbnailUrl: null }];
  const metafields = product.metafields ?? [];

  return (
    <main
      className="relative w-full min-h-screen flex flex-col justify-between pt-[var(--site-header-h)]"
      style={{ backgroundColor: "#FFF9EF", color: "#1A1212" }}
    >
      {showSizeGuide && <SizeGuideModal onClose={() => setShowSizeGuide(false)} />}

      {/* ── Product Split Section ─────────────────────────────── */}
      <section className="flex-1 flex flex-col md:flex-row w-full max-w-7xl mx-auto px-6 md:px-12 py-12 md:py-20 gap-12 md:gap-16 items-stretch">

        {/* Left Side: Editorial Product Image */}
        <div className="w-full md:w-1/2 flex flex-col items-center justify-center">
          <div
            className="relative overflow-hidden w-full border border-black/5"
            style={{ aspectRatio: "3/4", backgroundColor: "#F8F1E5" }}
          >
            <Image
              src={gallery[selectedImageIndex].url}
              alt={product.name}
              fill
              className="object-cover"
              style={{ filter: "brightness(0.94)" }}
              priority
              sizes="(max-width: 768px) 100vw, 50vw"
            />
            {/* Wishlist button */}
            <div className="absolute top-4 right-4 z-10">
              <WishlistButton productId={product.id} />
            </div>
          </div>
          {gallery.length > 1 && (
            <div className="flex gap-2 mt-4 w-full justify-center flex-wrap">
              {gallery.map((img, index) => (
                <button
                  key={img.url + index}
                  onClick={() => setSelectedImageIndex(index)}
                  className="relative overflow-hidden cursor-pointer"
                  style={{
                    width: 56,
                    height: 72,
                    border: selectedImageIndex === index ? "2px solid #5B1C1C" : "1px solid rgba(17,17,17,0.15)",
                    backgroundColor: "#F8F1E5",
                  }}
                >
                  <Image
                    src={img.thumbnailUrl ?? img.url}
                    alt={`${product.name} thumbnail ${index + 1}`}
                    fill
                    className="object-cover"
                    sizes="56px"
                  />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Right Side: Product Details Column */}
        <div className="w-full md:w-1/2 flex flex-col justify-between py-2">
          <div>
            <div className="flex justify-between items-center mb-6">
              <span
                className="font-sans font-bold uppercase tracking-[0.3em]"
                style={{ fontSize: "10px", color: "#5B1C1C" }}
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
                color: "#1A1212",
                lineHeight: 1.05,
                letterSpacing: "0.02em",
              }}
            >
              {product.name}
            </h1>

            <p
              className="font-sans font-bold uppercase tracking-[0.2em] mb-8"
              style={{ fontSize: "11px", color: "#1A1212", opacity: 0.4 }}
            >
              {product.subtitle}
            </p>

            <div
              className="mb-8"
              style={{ borderTop: "1px solid rgba(139, 26, 26, 0.15)", paddingTop: "24px" }}
            >
              {metafields.map(({ name, description }) => (
                <div
                  key={name}
                  className="flex justify-between mb-4"
                  style={{ borderBottom: "1px solid rgba(139, 26, 26, 0.08)", paddingBottom: "14px" }}
                >
                  <span
                    className="font-sans font-bold uppercase tracking-[0.15em]"
                    style={{ fontSize: "9px", color: "#1A1212", opacity: 0.35 }}
                  >
                    {name}
                  </span>
                  <span
                    className="font-sans text-right text-wrap"
                    style={{ fontSize: "12px", color: "#1A1212", opacity: 0.8, maxWidth: "65%" }}
                  >
                    {description}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div>
            <div className="flex items-end justify-between mb-6">
              <span className="flex items-baseline gap-2">
                <span
                  className="font-serif font-light"
                  style={{ fontSize: "2.75rem", color: "#1A1212" }}
                >
                  {product.price}
                </span>
                {getDiscount(product) && (
                  <>
                    <span
                      className="font-sans"
                      style={{ fontSize: "15px", color: "#1A1212", opacity: 0.4, textDecoration: "line-through" }}
                    >
                      {getDiscount(product)!.compareAtPrice}
                    </span>
                    <span className="font-sans font-bold" style={{ fontSize: "11px", color: "#5B1C1C" }}>
                      −{getDiscount(product)!.percentOff}%
                    </span>
                  </>
                )}
                {product.available === false && (
                  <span
                    className="font-sans font-bold uppercase tracking-[0.15em]"
                    style={{ fontSize: "9px", color: "#FFF9EF", backgroundColor: "#1A1212", padding: "3px 8px" }}
                  >
                    Out of Stock
                  </span>
                )}
              </span>
              <span className="font-sans" style={{ fontSize: "10px", color: "#1A1212", opacity: 0.3 }}>
                INR
              </span>
            </div>

            {/* Size Selector */}
            {sizes.length > 0 && (
              <div className="mb-6">
                <div className="flex items-center justify-between mb-3">
                  <span
                    className="font-sans font-bold uppercase tracking-[0.2em]"
                    style={{ fontSize: "9px", color: sizeError ? "#5B1C1C" : "rgba(17,17,17,0.5)" }}
                  >
                    {sizeError ? "Please select a size" : "Select Size"}
                  </span>
                  <button
                    onClick={() => setShowSizeGuide(true)}
                    className="font-sans font-bold uppercase tracking-[0.15em] hover:opacity-50 transition-opacity cursor-pointer"
                    style={{
                      fontSize: "8px",
                      color: "#5B1C1C",
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
                  {sizes.map(({ size: sz, stock }) => {
                    const outOfStock = stock === 0;
                    return (
                      <button
                        key={sz}
                        disabled={outOfStock}
                        onClick={() => { if (outOfStock) return; setSelectedSize(sz); setSizeError(false); }}
                        className="font-sans font-bold uppercase tracking-[0.15em] transition-all cursor-pointer disabled:cursor-not-allowed"
                        style={{
                          fontSize: "10px",
                          padding: "8px 14px",
                          position: "relative",
                          border: selectedSize === sz
                            ? "1.5px solid #5B1C1C"
                            : "1.5px solid rgba(17,17,17,0.15)",
                          color: outOfStock ? "rgba(17,17,17,0.3)" : selectedSize === sz ? "#5B1C1C" : "#111",
                          backgroundColor: selectedSize === sz ? "rgba(139,26,26,0.05)" : "transparent",
                          textDecoration: outOfStock ? "line-through" : "none",
                        }}
                        title={outOfStock ? "Out of stock" : undefined}
                      >
                        {sz}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Add to Cart + Wishlist row */}
            <div className="flex gap-3 items-stretch mb-3">
              <button
                onClick={handleAddToCart}
                disabled={product.available === false}
                className="flex-1 flex items-center justify-between font-sans font-bold uppercase tracking-[0.2em] transition-all hover:opacity-90 cursor-pointer disabled:cursor-not-allowed disabled:hover:opacity-100"
                style={{
                  fontSize: "11px",
                  color: "#FFF9EF",
                  backgroundColor: product.available === false ? "rgba(17,17,17,0.3)" : added ? "#2E6B3A" : "#5B1C1C",
                  padding: "18px 28px",
                  transition: "background-color 0.3s ease",
                }}
                data-cursor-text={product.available === false ? undefined : added ? "DONE" : "ADD"}
              >
                {product.available === false ? "OUT OF STOCK" : added ? "ADDED TO WARDROBE ✓" : "ADD TO WARDROBE"}
                {product.available !== false && !added && (
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
                color: "#5B1C1C",
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
