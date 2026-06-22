"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import gsap from "gsap";
import { useCartStore } from "@/models/cartStore";
import { Role } from "@/models/roles";
import NavSearch from "@/components/NavSearch";
import ProfileDropdown from "@/components/ProfileDropdown";

interface SessionData {
  authenticated: boolean;
  email?: string;
  name?: string;
  role?: Role;
}

export default function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const navbarRef = useRef<HTMLElement>(null);
  const cartItemsCount = useCartStore((state) => state.cartItemsCount);
  const incrementItems = useCartStore((state) => state.incrementItems);
  const [session, setSession] = useState<SessionData | null>(null);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((res) => {
        if (res.ok) return res.json();
        return { authenticated: false };
      })
      .then((data: SessionData) => setSession(data))
      .catch(() => setSession({ authenticated: false }));
  }, [pathname]);

  useEffect(() => {
    if (!navbarRef.current) return;
    gsap.killTweensOf(navbarRef.current);

    if (pathname === "/") {
      gsap.fromTo(
        navbarRef.current,
        { opacity: 0, y: -10 },
        { opacity: 1, y: 0, duration: 0.7, ease: "power2.out", delay: 3.4 }
      );
    } else {
      gsap.fromTo(
        navbarRef.current,
        { opacity: 0, y: -12 },
        { opacity: 1, y: 0, duration: 0.8, ease: "power2.out", delay: 0.1 }
      );
    }
  }, [pathname]);

  // Hide on auth and all admin sub-pages (admin provides its own chrome)
  if (pathname === "/auth" || pathname.startsWith("/admin")) {
    return null;
  }

  const handleSignOut = async () => {
    await fetch("/api/auth/signout", { method: "POST" });
    setSession({ authenticated: false });
    router.push("/");
    router.refresh();
  };

  return (
    <header
      ref={navbarRef}
      className="fixed top-0 left-0 right-0 h-20 flex items-center gap-6 px-6 md:px-12"
      style={{
        zIndex: 40,
        backgroundColor: "rgba(244, 240, 230, 0.9)",
        backdropFilter: "blur(8px)",
        borderBottom: "1px solid rgba(139, 26, 26, 0.08)",
        opacity: 0,
      }}
    >
      {/* Brand wordmark */}
      <Link
        href="/"
        className="font-serif uppercase font-semibold hover:opacity-75 transition-opacity flex-shrink-0"
        style={{ fontSize: "1.15rem", letterSpacing: "0.18em", color: "#8B1A1A" }}
        data-cursor-text={pathname.startsWith("/product/") ? "BACK" : "HOME"}
      >
        Naami
      </Link>

      {/* Search bar — grows to fill middle space */}
      <NavSearch />

      {/* Navigation links — right side */}
      <nav className="flex items-center gap-6 ml-auto flex-shrink-0">
        <Link
          href="/collection"
          className="hidden md:block hover:opacity-50 transition-opacity font-sans font-bold uppercase tracking-[0.2em] text-[10px]"
          style={{ color: "#111111" }}
          data-cursor-text="VIEW"
        >
          Collections
        </Link>
        <Link
          href="/about"
          className="hidden md:block hover:opacity-50 transition-opacity font-sans font-bold uppercase tracking-[0.2em] text-[10px]"
          style={{ color: "#111111" }}
          data-cursor-text="READ"
        >
          About
        </Link>

        {/* Auth: profile dropdown when signed in, sign-in link when not */}
        {session?.authenticated ? (
          <ProfileDropdown session={session} onSignOut={handleSignOut} />
        ) : (
          <Link
            href="/auth"
            className="hidden md:block hover:opacity-50 transition-opacity font-sans font-bold uppercase tracking-[0.2em] text-[10px]"
            style={{ color: "#111111" }}
            data-cursor-text="ENTER"
          >
            Sign In
          </Link>
        )}

        {pathname.startsWith("/product/") && (
          <span className="hidden md:block opacity-20">|</span>
        )}

        {/* Cart */}
        <button
          onClick={incrementItems}
          className="flex items-center gap-2 hover:opacity-55 transition-opacity font-sans font-bold uppercase tracking-[0.2em] cursor-pointer text-[10px]"
          style={{ color: "#111111" }}
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
  );
}
