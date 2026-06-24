"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import EvanliteFooter from "@/components/EvanliteFooter";

function formatPrice(inr: number): string {
  return `₹${inr.toLocaleString("en-IN")}`;
}

interface OrderItem {
  id: number;
  productName: string;
  unitPriceInr: number;
  quantity: number;
  size?: string | null;
}

interface Order {
  id: string;
  status: string;
  totalInr: number;
  shippingName?: string | null;
  shippingEmail?: string | null;
  shippingAddress?: string | null;
  createdAt: string;
}

interface OrderAddress {
  line1: string;
  line2?: string;
  city: string;
  state: string;
  pincode: string;
}

export default function OrderConfirmationPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [order, setOrder] = useState<Order | null>(null);
  const [items, setItems] = useState<OrderItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    window.scrollTo(0, 0);
    Promise.all([
      fetch(`/api/admin/orders/${id}`).then((r) => (r.ok ? r.json() : null)),
      fetch(`/api/admin/orders/${id}/items`).then((r) => (r.ok ? r.json() : [])),
    ])
      .then(([orderData, itemsData]) => {
        if (!orderData) { setError(true); } else {
          setOrder(orderData);
          setItems(itemsData ?? []);
        }
      })
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <main className="w-full min-h-screen flex items-center justify-center pt-20" style={{ backgroundColor: "#F4F0E6" }}>
        <div className="w-[3px] h-10 bg-[#8B1A1A] opacity-60 animate-pulse" />
      </main>
    );
  }

  if (error || !order) {
    return (
      <main className="w-full min-h-screen flex flex-col items-center justify-center pt-20 px-6" style={{ backgroundColor: "#F4F0E6" }}>
        <p className="font-serif font-light text-xl mb-4">Order not found.</p>
        <Link href="/" className="font-sans font-bold uppercase tracking-[0.2em] text-[10px] text-[#8B1A1A] border-b border-[#8B1A1A] pb-1">
          Return to Atelier
        </Link>
      </main>
    );
  }

  let address: OrderAddress | null = null;
  if (order.shippingAddress) {
    try { address = JSON.parse(order.shippingAddress); } catch { /* noop */ }
  }

  return (
    <main className="relative w-full min-h-screen flex flex-col pt-20" style={{ backgroundColor: "#F4F0E6", color: "#111111" }}>
      <div className="flex-1 w-full max-w-2xl mx-auto px-6 md:px-12 py-16">
        {/* Confirmation header */}
        <div className="mb-12 text-center">
          <div className="w-[3px] h-12 bg-[#8B1A1A] opacity-70 mx-auto mb-6" />
          <p className="font-sans font-bold uppercase tracking-[0.3em] mb-3" style={{ fontSize: "9px", color: "#8B1A1A" }}>
            NAAMI // ORDER CONFIRMED
          </p>
          <h1 className="font-serif font-light uppercase mb-4" style={{ fontSize: "clamp(2rem, 5vw, 3.2rem)", color: "#111", letterSpacing: "0.03em", lineHeight: 1.1 }}>
            Thank you{order.shippingName ? `, ${order.shippingName.split(" ")[0]}` : ""}
          </h1>
          <p className="font-sans" style={{ fontSize: "13px", color: "rgba(17,17,17,0.55)", lineHeight: 1.7 }}>
            Your order has been received. A confirmation has been sent{order.shippingEmail ? ` to ${order.shippingEmail}` : ""}.
          </p>
        </div>

        {/* Order reference */}
        <div className="mb-8 px-8 py-6" style={{ backgroundColor: "#EDE8DC", borderLeft: "3px solid #8B1A1A" }}>
          <p className="font-sans font-bold uppercase tracking-[0.2em] mb-2" style={{ fontSize: "8px", color: "#8B1A1A" }}>
            Order Reference
          </p>
          <p className="font-serif font-light" style={{ fontSize: "1.5rem", color: "#111" }}>{order.id}</p>
          <p className="font-sans mt-2" style={{ fontSize: "11px", color: "rgba(17,17,17,0.45)" }}>
            {new Date(order.createdAt).toLocaleDateString("en-IN", { year: "numeric", month: "long", day: "numeric" })}
          </p>
        </div>

        {/* Items */}
        <div className="mb-8">
          <p className="font-sans font-bold uppercase tracking-[0.22em] mb-4" style={{ fontSize: "9px", color: "#8B1A1A" }}>
            Items Ordered
          </p>
          {items.map((item) => (
            <div key={item.id} className="flex justify-between py-4" style={{ borderBottom: "1px solid rgba(139,26,26,0.06)" }}>
              <div>
                <p className="font-serif font-light" style={{ fontSize: "14px", color: "#111" }}>{item.productName}</p>
                {item.size && (
                  <p className="font-sans" style={{ fontSize: "10px", color: "rgba(17,17,17,0.45)" }}>
                    Size: {item.size} · Qty: {item.quantity}
                  </p>
                )}
              </div>
              <span className="font-sans font-bold" style={{ fontSize: "13px" }}>
                {formatPrice(item.unitPriceInr * item.quantity)}
              </span>
            </div>
          ))}
          <div className="flex justify-between pt-4">
            <span className="font-sans font-bold uppercase tracking-[0.15em]" style={{ fontSize: "10px" }}>Total</span>
            <span className="font-serif font-light" style={{ fontSize: "20px" }}>{formatPrice(order.totalInr)}</span>
          </div>
        </div>

        {/* Shipping address */}
        {address && (
          <div className="mb-10">
            <p className="font-sans font-bold uppercase tracking-[0.22em] mb-3" style={{ fontSize: "9px", color: "#8B1A1A" }}>
              Shipping To
            </p>
            <p className="font-sans" style={{ fontSize: "13px", color: "rgba(17,17,17,0.7)", lineHeight: 1.7 }}>
              {order.shippingName}<br />
              {address.line1}{address.line2 ? `, ${address.line2}` : ""}<br />
              {address.city}, {address.state} — {address.pincode}
            </p>
          </div>
        )}

        <div className="flex flex-col sm:flex-row gap-4">
          <Link
            href="/"
            className="flex-1 text-center font-sans font-bold uppercase tracking-[0.22em] py-4 hover:opacity-80 transition-opacity"
            style={{ fontSize: "10px", backgroundColor: "#8B1A1A", color: "#F4F0E6" }}
          >
            Continue Shopping
          </Link>
          <Link
            href="/collection"
            className="flex-1 text-center font-sans font-bold uppercase tracking-[0.22em] py-4 hover:opacity-50 transition-opacity"
            style={{ fontSize: "10px", border: "1px solid rgba(139,26,26,0.2)", color: "#111" }}
          >
            Browse Collections
          </Link>
        </div>
      </div>

      <EvanliteFooter />
    </main>
  );
}
