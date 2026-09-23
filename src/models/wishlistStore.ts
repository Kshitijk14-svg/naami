import { create } from "zustand";

/** Thrown when the server says the session is gone, so callers can send the user to sign in. */
export class WishlistAuthError extends Error {
  constructor() {
    super("Not signed in.");
    this.name = "WishlistAuthError";
  }
}

/**
 * "idle" also covers a failed attempt that should be retried, which is why a
 * network error resets to it rather than to a terminal state.
 *
 * The status replaces a single `loaded` boolean that conflated three different
 * situations — request in flight, signed out, and loaded — so callers could not
 * tell "we don't know yet" from "you are not signed in".
 */
type WishlistStatus = "idle" | "loading" | "ready" | "signed-out";

interface WishlistState {
  ids: Set<number>;
  status: WishlistStatus;
  load: () => Promise<void>;
  toggle: (productId: number) => Promise<void>;
  /** Drop all state — call on sign-out so the next user doesn't inherit these. */
  reset: () => void;
  /** Keep the store in step with a removal made elsewhere (e.g. the profile page). */
  removeLocal: (productId: number) => void;
}

export const useWishlistStore = create<WishlistState>()((set, get) => ({
  ids: new Set<number>(),
  status: "idle",

  load: async () => {
    const { status } = get();
    // "signed-out" is deliberately not skipped: after signing in, the next call
    // should try again rather than leave the hearts permanently empty.
    if (status === "loading" || status === "ready") return;
    set({ status: "loading" });
    try {
      const res = await fetch("/api/wishlist");
      if (res.status === 401) {
        set({ ids: new Set<number>(), status: "signed-out" });
        return;
      }
      if (!res.ok) {
        set({ status: "idle" });
        return;
      }
      const items: { productId: number }[] = await res.json();
      set({ ids: new Set(items.map((i) => i.productId)), status: "ready" });
    } catch {
      // Network error — back to idle so the next render retries.
      set({ status: "idle" });
    }
  },

  toggle: async (productId: number) => {
    const { ids } = get();
    const isWishlisted = ids.has(productId);

    // Optimistic update
    const next = new Set(ids);
    if (isWishlisted) next.delete(productId);
    else next.add(productId);
    set({ ids: next });

    try {
      const res = isWishlisted
        ? await fetch(`/api/wishlist/${productId}`, { method: "DELETE" })
        : await fetch("/api/wishlist", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ productId }),
          });

      if (!res.ok) {
        // Roll back and tell the caller. This branch used to fall through in
        // silence: the heart stayed filled, the server had stored nothing, and
        // WishlistButton's catch — whose whole job is to send an expired
        // session to /auth — could never fire because nothing ever threw.
        set({ ids });
        if (res.status === 401) {
          set({ status: "signed-out" });
          throw new WishlistAuthError();
        }
        throw new Error(`Wishlist update failed (${res.status})`);
      }

      const data = await res.json();
      set({ ids: new Set<number>(data.ids as number[]), status: "ready" });
    } catch (err) {
      set({ ids });
      throw err;
    }
  },

  reset: () => set({ ids: new Set<number>(), status: "idle" }),

  removeLocal: (productId: number) => {
    const next = new Set(get().ids);
    next.delete(productId);
    set({ ids: next });
  },
}));
