"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { Role, ROLE_LABELS } from "@/models/roles";
import { formatINR } from "@/lib/format";
import EvanliteFooter from "@/components/EvanliteFooter";
import { PRICE_CLASS, PRODUCT_NAME_CLASS, TITLE_CLASS, titleStyle } from "@/lib/typography";

type Tab = "profile" | "orders" | "wishlist";

interface SessionData {
  authenticated: boolean;
  email?: string;
  name?: string;
  role?: Role;
}

interface Order {
  id: string;
  status: string;
  totalInr: number;
  createdAt: string;
}

interface WishlistItem {
  productId: number;
  name: string;
  image: string;
  priceInr: number;
  price: string;
  number: string;
}

export default function ProfilePage() {
  const router = useRouter();
  const [session, setSession] = useState<SessionData | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>("profile");
  const [orders, setOrders] = useState<Order[]>([]);
  const [wishlist, setWishlist] = useState<WishlistItem[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [wishlistLoading, setWishlistLoading] = useState(false);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((data: SessionData) => {
        if (!data.authenticated) {
          router.replace("/auth?from=/profile");
        } else {
          setSession(data);
        }
      })
      .catch(() => router.replace("/auth?from=/profile"));
  }, [router]);

  useEffect(() => {
    if (activeTab === "orders" && orders.length === 0) {
      setOrdersLoading(true);
      fetch("/api/orders")
        .then((r) => r.json())
        .then((data: Order[]) => { setOrders(data); setOrdersLoading(false); })
        .catch(() => setOrdersLoading(false));
    }
    if (activeTab === "wishlist" && wishlist.length === 0) {
      setWishlistLoading(true);
      fetch("/api/wishlist")
        .then((r) => r.json())
        .then((data: WishlistItem[]) => { setWishlist(data); setWishlistLoading(false); })
        .catch(() => setWishlistLoading(false));
    }
  }, [activeTab, orders.length, wishlist.length]);

  const removeFromWishlist = async (productId: number) => {
    await fetch(`/api/wishlist/${productId}`, { method: "DELETE" });
    setWishlist((prev) => prev.filter((i) => i.productId !== productId));
  };

  if (!session) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: "#FFF9EF" }}>
        <div className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ backgroundColor: "#5B1C1C" }} />
      </div>
    );
  }

  const tabs: { id: Tab; label: string }[] = [
    { id: "profile", label: "Profile" },
    { id: "orders", label: "Order History" },
    { id: "wishlist", label: "Wishlist" },
  ];

  // Brand-palette status treatment (matches orders/[id]'s STATUS_LABELS
  // styling) — cancelled reads in brand maroon, everything else in ecru,
  // rather than the arbitrary web-safe colors this used to use.
  const STATUS_COLORS: Record<string, string> = {
    pending: "#1A1212",
    confirmed: "#1A1212",
    shipped: "#1A1212",
    delivered: "#1A1212",
    cancelled: "#5B1C1C",
  };

  return (
    <main
      className="relative w-full min-h-screen flex flex-col"
      style={{ backgroundColor: "#FFF9EF", color: "#1A1212" }}
    >
      {/* Header */}
      <div
        className="w-full pb-10 px-6 md:px-12"
        style={{ borderBottom: "1px solid rgba(17,17,17,0.06)", paddingTop: "calc(var(--site-header-h) + 2rem)" }}
      >
        <div className="max-w-4xl mx-auto">
          <span
            className="font-sans font-bold uppercase tracking-[0.3em] mb-3 block"
            style={{ fontSize: "9px", color: "#5B1C1C" }}
          >
            NAAMI // MY ACCOUNT
          </span>
          <h1 className={`${TITLE_CLASS} mb-2`} style={titleStyle("clamp(2.5rem, 5vw, 4rem)")}>
            {session.name ?? session.email?.split("@")[0]}
          </h1>
          <p className="font-sans" style={{ fontSize: "11px", color: "rgba(17,17,17,0.5)" }}>
            {session.email}
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="w-full px-6 md:px-12 pt-8">
        <div className="max-w-4xl mx-auto">
          <div className="flex gap-0 border-b border-black/8 mb-10">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className="font-sans font-bold uppercase tracking-[0.18em] pb-4 mr-8 transition-all"
                style={{
                  fontSize: "9px",
                  color: activeTab === tab.id ? "#5B1C1C" : "rgba(17,17,17,0.45)",
                  borderTopStyle: "none",
                  borderLeftStyle: "none",
                  borderRightStyle: "none",
                  borderBottomStyle: "solid",
                  borderBottomWidth: "2px",
                  borderBottomColor: activeTab === tab.id ? "#5B1C1C" : "transparent",
                  background: "none",
                  cursor: "pointer",
                  paddingBottom: "16px",
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* ── Profile Tab ────────────────────────────────── */}
          {activeTab === "profile" && (
            <div className="pb-16">
              {[
                ["Name", session.name ?? "—"],
                ["Email", session.email ?? "—"],
                ["Role", ROLE_LABELS[session.role!]],
              ].map(([label, value]) => (
                <div
                  key={label}
                  className="flex justify-between py-4"
                  style={{ borderBottom: "1px solid rgba(17,17,17,0.06)" }}
                >
                  <span
                    className="font-sans font-bold uppercase tracking-[0.15em]"
                    style={{ fontSize: "9px", color: "rgba(17,17,17,0.4)" }}
                  >
                    {label}
                  </span>
                  <span className="font-sans" style={{ fontSize: "13px", color: "#1A1212" }}>
                    {value}
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* ── Order History Tab ───────────────────────────── */}
          {activeTab === "orders" && (
            <div className="pb-16">
              {ordersLoading && (
                <div className="flex justify-center py-12">
                  <div className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ backgroundColor: "#5B1C1C" }} />
                </div>
              )}
              {!ordersLoading && orders.length === 0 && (
                <div className="py-12 text-center">
                  <p className="font-serif font-light" style={{ fontSize: "1.25rem", color: "rgba(17,17,17,0.5)" }}>
                    No orders yet.
                  </p>
                  <Link
                    href="/"
                    className="inline-block mt-4 font-sans font-bold uppercase tracking-[0.2em] text-[9px] text-[#5B1C1C] border-b border-[#5B1C1C] pb-0.5"
                  >
                    Shop the Collection →
                  </Link>
                </div>
              )}
              {orders.map((order) => (
                <Link
                  key={order.id}
                  href={`/orders/${order.id}`}
                  className="flex items-center justify-between py-4 hover:bg-[#F8F1E5] transition-colors px-2 -mx-2"
                  style={{ borderBottom: "1px solid rgba(17,17,17,0.06)" }}
                >
                  <div>
                    <p className="font-sans font-bold uppercase" style={{ fontSize: "11px", color: "#1A1212", letterSpacing: "0.1em" }}>
                      {order.id}
                    </p>
                    <p className="font-sans mt-0.5" style={{ fontSize: "10px", color: "rgba(17,17,17,0.45)" }}>
                      {new Date(order.createdAt).toLocaleDateString("en-IN", { year: "numeric", month: "short", day: "numeric" })}
                    </p>
                  </div>
                  <div className="flex items-center gap-6">
                    <span
                      className="font-sans font-bold uppercase"
                      style={{
                        fontSize: "8px",
                        letterSpacing: "0.15em",
                        color: STATUS_COLORS[order.status] ?? "#1A1212",
                        backgroundColor: `${STATUS_COLORS[order.status] ?? "#1A1212"}14`,
                        padding: "3px 8px",
                      }}
                    >
                      {order.status}
                    </span>
                    <span className={PRICE_CLASS} style={{ fontSize: "1.1rem", color: "#1A1212" }}>
                      {formatINR(order.totalInr)}
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          )}

          {/* ── Wishlist Tab ────────────────────────────────── */}
          {activeTab === "wishlist" && (
            <div className="pb-16">
              {wishlistLoading && (
                <div className="flex justify-center py-12">
                  <div className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ backgroundColor: "#5B1C1C" }} />
                </div>
              )}
              {!wishlistLoading && wishlist.length === 0 && (
                <div className="py-12 text-center">
                  <p className="font-serif font-light" style={{ fontSize: "1.25rem", color: "rgba(17,17,17,0.5)" }}>
                    Your wishlist is empty.
                  </p>
                  <Link
                    href="/"
                    className="inline-block mt-4 font-sans font-bold uppercase tracking-[0.2em] text-[9px] text-[#5B1C1C] border-b border-[#5B1C1C] pb-0.5"
                  >
                    Discover the Atelier →
                  </Link>
                </div>
              )}
              <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
                {wishlist.map((item) => (
                  <div key={item.productId} className="group relative flex flex-col">
                    <Link href={`/product/${item.productId}`} className="block">
                      <div
                        className="relative overflow-hidden w-full border border-black/5 bg-[#F8F1E5]"
                        style={{ aspectRatio: "3/4" }}
                      >
                        <Image
                          src={item.image}
                          alt={item.name}
                          fill
                          className="object-cover"
                          style={{ filter: "brightness(0.94)" }}
                          sizes="(max-width: 768px) 50vw, 33vw"
                        />
                        <div
                          className="absolute top-0 left-0 bottom-0"
                          style={{ width: "3px", backgroundColor: "#5B1C1C", opacity: 0.8 }}
                        />
                      </div>
                      <div className="pt-3">
                        <p
                          className="font-sans font-bold uppercase tracking-[0.1em] mb-1"
                          style={{ fontSize: "9px", color: "rgba(17,17,17,0.4)" }}
                        >
                          {item.number}
                        </p>
                        <p
                          className={`${PRODUCT_NAME_CLASS} mb-1 group-hover:text-[#5B1C1C] transition-colors`}
                          style={{ fontSize: "1rem", color: "#1A1212" }}
                        >
                          {item.name}
                        </p>
                        <p className={PRICE_CLASS} style={{ fontSize: "1rem", color: "#1A1212", opacity: 0.7 }}>
                          {item.price}
                        </p>
                      </div>
                    </Link>
                    <button
                      onClick={() => removeFromWishlist(item.productId)}
                      className="mt-2 font-sans font-bold uppercase tracking-[0.15em] hover:text-[#5B1C1C] transition-colors self-start"
                      style={{ fontSize: "8px", color: "rgba(17,17,17,0.4)", background: "none", border: "none", cursor: "pointer" }}
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      <EvanliteFooter />
    </main>
  );
}
