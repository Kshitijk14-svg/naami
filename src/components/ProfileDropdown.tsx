"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Role, ROLE_LABELS } from "@/models/roles";

interface SessionData {
  authenticated: boolean;
  email?: string;
  name?: string;
  role?: Role;
}

interface Props {
  session: SessionData;
  onSignOut: () => void;
}

const ADMIN_ROLES: Role[] = ["staff", "admin", "super_admin"];

export default function ProfileDropdown({ session, onSignOut }: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const initial = (session.name ?? session.email ?? "?")[0].toUpperCase();
  const role = session.role!;

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div ref={containerRef} className="relative hidden md:block">
      {/* Avatar trigger */}
      <button
        onClick={() => setIsOpen((v) => !v)}
        className="flex items-center justify-center rounded-full font-sans font-bold transition-opacity hover:opacity-75"
        style={{
          width: 30,
          height: 30,
          backgroundColor: "#8B1A1A",
          color: "#F4F0E6",
          fontSize: "11px",
          letterSpacing: "0.04em",
          cursor: "pointer",
        }}
        data-cursor-text="PROFILE"
      >
        {initial}
      </button>

      {/* Dropdown panel */}
      {isOpen && (
        <div
          className="absolute right-0"
          style={{
            top: "calc(100% + 10px)",
            width: 240,
            backgroundColor: "#EDE8DC",
            border: "1px solid rgba(17,17,17,0.08)",
            boxShadow: "0 8px 32px rgba(17,17,17,0.14)",
            zIndex: 50,
          }}
        >
          {/* Identity section */}
          <div style={{ padding: "16px 18px", borderBottom: "1px solid rgba(17,17,17,0.06)" }}>
            <p className="font-serif" style={{ fontSize: "1rem", color: "#111111", lineHeight: 1.3 }}>
              {session.name ?? "Guest"}
            </p>
            <p
              className="font-sans mt-0.5"
              style={{ fontSize: "11px", color: "rgba(17,17,17,0.5)", letterSpacing: "0.02em" }}
            >
              {session.email}
            </p>
            <span
              className="inline-block mt-2 font-sans font-bold uppercase"
              style={{
                fontSize: "8px",
                letterSpacing: "0.18em",
                color: "#8B1A1A",
                backgroundColor: "rgba(139,26,26,0.08)",
                padding: "3px 7px",
              }}
            >
              {ROLE_LABELS[role]}
            </span>
          </div>

          {/* Links section */}
          <div style={{ padding: "8px 0" }}>
            <Link
              href="/profile"
              onClick={() => setIsOpen(false)}
              className="flex items-center justify-between font-sans font-bold uppercase hover:bg-[#F4F0E6] transition-colors"
              style={{
                padding: "10px 18px",
                fontSize: "9px",
                letterSpacing: "0.18em",
                color: "#111111",
              }}
            >
              My Profile
              <span style={{ fontSize: "12px", fontWeight: 300, opacity: 0.4 }}>→</span>
            </Link>
            {ADMIN_ROLES.includes(role) && (
              <Link
                href="/admin"
                onClick={() => setIsOpen(false)}
                className="flex items-center justify-between font-sans font-bold uppercase hover:bg-[#F4F0E6] transition-colors"
                style={{
                  padding: "10px 18px",
                  fontSize: "9px",
                  letterSpacing: "0.18em",
                  color: "#8B1A1A",
                }}
              >
                Admin Dashboard
                <span style={{ fontSize: "12px", fontWeight: 300 }}>→</span>
              </Link>
            )}
            <button
              onClick={() => { setIsOpen(false); onSignOut(); }}
              className="w-full text-left flex items-center justify-between font-sans font-bold uppercase hover:bg-[#F4F0E6] transition-colors"
              style={{
                padding: "10px 18px",
                fontSize: "9px",
                letterSpacing: "0.18em",
                color: "#111111",
                cursor: "pointer",
              }}
            >
              Sign Out
              <span style={{ fontSize: "12px", fontWeight: 300, opacity: 0.4 }}>↗</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
