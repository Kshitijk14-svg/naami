import { create } from "zustand";

interface WishlistState {
  ids: Set<number>;
  loaded: boolean;
  load: () => Promise<void>;
  toggle: (productId: number) => Promise<void>;
}

export const useWishlistStore = create<WishlistState>()((set, get) => ({
  ids: new Set<number>(),
  loaded: false,

  load: async () => {
    if (get().loaded) return;
    try {
      const res = await fetch("/api/wishlist");
      if (!res.ok) return; // not authenticated — stay empty
      const items: { productId: number }[] = await res.json();
      set({ ids: new Set(items.map((i) => i.productId)), loaded: true });
    } catch {
      // Network error — leave store empty; will retry on next load call.
    }
  },

  toggle: async (productId: number) => {
    const { ids } = get();
    const isWishlisted = ids.has(productId);

    // Optimistic update
    const next = new Set(ids);
    if (isWishlisted) {
      next.delete(productId);
    } else {
      next.add(productId);
    }
    set({ ids: next });

    try {
      if (isWishlisted) {
        const res = await fetch(`/api/wishlist/${productId}`, { method: "DELETE" });
        if (res.ok) {
          const data = await res.json();
          set({ ids: new Set<number>(data.ids as number[]) });
        }
      } else {
        const res = await fetch("/api/wishlist", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ productId }),
        });
        if (res.ok) {
          const data = await res.json();
          set({ ids: new Set<number>(data.ids as number[]) });
        }
      }
    } catch {
      // Revert optimistic update on error
      set({ ids });
    }
  },
}));
