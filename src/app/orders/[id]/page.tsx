"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import EvanliteFooter from "@/components/EvanliteFooter";
import FeedbackForm from "@/components/FeedbackForm";
import { PRICE_CLASS, TITLE_CLASS, titleStyle } from "@/lib/typography";

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

interface HistoryEntry {
  fromStatus: string;
  toStatus: string;
  createdAt: string;
}

interface Order {
  id: string;
  status: string;
  totalInr: number;
  discountInr: number;
  shippingName?: string | null;
  shippingEmail?: string | null;
  shippingAddress?: string | null;
  trackingNumber?: string | null;
  trackingCarrier?: string | null;
  trackingUrl?: string | null;
  invoiceNumber?: string | null;
  createdAt: string;
  history?: HistoryEntry[];
}

const STATUS_LABELS: Record<string, string> = {
  pending: "Order Placed",
  confirmed: "Confirmed",
  shipped: "Shipped",
  delivered: "Delivered",
  cancelled: "Cancelled",
};

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
      fetch(`/api/orders/${id}`).then((r) => (r.ok ? r.json() : null)),
      fetch(`/api/orders/${id}/items`).then((r) => (r.ok ? r.json() : [])),
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
      <main className="w-full min-h-screen flex items-center justify-center pt-[var(--site-header-h)]" style={{ backgroundColor: "#FFF9EF" }}>
        <div className="w-[3px] h-10 bg-[#5B1C1C] opacity-60 animate-pulse" />
      </main>
    );
  }

  if (error || !order) {
    return (
      <main className="w-full min-h-screen flex flex-col items-center justify-center pt-[var(--site-header-h)] px-6" style={{ backgroundColor: "#FFF9EF" }}>
        <p className="font-serif font-light text-xl mb-4">Order not found.</p>
        <Link href="/" className="font-sans font-bold uppercase tracking-[0.2em] text-[10px] text-[#5B1C1C] border-b border-[#5B1C1C] pb-1">
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
    <main className="relative w-full min-h-screen flex flex-col pt-[var(--site-header-h)]" style={{ backgroundColor: "#FFF9EF", color: "#1A1212" }}>
      <div className="flex-1 w-full max-w-2xl mx-auto px-6 md:px-12 py-16">
        {/* Confirmation header */}
        <div className="mb-12 text-center">
          <div className="w-[3px] h-12 bg-[#5B1C1C] opacity-70 mx-auto mb-6" />
          <p className="font-sans font-bold uppercase tracking-[0.3em] mb-3" style={{ fontSize: "9px", color: "#5B1C1C" }}>
            NAAMI // ORDER CONFIRMED
          </p>
          <h1 className={`${TITLE_CLASS} mb-4`} style={titleStyle("clamp(2.5rem, 5vw, 4rem)")}>
            Thank you{order.shippingName ? `, ${order.shippingName.split(" ")[0]}` : ""}
          </h1>
          <p className="font-serif mb-4" style={{ fontSize: "1.1rem", color: "#5B1C1C" }}>
            If found Wear again
          </p>
          <p className="font-sans" style={{ fontSize: "13px", color: "rgba(17,17,17,0.55)", lineHeight: 1.7 }}>
            Your order has been received. A confirmation has been sent{order.shippingEmail ? ` to ${order.shippingEmail}` : ""}.
          </p>
        </div>

        {/* Order reference */}
        <div className="mb-8 px-8 py-6" style={{ backgroundColor: "#F8F1E5", borderLeft: "3px solid #5B1C1C" }}>
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <p className="font-sans font-bold uppercase tracking-[0.2em] mb-2" style={{ fontSize: "8px", color: "#5B1C1C" }}>
                Order Reference
              </p>
              <p className="font-serif font-light" style={{ fontSize: "1.5rem", color: "#111" }}>{order.id}</p>
              <p className="font-sans mt-2" style={{ fontSize: "11px", color: "rgba(17,17,17,0.45)" }}>
                {new Date(order.createdAt).toLocaleDateString("en-IN", { year: "numeric", month: "long", day: "numeric" })}
              </p>
            </div>
            <div className="text-right">
              <p className="font-sans font-bold uppercase tracking-[0.2em] mb-2" style={{ fontSize: "8px", color: "#5B1C1C" }}>
                Status
              </p>
              <p className="font-sans font-bold uppercase tracking-[0.15em]" style={{ fontSize: "11px", color: "#111" }}>
                {STATUS_LABELS[order.status] ?? order.status}
              </p>
            </div>
          </div>
        </div>

        {/* Status timeline */}
        {order.history && order.history.length > 0 && (
          <div className="mb-8">
            <p className="font-sans font-bold uppercase tracking-[0.22em] mb-4" style={{ fontSize: "9px", color: "#5B1C1C" }}>
              Order Journey
            </p>
            <div style={{ borderLeft: "2px solid rgba(139,26,26,0.2)", paddingLeft: 18 }}>
              {[...order.history].reverse().map((h, i) => (
                <div key={i} className="mb-4 relative">
                  <div
                    className="absolute rounded-full"
                    style={{ width: 8, height: 8, backgroundColor: "#5B1C1C", left: -23, top: 4 }}
                  />
                  <p className="font-sans font-bold uppercase tracking-[0.12em]" style={{ fontSize: "10px", color: "#111" }}>
                    {STATUS_LABELS[h.toStatus] ?? h.toStatus}
                  </p>
                  <p className="font-sans" style={{ fontSize: "10px", color: "rgba(17,17,17,0.45)" }}>
                    {new Date(h.createdAt).toLocaleString("en-IN", { timeZone: "Asia/Kolkata", dateStyle: "medium", timeStyle: "short" })}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tracking */}
        {order.trackingNumber && (
          <div className="mb-8 px-8 py-6" style={{ backgroundColor: "#F8F1E5" }}>
            <p className="font-sans font-bold uppercase tracking-[0.2em] mb-2" style={{ fontSize: "8px", color: "#5B1C1C" }}>
              Shipment Tracking
            </p>
            <p className="font-serif font-light" style={{ fontSize: "1.1rem", color: "#111" }}>{order.trackingNumber}</p>
            {order.trackingCarrier && (
              <p className="font-sans mt-1" style={{ fontSize: "11px", color: "rgba(17,17,17,0.5)" }}>via {order.trackingCarrier}</p>
            )}
            {order.trackingUrl && (
              <a
                href={order.trackingUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-block mt-3 font-sans font-bold uppercase tracking-[0.2em] py-3 px-6 hover:opacity-80 transition-opacity"
                style={{ fontSize: "9px", backgroundColor: "#5B1C1C", color: "#FFF9EF" }}
              >
                Track Shipment →
              </a>
            )}
          </div>
        )}

        {/* Items */}
        <div className="mb-8">
          <p className="font-sans font-bold uppercase tracking-[0.22em] mb-4" style={{ fontSize: "9px", color: "#5B1C1C" }}>
            Items Ordered
          </p>
          {items.map((item) => (
            <div key={item.id} className="flex justify-between py-4" style={{ borderBottom: "1px solid rgba(139,26,26,0.06)" }}>
              <div>
                <p className="font-sans font-light" style={{ fontSize: "14px", color: "#111" }}>{item.productName}</p>
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
            <span className={PRICE_CLASS} style={{ fontSize: "20px" }}>{formatPrice(order.totalInr)}</span>
          </div>
        </div>

        {/* Post-purchase brand feedback */}
        {order.status === "delivered" && <FeedbackForm orderId={order.id} />}

        {/* Shipping address */}
        {address && (
          <div className="mb-10">
            <p className="font-sans font-bold uppercase tracking-[0.22em] mb-3" style={{ fontSize: "9px", color: "#5B1C1C" }}>
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
            style={{ fontSize: "10px", backgroundColor: "#5B1C1C", color: "#FFF9EF" }}
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
