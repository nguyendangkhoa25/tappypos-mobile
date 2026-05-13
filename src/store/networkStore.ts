import { create } from 'zustand';

type NetworkState = {
  isMaintenance: boolean;
  setMaintenance: (v: boolean) => void;
};

export const useNetworkStore = create<NetworkState>((set) => ({
  isMaintenance: false,
  setMaintenance: (v) => set({ isMaintenance: v }),
}));
