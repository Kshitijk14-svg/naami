import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

export interface CartItem {
  productId: number;
  name: string;
  priceInr: number;
  image: string;
  size: string;
  quantity: number;
}

interface CartState {
  items: CartItem[];
  cartItemsCount: number;
  isOpen: boolean;
  addItem: (item: Omit<CartItem, "quantity">, qty?: number) => void;
  removeItem: (productId: number, size: string) => void;
  updateQuantity: (productId: number, size: string, qty: number) => void;
  clearCart: () => void;
  toggleCart: () => void;
  // Legacy compat — kept so existing components don't break during migration
  incrementItems: () => void;
  resetCart: () => void;
}

function computeCount(items: CartItem[]): number {
  return items.reduce((sum, i) => sum + i.quantity, 0);
}

export const useCartStore = create<CartState>()(
  persist(
    (set) => ({
      items: [],
      cartItemsCount: 0,
      isOpen: false,

      addItem: (item, qty = 1) =>
        set((state) => {
          const idx = state.items.findIndex(
            (i) => i.productId === item.productId && i.size === item.size
          );
          let items: CartItem[];
          if (idx >= 0) {
            items = state.items.map((i, n) =>
              n === idx ? { ...i, quantity: i.quantity + qty } : i
            );
          } else {
            items = [...state.items, { ...item, quantity: qty }];
          }
          return { items, cartItemsCount: computeCount(items) };
        }),

      removeItem: (productId, size) =>
        set((state) => {
          const items = state.items.filter(
            (i) => !(i.productId === productId && i.size === size)
          );
          return { items, cartItemsCount: computeCount(items) };
        }),

      updateQuantity: (productId, size, qty) =>
        set((state) => {
          if (qty <= 0) {
            const items = state.items.filter(
              (i) => !(i.productId === productId && i.size === size)
            );
            return { items, cartItemsCount: computeCount(items) };
          }
          const items = state.items.map((i) =>
            i.productId === productId && i.size === size ? { ...i, quantity: qty } : i
          );
          return { items, cartItemsCount: computeCount(items) };
        }),

      clearCart: () => set({ items: [], cartItemsCount: 0 }),

      toggleCart: () => set((state) => ({ isOpen: !state.isOpen })),

      // Legacy: no-op — product page now calls addItem directly
      incrementItems: () => {},
      resetCart: () => set({ items: [], cartItemsCount: 0 }),
    }),
    {
      name: "naami_cart",
      storage: createJSONStorage(() => localStorage),
      // Only persist cart items and count — do not persist isOpen
      partialize: (state) => ({ items: state.items, cartItemsCount: state.cartItemsCount }),
    }
  )
);
