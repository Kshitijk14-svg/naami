"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import gsap from "gsap";
import NavSearch from "@/components/NavSearch";
import { Role, ROLE_LABELS } from "@/models/roles";

interface SessionData {
  authenticated: boolean;
  email?: string;
  name?: string;
  role?: Role;
}

interface Props {
  open: boolean;
  onClose: () => void;
  session: SessionData | null;
  onSignOut: () => void;
  cartItemsCount: number;
}

const ADMIN_ROLES: Role[] = ["staff", "admin", "super_admin"];

const LINK_CLASS =
  "flex items-center justify-between font-sans font-bold uppercase tracking-[0.2em] text-[11px] py-4";

export default function MobileMenu({ open, onClose, session, onSignOut, cartItemsCount }: Props) {
  // Keep the drawer mounted through its closing tween, then unmount.
  const [render, setRender] = useState(open);
  const scrimRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  // Adjust during render (not in an effect) so the panel mounts the same frame
  // it's opened.
  if (open && !render) setRender(true);

  useEffect(() => {
    if (!render) return;
    const scrim = scrimRef.current;
    const panel = panelRef.current;
    if (!scrim || !panel) return;

    const reduced =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    gsap.killTweensOf([scrim, panel]);

    if (open) {
      document.body.style.overflow = "hidden";
      if (reduced) {
        gsap.set(scrim, { opacity: 1 });
        gsap.set(panel, { x: 0 });
        return;
      }
      gsap.set(scrim, { opacity: 0 });
      gsap.set(panel, { x: "100%" });
      gsap.to(scrim, { opacity: 1, duration: 0.3, ease: "power2.out" });
      gsap.to(panel, { x: 0, duration: 0.4, ease: "power3.out" });
      return;
    }

    // Closing
    const finish = () => {
      document.body.style.overflow = "";
      setRender(false);
    };
    if (reduced) {
      finish();
      return;
    }
    gsap.to(scrim, { opacity: 0, duration: 0.25, ease: "power2.in" });
    gsap.to(panel, { x: "100%", duration: 0.3, ease: "power3.in", onComplete: finish });
  }, [open, render]);

  // Restore scroll if unmounted mid-animation
  useEffect(() => {
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  // Escape to close
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!render) return null;

  const isAdmin = session?.role ? ADMIN_ROLES.includes(session.role) : false;

  return (
    <div className="md:hidden fixed inset-0" style={{ zIndex: 55 }}>
      {/* Scrim */}
      <div
        ref={scrimRef}
        className="absolute inset-0"
        style={{ backgroundColor: "rgba(17,17,17,0.5)" }}
        onClick={onClose}
      />

      {/* Panel */}
      <div
        ref={panelRef}
        className="absolute top-0 right-0 flex flex-col"
        style={{
          width: "min(80vw, 320px)",
          height: "100dvh",
          backgroundColor: "#F4F0E6",
          zIndex: 56,
          boxShadow: "-8px 0 32px rgba(17,17,17,0.14)",
        }}
      >
        {/* Header row */}
        <div
          className="flex items-center justify-between px-6 h-20 flex-shrink-0"
          style={{ borderBottom: "1px solid rgba(17,17,17,0.08)" }}
        >
          <span
            className="font-sans font-bold uppercase tracking-[0.25em] text-[9px]"
            style={{ color: "rgba(17,17,17,0.4)" }}
          >
            Menu
          </span>
          <button
            onClick={onClose}
            aria-label="Close menu"
            className="hover:opacity-60 transition-opacity"
            style={{ color: "#1A1212", fontSize: "18px", lineHeight: 1 }}
          >
            ✕
          </button>
        </div>

        <div className="flex-1 overflow-y-auto scrollbar-none px-6 pt-6 pb-10">
          <NavSearch variant="drawer" />

          <nav className="mt-4 flex flex-col">
            <Link href="/" onClick={onClose} className={LINK_CLASS} style={{ color: "#1A1212", borderBottom: "1px solid rgba(17,17,17,0.08)" }}>
              Home
            </Link>
            <Link href="/collection" onClick={onClose} className={LINK_CLASS} style={{ color: "#1A1212", borderBottom: "1px solid rgba(17,17,17,0.08)" }}>
              Collections
            </Link>
            <Link href="/about" onClick={onClose} className={LINK_CLASS} style={{ color: "#1A1212", borderBottom: "1px solid rgba(17,17,17,0.08)" }}>
              About
            </Link>
            <Link href="/journal" onClick={onClose} className={LINK_CLASS} style={{ color: "#1A1212", borderBottom: "1px solid rgba(17,17,17,0.08)" }}>
              Journal
            </Link>
            <Link href="/cart" onClick={onClose} className={LINK_CLASS} style={{ color: "#1A1212", borderBottom: "1px solid rgba(17,17,17,0.08)" }}>
              <span>Cart</span>
              {cartItemsCount > 0 && (
                <span
                  className="flex items-center justify-center rounded-full font-bold"
                  style={{ width: 16, height: 16, fontSize: "8px", backgroundColor: "#5B1C1C", color: "#FFF9EF" }}
                >
                  {cartItemsCount}
                </span>
              )}
            </Link>
          </nav>

          {/* Auth block */}
          <div className="mt-8">
            {session?.authenticated ? (
              <>
                <p className="font-serif" style={{ fontSize: "1rem", color: "#1A1212", lineHeight: 1.3 }}>
                  {session.name ?? "Guest"}
                </p>
                {session.email && (
                  <p className="font-sans mt-0.5" style={{ fontSize: "11px", color: "rgba(17,17,17,0.5)" }}>
                    {session.email}
                  </p>
                )}
                {session.role && (
                  <span
                    className="inline-block mt-2 font-sans font-bold uppercase"
                    style={{
                      fontSize: "8px",
                      letterSpacing: "0.18em",
                      color: "#5B1C1C",
                      backgroundColor: "rgba(139,26,26,0.08)",
                      padding: "3px 7px",
                    }}
                  >
                    {ROLE_LABELS[session.role]}
                  </span>
                )}
                <div className="mt-4 flex flex-col">
                  <Link href="/profile" onClick={onClose} className={LINK_CLASS} style={{ color: "#1A1212", borderTop: "1px solid rgba(17,17,17,0.08)" }}>
                    My Profile <span style={{ opacity: 0.4 }}>→</span>
                  </Link>
                  {isAdmin && (
                    <Link href="/admin" onClick={onClose} className={LINK_CLASS} style={{ color: "#5B1C1C", borderTop: "1px solid rgba(17,17,17,0.08)" }}>
                      Admin Dashboard <span>→</span>
                    </Link>
                  )}
                  <button
                    onClick={() => {
                      onClose();
                      onSignOut();
                    }}
                    className={`${LINK_CLASS} w-full text-left`}
                    style={{ color: "#1A1212", borderTop: "1px solid rgba(17,17,17,0.08)", cursor: "pointer" }}
                  >
                    Sign Out <span style={{ opacity: 0.4 }}>↗</span>
                  </button>
                </div>
              </>
            ) : (
              <Link
                href="/auth"
                onClick={onClose}
                className={`${LINK_CLASS} w-full`}
                style={{ color: "#1A1212", borderTop: "1px solid rgba(17,17,17,0.08)" }}
              >
                Sign In <span style={{ opacity: 0.4 }}>→</span>
              </Link>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
