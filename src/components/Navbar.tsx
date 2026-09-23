"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import gsap from "gsap";
import { useCartStore } from "@/models/cartStore";
import { Role } from "@/models/roles";
import NavSearch from "@/components/NavSearch";
import ProfileDropdown from "@/components/ProfileDropdown";
import MobileMenu from "@/components/MobileMenu";
import { useWishlistStore } from "@/models/wishlistStore";

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
  const [session, setSession] = useState<SessionData | null>(null);
  const resetWishlist = useWishlistStore((s) => s.reset);
  const [menuOpen, setMenuOpen] = useState(false);

  // Refetch on every pathname change — Navbar is mounted once in the root
  // layout and never remounts on client-side navigation, so this is what
  // picks up a session change right after login's router.push().
  useEffect(() => {
    fetch("/api/auth/me")
      .then((res) => (res.ok ? res.json() : { authenticated: false }))
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
    try {
      const res = await fetch("/api/auth/signout", { method: "POST" });
      // Showing "signed out" while the cookie is still live is worse than
      // saying nothing happened, so only tear down the UI if it really did.
      if (!res.ok) return;
    } catch {
      return;
    }
    setSession({ authenticated: false });
    resetWishlist();
    router.push("/");
    router.refresh();
  };

  return (
    <>
    <header
      ref={navbarRef}
      className="w-full h-20 flex items-center gap-6 px-6 md:px-12"
      style={{
        backgroundColor: "rgba(244, 240, 230, 0.9)",
        backdropFilter: "blur(8px)",
        borderBottom: "1px solid rgba(139, 26, 26, 0.08)",
        opacity: 0,
      }}
    >
      {/* Brand wordmark */}
      <Link
        href="/"
        aria-label="naami — home"
        className="hover:opacity-75 transition-opacity flex-shrink-0 flex items-center"
        data-cursor-text={pathname.startsWith("/product/") ? "BACK" : "HOME"}
      >
        <Image
          src="/images/naami-wordmark.png"
          alt="naami"
          width={415}
          height={295}
          priority
          style={{ height: "1.9rem", width: "auto", display: "block" }}
        />
      </Link>

      {/* Search bar — grows to fill middle space */}
      <NavSearch />

      {/* Navigation links — right side */}
      <nav className="flex items-center gap-6 ml-auto flex-shrink-0">
        <Link
          href="/"
          className="hidden md:block hover:opacity-50 transition-opacity font-sans font-bold uppercase tracking-[0.2em] text-[10px]"
          style={{ color: "#1A1212" }}
          data-cursor-text="HOME"
        >
          Home
        </Link>
        <Link
          href="/collection"
          className="hidden md:block hover:opacity-50 transition-opacity font-sans font-bold uppercase tracking-[0.2em] text-[10px]"
          style={{ color: "#1A1212" }}
          data-cursor-text="VIEW"
        >
          Collections
        </Link>
        <Link
          href="/about"
          className="hidden md:block hover:opacity-50 transition-opacity font-sans font-bold uppercase tracking-[0.2em] text-[10px]"
          style={{ color: "#1A1212" }}
          data-cursor-text="READ"
        >
          About
        </Link>
        <Link
          href="/our-journey"
          className="hidden md:block hover:opacity-50 transition-opacity font-sans font-bold uppercase tracking-[0.2em] text-[10px]"
          style={{ color: "#1A1212" }}
          data-cursor-text="READ"
        >
          Our Journey
        </Link>
        <Link
          href="/contact"
          className="hidden md:block hover:opacity-50 transition-opacity font-sans font-bold uppercase tracking-[0.2em] text-[10px]"
          style={{ color: "#1A1212" }}
          data-cursor-text="READ"
        >
          Contact
        </Link>

        {/* Auth: profile dropdown when signed in, sign-in link when not */}
        {session?.authenticated ? (
          <ProfileDropdown session={session} onSignOut={handleSignOut} />
        ) : (
          <Link
            href="/auth"
            className="hidden md:block hover:opacity-50 transition-opacity font-sans font-bold uppercase tracking-[0.2em] text-[10px]"
            style={{ color: "#1A1212" }}
            data-cursor-text="ENTER"
          >
            Sign In
          </Link>
        )}

        {pathname.startsWith("/product/") && (
          <span className="hidden md:block opacity-20">|</span>
        )}

        {/* Cart */}
        <Link
          href="/cart"
          className="hidden md:flex items-center gap-2 hover:opacity-55 transition-opacity font-sans font-bold uppercase tracking-[0.2em] text-[10px]"
          style={{ color: "#1A1212" }}
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
                backgroundColor: "#5B1C1C",
                color: "#FFF9EF",
              }}
            >
              {cartItemsCount}
            </span>
          )}
        </Link>

        {/* Hamburger — mobile only */}
        <button
          onClick={() => setMenuOpen(true)}
          aria-label="Open menu"
          className="md:hidden flex items-center justify-center hover:opacity-60 transition-opacity"
          style={{ color: "#1A1212", width: 24, height: 24 }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <line x1="3" y1="6" x2="21" y2="6" />
            <line x1="3" y1="12" x2="21" y2="12" />
            <line x1="3" y1="18" x2="21" y2="18" />
          </svg>
        </button>
      </nav>
    </header>

      <MobileMenu
        open={menuOpen}
        onClose={() => setMenuOpen(false)}
        session={session}
        onSignOut={handleSignOut}
        cartItemsCount={cartItemsCount}
      />
    </>
  );
}
