"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Role, ROLE_LABELS } from "@/models/roles";

interface Props {
  email?: string;
  name?: string;
  role: Role;
}

export function AdminTopbar({ email, name, role }: Props) {
  const router = useRouter();
  const [signingOut, setSigningOut] = useState(false);

  const handleSignOut = async () => {
    setSigningOut(true);
    await fetch("/api/auth/signout", { method: "POST" });
    router.push("/");
    router.refresh();
  };

  return (
    <header
      className="flex items-center justify-between flex-shrink-0"
      style={{
        height: 64,
        padding: "0 24px",
        backgroundColor: "#EDE8DC",
        borderBottom: "1px solid rgba(17,17,17,0.08)",
      }}
    >
      {/* Brand */}
      <Link
        href="/"
        className="font-serif uppercase font-semibold hover:opacity-60 transition-opacity"
        style={{ fontSize: "1.05rem", letterSpacing: "0.18em", color: "#8B1A1A" }}
      >
        Naami
      </Link>

      {/* Right side: role + email + sign out */}
      <div className="flex items-center gap-5">
        <div className="flex items-center gap-2">
          <div style={{ width: 6, height: 6, borderRadius: "50%", backgroundColor: "#8B1A1A" }} />
          <span
            className="font-sans font-bold uppercase"
            style={{ fontSize: "9px", letterSpacing: "0.2em", color: "#8B1A1A" }}
          >
            {ROLE_LABELS[role]}
          </span>
        </div>
        {(email || name) && (
          <span
            className="hidden md:block font-sans"
            style={{ fontSize: "11px", color: "rgba(17,17,17,0.5)" }}
          >
            {name ?? email}
          </span>
        )}
        <button
          onClick={handleSignOut}
          disabled={signingOut}
          className="font-sans font-bold uppercase hover:opacity-60 transition-opacity disabled:opacity-30"
          style={{ fontSize: "9px", letterSpacing: "0.18em", color: "#111111", cursor: "pointer" }}
        >
          {signingOut ? "Signing out…" : "Sign Out"}
        </button>
      </div>
    </header>
  );
}
