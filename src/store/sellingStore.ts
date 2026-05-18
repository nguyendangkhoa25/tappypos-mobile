import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';

type SellingView = 'POS' | 'ORDERS';

const KEY = 'selling_view';

type SellingState = {
  activeView: SellingView;
  setActiveView: (v: SellingView) => void;
  hydrate: () => Promise<void>;
  barberCategoryId: string | null;
  setBarberCategoryId: (id: string | null) => void;
};

export const useSellingStore = create<SellingState>((set) => ({
  activeView: 'POS',
  setActiveView: (v) => {
    set({ activeView: v });
    AsyncStorage.setItem(KEY, v).catch(() => {});
  },
  hydrate: async () => {
    try {
      const stored = await AsyncStorage.getItem(KEY);
      if (stored === 'POS' || stored === 'ORDERS') set({ activeView: stored });
    } catch {}
  },
  barberCategoryId: null,
  setBarberCategoryId: (id) => set({ barberCategoryId: id }),
}));
