"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Role } from "@/models/roles";

interface NavItem {
  label: string;
  href: string;
  roles: Role[];
}

const NAV_ITEMS: NavItem[] = [
  { label: "Dashboard",   href: "/admin",              roles: ["staff", "admin", "super_admin"] },
  { label: "Analytics",   href: "/admin/analytics",    roles: ["admin", "super_admin"] },
  { label: "Products",    href: "/admin/products",     roles: ["admin", "super_admin"] },
  { label: "Collections", href: "/admin/collections",  roles: ["admin", "super_admin"] },
  { label: "Categories",  href: "/admin/categories",   roles: ["admin", "super_admin"] },
  { label: "Coupons",     href: "/admin/coupons",      roles: ["admin", "super_admin"] },
  { label: "Orders",      href: "/admin/orders",       roles: ["staff", "admin", "super_admin"] },
];

interface Props {
  role: Role;
}

export function AdminSidebar({ role }: Props) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  const items = NAV_ITEMS.filter((item) => item.roles.includes(role));

  const isActive = (href: string) =>
    href === "/admin" ? pathname === "/admin" : pathname.startsWith(href);

  const navLinks = items.map((item) => (
    <Link
      key={item.href}
      href={item.href}
      onClick={() => setOpen(false)}
      className="block font-sans font-bold uppercase transition-all hover:opacity-60"
      style={{
        fontSize: "9px",
        letterSpacing: "0.22em",
        padding: "10px 20px",
        color: isActive(item.href) ? "#8B1A1A" : "#111111",
        borderLeft: isActive(item.href) ? "2px solid #8B1A1A" : "2px solid transparent",
        backgroundColor: isActive(item.href) ? "rgba(139,26,26,0.04)" : "transparent",
      }}
    >
      {item.label}
    </Link>
  ));

  return (
    <>
      {/* Desktop sidebar */}
      <aside
        className="hidden md:flex flex-col h-full flex-shrink-0"
        style={{
          width: 200,
          backgroundColor: "#EDE8DC",
          borderRight: "1px solid rgba(17,17,17,0.08)",
        }}
      >
        <nav className="flex-1 pt-4">{navLinks}</nav>
        <p
          className="font-sans text-center"
          style={{ fontSize: "8px", letterSpacing: "0.14em", color: "rgba(17,17,17,0.3)", padding: "16px" }}
        >
          NAAMI ATELIER · {new Date().getFullYear()}
        </p>
      </aside>

      {/* Mobile hamburger */}
      <div className="md:hidden">
        <button
          onClick={() => setOpen(true)}
          className="fixed font-bold"
          style={{
            top: 20,
            right: 16,
            zIndex: 60,
            fontSize: "18px",
            color: "#111111",
            cursor: "pointer",
            backgroundColor: "#EDE8DC",
            border: "1px solid rgba(17,17,17,0.1)",
            padding: "4px 8px",
            lineHeight: 1,
          }}
        >
          ☰
        </button>

        {open && (
          <>
            <div
              className="fixed inset-0"
              style={{ backgroundColor: "rgba(17,17,17,0.5)", zIndex: 70 }}
              onClick={() => setOpen(false)}
            />
            <div
              className="fixed top-0 left-0 h-full flex flex-col"
              style={{ width: 220, backgroundColor: "#EDE8DC", zIndex: 80, padding: "24px 0" }}
            >
              <button
                onClick={() => setOpen(false)}
                style={{ alignSelf: "flex-end", marginRight: 16, marginBottom: 16, fontSize: "18px", cursor: "pointer" }}
              >
                ×
              </button>
              <nav>{navLinks}</nav>
            </div>
          </>
        )}
      </div>
    </>
  );
}
