"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useCartStore } from "@/models/cartStore";
import EvanliteFooter from "@/components/EvanliteFooter";

function formatPrice(inr: number): string {
  return `₹${inr.toLocaleString("en-IN")}`;
}

export default function CartPage() {
  const { items, updateQuantity, removeItem, cartItemsCount } = useCartStore();
  const [couponCode, setCouponCode] = useState("");
  const [couponResult, setCouponResult] = useState<{
    discountInr: number;
    error?: string;
  } | null>(null);
  const [applyingCoupon, setApplyingCoupon] = useState(false);

  const subtotal = items.reduce((sum, i) => sum + i.priceInr * i.quantity, 0);

  // The discount is computed server-side from DB prices; the client only displays it.
  const discountAmount = couponResult && !couponResult.error ? couponResult.discountInr : 0;
  const total = Math.max(0, subtotal - discountAmount);

  const whatsappNumber = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER ?? "";
  const whatsappMessage = encodeURIComponent(
    `Hello, I'd like to order from NAAMI:\n` +
    items.map((i) => `• ${i.name} (${i.size}) × ${i.quantity} — ${formatPrice(i.priceInr * i.quantity)}`).join("\n") +
    `\n\nTotal: ${formatPrice(total)}`
  );

  const applyCoupon = async () => {
    if (!couponCode.trim()) return;
    setApplyingCoupon(true);
    setCouponResult(null);
    try {
      const res = await fetch("/api/checkout/apply-coupon", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: couponCode,
          items: items.map((i) => ({ productId: i.productId, quantity: i.quantity, size: i.size })),
        }),
      });
      const data = await res.json();
      if (res.status === 401) {
        setCouponResult({ discountInr: 0, error: "Please log in to apply a coupon." });
      } else if (!res.ok) {
        setCouponResult({ discountInr: 0, error: data.error });
      } else {
        setCouponResult({ discountInr: data.discountInr });
      }
    } catch {
      setCouponResult({ discountInr: 0, error: "Failed to apply coupon." });
    } finally {
      setApplyingCoupon(false);
    }
  };

  if (cartItemsCount === 0) {
    return (
      <main
        className="relative w-full min-h-screen flex flex-col items-center justify-center pt-20 px-6"
        style={{ backgroundColor: "#F4F0E6", color: "#111111" }}
      >
        <div className="text-center max-w-md">
          <div className="w-[3px] h-12 bg-[#8B1A1A] opacity-70 mx-auto mb-8" />
          <p className="font-sans font-bold uppercase tracking-[0.3em] mb-4" style={{ fontSize: "9px", color: "#8B1A1A" }}>
            NAAMI // YOUR WARDROBE
          </p>
          <h1 className="font-serif font-light uppercase mb-6" style={{ fontSize: "2.2rem", color: "#111", letterSpacing: "0.03em" }}>
            Your cart is empty
          </h1>
          <p className="font-sans mb-10" style={{ fontSize: "13px", color: "rgba(17,17,17,0.5)", lineHeight: 1.7 }}>
            Discover pieces crafted from heritage weaves and finest cottons.
          </p>
          <Link
            href="/collection"
            className="inline-block font-sans font-bold uppercase tracking-[0.25em] py-4 px-10 hover:opacity-80 transition-opacity"
            style={{ fontSize: "10px", backgroundColor: "#8B1A1A", color: "#F4F0E6" }}
          >
            Explore Collections
          </Link>
        </div>
        <EvanliteFooter />
      </main>
    );
  }

  return (
    <main
      className="relative w-full min-h-screen flex flex-col pt-20"
      style={{ backgroundColor: "#F4F0E6", color: "#111111" }}
    >
      <div className="flex-1 w-full max-w-6xl mx-auto px-6 md:px-12 py-12">
        <div className="mb-10">
          <p className="font-sans font-bold uppercase tracking-[0.3em] mb-2" style={{ fontSize: "9px", color: "#8B1A1A" }}>
            NAAMI // YOUR WARDROBE
          </p>
          <h1 className="font-serif font-light uppercase" style={{ fontSize: "clamp(2rem, 4vw, 3rem)", color: "#111", letterSpacing: "0.03em" }}>
            Shopping Cart
          </h1>
        </div>

        <div className="flex flex-col lg:flex-row gap-12">
          {/* Cart Items */}
          <div className="flex-1">
            <div className="flex font-sans font-bold uppercase tracking-[0.2em] pb-3" style={{ fontSize: "8px", color: "rgba(17,17,17,0.4)", borderBottom: "1px solid rgba(139,26,26,0.12)" }}>
              <span className="flex-1">Item</span>
              <span className="w-24 text-center">Qty</span>
              <span className="w-28 text-right">Amount</span>
            </div>

            {items.map((item) => (
              <div
                key={`${item.productId}-${item.size}`}
                className="flex items-center gap-4 py-6"
                style={{ borderBottom: "1px solid rgba(139,26,26,0.06)" }}
              >
                {/* Product image */}
                <div className="relative flex-shrink-0 overflow-hidden" style={{ width: 72, height: 90, backgroundColor: "#EDE8DC" }}>
                  <Image src={item.image} alt={item.name} fill className="object-cover" sizes="72px" />
                  <div className="absolute top-0 left-0 bottom-0" style={{ width: "2px", backgroundColor: "#8B1A1A", opacity: 0.7 }} />
                </div>

                {/* Name + size */}
                <div className="flex-1 min-w-0">
                  <p className="font-serif font-light uppercase mb-1" style={{ fontSize: "13px", color: "#111", letterSpacing: "0.03em", lineHeight: 1.2 }}>
                    {item.name}
                  </p>
                  <p className="font-sans font-bold uppercase tracking-[0.15em]" style={{ fontSize: "9px", color: "#8B1A1A" }}>
                    Size: {item.size}
                  </p>
                  <p className="font-sans mt-1" style={{ fontSize: "11px", color: "rgba(17,17,17,0.45)" }}>
                    {formatPrice(item.priceInr)} each
                  </p>
                  <button
                    onClick={() => removeItem(item.productId, item.size)}
                    className="font-sans font-bold uppercase tracking-[0.15em] hover:text-[#8B1A1A] transition-colors mt-2 cursor-pointer"
                    style={{ fontSize: "8px", color: "rgba(17,17,17,0.3)", background: "none", border: "none" }}
                  >
                    Remove
                  </button>
                </div>

                {/* Quantity stepper */}
                <div className="w-24 flex items-center justify-center gap-2">
                  <button
                    onClick={() => updateQuantity(item.productId, item.size, item.quantity - 1)}
                    className="font-bold hover:opacity-60 transition-opacity cursor-pointer"
                    style={{ width: 24, height: 24, fontSize: "16px", color: "#111", backgroundColor: "rgba(17,17,17,0.06)", border: "none", lineHeight: 1 }}
                  >
                    −
                  </button>
                  <span className="font-sans font-bold" style={{ fontSize: "13px", minWidth: 20, textAlign: "center" }}>
                    {item.quantity}
                  </span>
                  <button
                    onClick={() => updateQuantity(item.productId, item.size, item.quantity + 1)}
                    className="font-bold hover:opacity-60 transition-opacity cursor-pointer"
                    style={{ width: 24, height: 24, fontSize: "16px", color: "#111", backgroundColor: "rgba(17,17,17,0.06)", border: "none", lineHeight: 1 }}
                  >
                    +
                  </button>
                </div>

                {/* Line total */}
                <div className="w-28 text-right">
                  <span className="font-serif font-light" style={{ fontSize: "16px", color: "#111" }}>
                    {formatPrice(item.priceInr * item.quantity)}
                  </span>
                </div>
              </div>
            ))}
          </div>

          {/* Order Summary */}
          <div className="lg:w-80 flex-shrink-0">
            <div className="sticky top-24" style={{ backgroundColor: "#EDE8DC", padding: "28px" }}>
              <p className="font-sans font-bold uppercase tracking-[0.25em] mb-6" style={{ fontSize: "9px", color: "#8B1A1A" }}>
                Order Summary
              </p>

              <div className="flex justify-between mb-3">
                <span className="font-sans" style={{ fontSize: "12px", color: "rgba(17,17,17,0.6)" }}>Subtotal</span>
                <span className="font-sans font-bold" style={{ fontSize: "13px" }}>{formatPrice(subtotal)}</span>
              </div>

              {/* Coupon */}
              <div className="mb-4">
                <div className="flex gap-2 mt-4">
                  <input
                    value={couponCode}
                    onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                    onKeyDown={(e) => e.key === "Enter" && applyCoupon()}
                    placeholder="COUPON CODE"
                    className="flex-1 font-sans font-bold uppercase tracking-[0.15em] px-3 py-2 outline-none"
                    style={{
                      fontSize: "9px",
                      backgroundColor: "#F4F0E6",
                      border: "1px solid rgba(139,26,26,0.15)",
                      color: "#111",
                    }}
                  />
                  <button
                    onClick={applyCoupon}
                    disabled={applyingCoupon}
                    className="font-sans font-bold uppercase tracking-[0.15em] px-4 hover:opacity-70 transition-opacity cursor-pointer"
                    style={{
                      fontSize: "9px",
                      backgroundColor: "#8B1A1A",
                      color: "#F4F0E6",
                      border: "none",
                    }}
                  >
                    {applyingCoupon ? "..." : "Apply"}
                  </button>
                </div>
                {couponResult?.error && (
                  <p className="font-sans mt-2" style={{ fontSize: "10px", color: "#c0392b" }}>
                    {couponResult.error}
                  </p>
                )}
                {couponResult && !couponResult.error && (
                  <p className="font-sans mt-2" style={{ fontSize: "10px", color: "#2E6B3A" }}>
                    Discount applied: −{formatPrice(discountAmount)}
                  </p>
                )}
              </div>

              {discountAmount > 0 && (
                <div className="flex justify-between mb-3">
                  <span className="font-sans" style={{ fontSize: "12px", color: "#2E6B3A" }}>Discount</span>
                  <span className="font-sans font-bold" style={{ fontSize: "13px", color: "#2E6B3A" }}>−{formatPrice(discountAmount)}</span>
                </div>
              )}

              <div
                className="flex justify-between py-4 mt-2"
                style={{ borderTop: "1px solid rgba(139,26,26,0.15)" }}
              >
                <span className="font-sans font-bold uppercase tracking-[0.15em]" style={{ fontSize: "10px" }}>Total</span>
                <span className="font-serif font-light" style={{ fontSize: "20px", color: "#111" }}>{formatPrice(total)}</span>
              </div>

              <Link
                href={`/checkout${couponCode && !couponResult?.error ? `?coupon=${encodeURIComponent(couponCode)}` : ""}`}
                className="block w-full text-center font-sans font-bold uppercase tracking-[0.2em] py-4 hover:opacity-90 transition-opacity"
                style={{ fontSize: "10px", backgroundColor: "#8B1A1A", color: "#F4F0E6" }}
              >
                Proceed to Checkout →
              </Link>

              {whatsappNumber && (
                <a
                  href={`https://wa.me/${whatsappNumber.replace(/\D/g, "")}?text=${whatsappMessage}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block w-full text-center font-sans font-bold uppercase tracking-[0.2em] py-3 mt-3 hover:opacity-80 transition-opacity"
                  style={{
                    fontSize: "9px",
                    border: "1px solid rgba(17,17,17,0.15)",
                    color: "#111",
                  }}
                >
                  Order via WhatsApp
                </a>
              )}

              <Link
                href="/collection"
                className="block text-center font-sans font-bold uppercase tracking-[0.15em] mt-4 hover:opacity-50 transition-opacity"
                style={{ fontSize: "8px", color: "rgba(17,17,17,0.4)" }}
              >
                ← Continue Shopping
              </Link>
            </div>
          </div>
        </div>
      </div>

      <EvanliteFooter />
    </main>
  );
}
