"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useWishlistStore } from "@/models/wishlistStore";

interface Props {
  productId: number;
  /** Optional extra class for positioning */
  className?: string;
}

export default function WishlistButton({ productId, className = "" }: Props) {
  const router = useRouter();
  const { ids, loaded, load, toggle } = useWishlistStore();

  // Load once per session — idempotent
  useEffect(() => {
    load();
  }, [load]);

  const isWishlisted = ids.has(productId);

  const handleClick = async (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();

    // If not loaded yet, we're unauthenticated — redirect to auth
    if (!loaded) {
      router.push("/auth");
      return;
    }

    // If the toggle call comes back 401, redirect to auth
    try {
      await toggle(productId);
    } catch {
      router.push("/auth");
    }
  };

  return (
    <button
      onClick={handleClick}
      aria-label={isWishlisted ? "Remove from wishlist" : "Add to wishlist"}
      title={isWishlisted ? "Remove from wishlist" : "Add to wishlist"}
      className={`flex items-center justify-center transition-all ${className}`}
      style={{
        width: 32,
        height: 32,
        borderRadius: "50%",
        backgroundColor: isWishlisted ? "rgba(139,26,26,0.12)" : "rgba(244,240,230,0.85)",
        border: isWishlisted ? "1.5px solid #8B1A1A" : "1.5px solid rgba(17,17,17,0.15)",
        cursor: "pointer",
        backdropFilter: "blur(4px)",
        transition: "all 0.2s ease",
      }}
    >
      <svg
        width="14"
        height="14"
        viewBox="0 0 24 24"
        fill={isWishlisted ? "#8B1A1A" : "none"}
        stroke={isWishlisted ? "#8B1A1A" : "rgba(17,17,17,0.6)"}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
      </svg>
    </button>
  );
}
