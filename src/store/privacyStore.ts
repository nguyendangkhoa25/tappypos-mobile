import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';

type PrivacyState = {
  isHidden: boolean;
  toggle: () => Promise<void>;
  hydrate: () => Promise<void>;
};

export const usePrivacyStore = create<PrivacyState>((set, get) => ({
  isHidden: false,

  toggle: async () => {
    const next = !get().isHidden;
    await SecureStore.setItemAsync('privacy_hidden', next ? 'true' : 'false');
    set({ isHidden: next });
  },

  hydrate: async () => {
    const val = await SecureStore.getItemAsync('privacy_hidden');
    set({ isHidden: val === 'true' });
  },
}));
