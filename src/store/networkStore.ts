import { create } from 'zustand';

type NetworkState = {
  isMaintenance: boolean;
  isOffline: boolean;
  setMaintenance: (v: boolean) => void;
  setOffline: (v: boolean) => void;
};

export const useNetworkStore = create<NetworkState>((set) => ({
  isMaintenance: false,
  isOffline: false,
  setMaintenance: (v) => set({ isMaintenance: v }),
  setOffline: (v) => set({ isOffline: v }),
}));
