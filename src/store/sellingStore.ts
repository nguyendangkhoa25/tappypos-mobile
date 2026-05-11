import { create } from 'zustand';

type SellingView = 'POS' | 'ORDERS';

type SellingState = {
  activeView: SellingView;
  setActiveView: (v: SellingView) => void;
};

export const useSellingStore = create<SellingState>((set) => ({
  activeView: 'POS',
  setActiveView: (v) => set({ activeView: v }),
}));
