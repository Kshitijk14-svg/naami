import { create } from 'zustand';

interface CartState {
  isOpen: boolean;
  cartItemsCount: number;
  toggleCart: () => void;
  incrementItems: () => void;
  resetCart: () => void;
}

export const useCartStore = create<CartState>((set) => ({
  isOpen: false,
  cartItemsCount: 0,
  toggleCart: () => set((state) => ({ isOpen: !state.isOpen })),
  incrementItems: () => set((state) => ({ cartItemsCount: state.cartItemsCount + 1 })),
  resetCart: () => set({ cartItemsCount: 0 }),
}));
