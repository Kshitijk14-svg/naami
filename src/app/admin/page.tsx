"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Role, ROLE_LABELS } from "@/models/roles";

interface SessionData {
  authenticated: boolean;
  name?: string;
  role?: Role;
}

interface Tile {
  label: string;
  href: string;
  description: string;
  roles: Role[];
}

const TILES: Tile[] = [
  { label: "Analytics",   href: "/admin/analytics",   description: "Revenue trends, order counts, and top-selling products.",     roles: ["admin", "super_admin"] },
  { label: "Products",    href: "/admin/products",    description: "Create, edit, and remove products from the atelier.",          roles: ["admin", "super_admin"] },
  { label: "Collections", href: "/admin/collections", description: "Curate and publish editorial collections.",                    roles: ["admin", "super_admin"] },
  { label: "Categories",  href: "/admin/categories",  description: "Manage the product taxonomy and navigation labels.",           roles: ["admin", "super_admin"] },
  { label: "Coupons",     href: "/admin/coupons",     description: "Issue discount codes and manage promotional campaigns.",       roles: ["admin", "super_admin"] },
  { label: "Orders",      href: "/admin/orders",      description: "View and update the status of all customer orders.",           roles: ["staff", "admin", "super_admin"] },
];

export default function AdminPage() {
  const [session, setSession] = useState<SessionData | null>(null);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((data: SessionData) => setSession(data))
      .catch(() => {});
  }, []);

  const role = session?.role;
  const tiles = role ? TILES.filter((t) => t.roles.includes(role)) : [];

  return (
    <div>
      {/* Heading */}
      <div className="mb-12">
        <span
          className="font-sans font-bold uppercase tracking-[0.3em] mb-3 block"
          style={{ fontSize: "9px", color: "#8B1A1A" }}
        >
          NAAMI // ATELIER ADMIN
        </span>
        <h1
          className="font-serif font-light uppercase"
          style={{
            fontSize: "clamp(1.8rem, 3.5vw, 2.8rem)",
            color: "#111111",
            lineHeight: 1.1,
            letterSpacing: "0.02em",
          }}
        >
          Welcome,{" "}
          <span style={{ color: "#8B1A1A", fontStyle: "italic" }}>
            {role ? ROLE_LABELS[role] : "…"}
          </span>
        </h1>
      </div>

      {/* Tile grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {tiles.map((tile) => (
          <Link
            key={tile.href}
            href={tile.href}
            className="group block border transition-all duration-200 hover:border-[rgba(139,26,26,0.3)]"
            style={{
              backgroundColor: "#EDE8DC",
              borderColor: "rgba(17,17,17,0.06)",
              padding: "28px 28px",
              textDecoration: "none",
            }}
          >
            <div
              className="w-[3px] mb-5"
              style={{ height: 24, backgroundColor: "#8B1A1A", opacity: 0.7 }}
            />
            <h3
              className="font-serif font-light uppercase mb-2 group-hover:text-[#8B1A1A] transition-colors"
              style={{ fontSize: "1.15rem", color: "#111111", letterSpacing: "0.03em" }}
            >
              {tile.label}
            </h3>
            <p
              className="font-sans mb-5"
              style={{ fontSize: "12px", color: "rgba(17,17,17,0.55)", lineHeight: 1.6 }}
            >
              {tile.description}
            </p>
            <span
              className="font-sans font-bold uppercase tracking-widest group-hover:text-[#8B1A1A] transition-colors"
              style={{ fontSize: "8.5px", color: "#111111", borderBottom: "1px solid currentColor", paddingBottom: 2 }}
            >
              Enter →
            </span>
          </Link>
        ))}
      </div>

      {/* Footer rule */}
      <div
        className="mt-14"
        style={{
          height: 1,
          background: "linear-gradient(to right, #8B1A1A 2px, rgba(17,17,17,0.08) 2px, transparent)",
        }}
      />
    </div>
  );
}
