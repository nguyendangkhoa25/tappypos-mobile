import { create } from 'zustand';

export type CartItem = {
  cartItemId?: string;
  productId: string;
  name: string;
  price: number;
  quantity: number;
  unit: string;
};

type CartState = {
  items: CartItem[];
  promoCode: string | null;
  discount: number;

  addItem: (item: Omit<CartItem, 'cartItemId'>) => void;
  updateQty: (productId: string, qty: number) => void;
  removeItem: (productId: string) => void;
  setCartItemId: (productId: string, cartItemId: string) => void;
  setPromo: (code: string | null, discount: number) => void;
  clearCart: () => void;
  getTotal: () => number;
};

export const useCartStore = create<CartState>((set, get) => ({
  items: [],
  promoCode: null,
  discount: 0,

  addItem: (item) =>
    set((state) => {
      const existing = state.items.find((i) => i.productId === item.productId);
      if (existing) {
        return {
          items: state.items.map((i) =>
            i.productId === item.productId ? { ...i, quantity: i.quantity + 1 } : i,
          ),
        };
      }
      return { items: [...state.items, { ...item, quantity: item.quantity ?? 1 }] };
    }),

  updateQty: (productId, qty) =>
    set((state) => ({
      items:
        qty <= 0
          ? state.items.filter((i) => i.productId !== productId)
          : state.items.map((i) => (i.productId === productId ? { ...i, quantity: qty } : i)),
    })),

  removeItem: (productId) =>
    set((state) => ({ items: state.items.filter((i) => i.productId !== productId) })),

  setCartItemId: (productId, cartItemId) =>
    set((state) => ({
      items: state.items.map((i) => (i.productId === productId ? { ...i, cartItemId } : i)),
    })),

  setPromo: (code, discount) => set({ promoCode: code, discount }),

  clearCart: () => set({ items: [], promoCode: null, discount: 0 }),

  getTotal: () => {
    const state = get();
    const subtotal = state.items.reduce((sum, i) => sum + i.price * i.quantity, 0);
    return Math.max(0, subtotal - state.discount);
  },
}));
