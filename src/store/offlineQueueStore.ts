import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { CartItem } from './cartStore';

export type OfflineOrder = {
  id: string;
  items: CartItem[];
  paymentMethod: string;
  total: number;
  tableId?: number | null;
  tableLabel?: string | null;
  createdAt: string;
  status: 'pending' | 'syncing' | 'error';
  errorMessage?: string;
};

export type OfflineExpense = {
  id: string;
  description: string;
  amount: number;
  category: string;
  expenseDate: string;
  createdAt: string;
  status: 'pending' | 'syncing' | 'error';
  errorMessage?: string;
};

type OfflineQueueState = {
  pendingOrders: OfflineOrder[];
  pendingExpenses: OfflineExpense[];
  addOrder: (order: Omit<OfflineOrder, 'id' | 'createdAt' | 'status'>) => string;
  addExpense: (expense: Omit<OfflineExpense, 'id' | 'createdAt' | 'status'>) => string;
  updateOrderStatus: (id: string, status: OfflineOrder['status'], errorMessage?: string) => void;
  updateExpenseStatus: (id: string, status: OfflineExpense['status'], errorMessage?: string) => void;
  removeOrder: (id: string) => void;
  removeExpense: (id: string) => void;
  clearSynced: () => void;
};

export const useOfflineQueueStore = create<OfflineQueueState>()(
  persist(
    (set) => ({
      pendingOrders: [],
      pendingExpenses: [],

      addOrder: (order) => {
        const id = `offline-order-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
        set((s) => ({
          pendingOrders: [
            ...s.pendingOrders,
            { ...order, id, createdAt: new Date().toISOString(), status: 'pending' },
          ],
        }));
        return id;
      },

      addExpense: (expense) => {
        const id = `offline-expense-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
        set((s) => ({
          pendingExpenses: [
            ...s.pendingExpenses,
            { ...expense, id, createdAt: new Date().toISOString(), status: 'pending' },
          ],
        }));
        return id;
      },

      updateOrderStatus: (id, status, errorMessage) =>
        set((s) => ({
          pendingOrders: s.pendingOrders.map((o) =>
            o.id === id ? { ...o, status, errorMessage } : o,
          ),
        })),

      updateExpenseStatus: (id, status, errorMessage) =>
        set((s) => ({
          pendingExpenses: s.pendingExpenses.map((e) =>
            e.id === id ? { ...e, status, errorMessage } : e,
          ),
        })),

      removeOrder: (id) =>
        set((s) => ({ pendingOrders: s.pendingOrders.filter((o) => o.id !== id) })),

      removeExpense: (id) =>
        set((s) => ({ pendingExpenses: s.pendingExpenses.filter((e) => e.id !== id) })),

      clearSynced: () =>
        set((s) => ({
          pendingOrders: s.pendingOrders.filter((o) => o.status !== 'pending'),
          pendingExpenses: s.pendingExpenses.filter((e) => e.status !== 'pending'),
        })),
    }),
    {
      name: 'offline-queue',
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);
