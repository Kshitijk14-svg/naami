"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import gsap from "gsap";
import { useCartStore } from "@/models/cartStore";
import { Role } from "@/models/roles";
import NavSearch from "@/components/NavSearch";
import ProfileDropdown from "@/components/ProfileDropdown";
import MobileMenu from "@/components/MobileMenu";

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
  const [menuOpen, setMenuOpen] = useState(false);

  // Fetch auth state once on mount. We skip re-fetching on every pathname
  // change — the signout handler already updates state directly, and signing
  // in navigates to a new page which re-mounts the Navbar.
  useEffect(() => {
    fetch("/api/auth/me")
      .then((res) => (res.ok ? res.json() : { authenticated: false }))
      .then((data: SessionData) => setSession(data))
      .catch(() => setSession({ authenticated: false }));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

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
        className="font-wordmark lowercase font-bold hover:opacity-75 transition-opacity flex-shrink-0"
        style={{ fontSize: "1.6rem", letterSpacing: "0.18em", color: "#5B1C1C" }}
        data-cursor-text={pathname.startsWith("/product/") ? "BACK" : "HOME"}
      >
        naami
      </Link>

      {/* Search bar — grows to fill middle space */}
      <NavSearch />

      {/* Navigation links — right side */}
      <nav className="flex items-center gap-6 ml-auto flex-shrink-0">
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
          href="/journal"
          className="hidden md:block hover:opacity-50 transition-opacity font-sans font-bold uppercase tracking-[0.2em] text-[10px]"
          style={{ color: "#1A1212" }}
          data-cursor-text="READ"
        >
          Journal
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
          className="flex items-center gap-2 hover:opacity-55 transition-opacity font-sans font-bold uppercase tracking-[0.2em] text-[10px]"
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
