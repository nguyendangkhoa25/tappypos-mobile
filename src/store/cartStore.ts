import { create } from 'zustand';

export type CartItem = {
  cartItemId?: string;
  productId: string;
  name: string;
  price: number;
  quantity: number;
  unit: string;
};

/**
 * Discriminated union for the customer attached to a POS cart.
 *  - `type: 'managed'`  — a customer record tracked in the shop's CRM
 *  - `type: 'guest'`    — a named walk-in with no managed record
 *  - `null`             — anonymous walk-in (default)
 */
export type SelectedCustomer =
  | { type: 'managed'; id: string; name: string; phone: string | null }
  | { type: 'guest'; name: string };

type CartState = {
  items: CartItem[];
  promoCode: string | null;
  discount: number;
  selectedCustomer: SelectedCustomer | null;
  tableId: number | null;
  tableLabel: string | null;
  /** Set when opening an already-occupied table (PENDING order) for F&B add-more flow. */
  activeOrderId: string | null;
  /** True when the current F&B order is a takeaway (no table). */
  isTakeaway: boolean;
  /** ISO datetime string for the target pickup time (takeaway only). */
  takeawayPickupTime: string | null;

  addItem: (item: Omit<CartItem, 'cartItemId'>) => void;
  updateQty: (productId: string, qty: number) => void;
  updatePrice: (productId: string, price: number) => void;
  removeItem: (productId: string) => void;
  setCartItemId: (productId: string, cartItemId: string) => void;
  setPromo: (code: string | null, discount: number) => void;
  setCustomer: (c: SelectedCustomer | null) => void;
  setTable: (tableId: number | null, tableLabel: string | null) => void;
  setActiveOrderId: (orderId: string | null) => void;
  setTakeaway: (pickupTime: string | null) => void;
  clearCart: () => void;
  getTotal: () => number;
};

export const useCartStore = create<CartState>((set, get) => ({
  items: [],
  promoCode: null,
  discount: 0,
  selectedCustomer: null,
  tableId: null,
  tableLabel: null,
  activeOrderId: null,
  isTakeaway: false,
  takeawayPickupTime: null,

  addItem: (item) =>
    set((state) => {
      const existing = state.items.find((i) => i.productId === item.productId);
      if (existing) {
        return {
          items: state.items.map((i) =>
            i.productId === item.productId ? { ...i, quantity: i.quantity + (item.quantity ?? 1) } : i,
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

  updatePrice: (productId, price) =>
    set((state) => ({
      items: state.items.map((i) => (i.productId === productId ? { ...i, price } : i)),
    })),

  removeItem: (productId) =>
    set((state) => ({ items: state.items.filter((i) => i.productId !== productId) })),

  setCartItemId: (productId, cartItemId) =>
    set((state) => ({
      items: state.items.map((i) => (i.productId === productId ? { ...i, cartItemId } : i)),
    })),

  setPromo: (code, discount) => set({ promoCode: code, discount }),

  setCustomer: (c) => set({ selectedCustomer: c }),

  setTable: (tableId, tableLabel) => set({ tableId, tableLabel, isTakeaway: false, takeawayPickupTime: null }),

  setActiveOrderId: (orderId) => set({ activeOrderId: orderId }),

  setTakeaway: (pickupTime) =>
    set({ isTakeaway: true, takeawayPickupTime: pickupTime, tableId: null, tableLabel: null, activeOrderId: null }),

  clearCart: () =>
    set({
      items: [],
      promoCode: null,
      discount: 0,
      selectedCustomer: null,
      tableId: null,
      tableLabel: null,
      activeOrderId: null,
      isTakeaway: false,
      takeawayPickupTime: null,
    }),

  getTotal: () => {
    const state = get();
    const subtotal = state.items.reduce((sum, i) => sum + i.price * i.quantity, 0);
    return Math.max(0, subtotal - state.discount);
  },
}));
