import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';

export type ThemeChoice = 'light' | 'dark' | 'system';

type ThemeState = {
  theme: ThemeChoice;
  setTheme: (t: ThemeChoice) => Promise<void>;
  hydrate: () => Promise<void>;
};

export const useThemeStore = create<ThemeState>((set) => ({
  theme: 'system',

  setTheme: async (t) => {
    await SecureStore.setItemAsync('theme', t);
    set({ theme: t });
  },

  hydrate: async () => {
    const val = await SecureStore.getItemAsync('theme');
    if (val === 'light' || val === 'dark' || val === 'system') {
      set({ theme: val });
    }
  },
}));
