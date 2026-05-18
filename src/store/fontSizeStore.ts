import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';

export type FontScale = 'small' | 'normal' | 'large';

type FontSizeState = {
  fontScale: FontScale;
  setFontScale: (scale: FontScale) => Promise<void>;
  hydrate: () => Promise<void>;
};

export const useFontSizeStore = create<FontSizeState>((set) => ({
  fontScale: 'normal',

  setFontScale: async (scale) => {
    await SecureStore.setItemAsync('fontScale', scale);
    set({ fontScale: scale });
  },

  hydrate: async () => {
    const val = await SecureStore.getItemAsync('fontScale');
    if (val === 'small' || val === 'normal' || val === 'large') {
      set({ fontScale: val });
    }
  },
}));
