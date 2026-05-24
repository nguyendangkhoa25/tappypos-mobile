import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';

type UserState = {
  nickname: string;
  fullName: string;
  shopName: string;
  avatarUrl: string | null;
  setNickname: (v: string) => Promise<void>;
  setFullName: (v: string) => Promise<void>;
  setShopName: (v: string) => Promise<void>;
  setAvatarUrl: (v: string | null) => Promise<void>;
  setAll: (data: { nickname?: string; fullName?: string; shopName?: string }) => Promise<void>;
  hydrate: () => Promise<void>;
  clear: () => Promise<void>;
};

export const useUserStore = create<UserState>((set) => ({
  nickname: '',
  fullName: '',
  shopName: '',
  avatarUrl: null,

  setNickname: async (v) => {
    await SecureStore.setItemAsync('nickname', v);
    set({ nickname: v });
  },

  setFullName: async (v) => {
    await SecureStore.setItemAsync('full_name', v);
    set({ fullName: v });
  },

  setShopName: async (v) => {
    await SecureStore.setItemAsync('shop_name', v);
    set({ shopName: v });
  },

  setAvatarUrl: async (v) => {
    if (v) {
      await SecureStore.setItemAsync('avatar_url', v);
    } else {
      await SecureStore.deleteItemAsync('avatar_url');
    }
    set({ avatarUrl: v });
  },

  setAll: async ({ nickname, fullName, shopName }) => {
    const tasks: Promise<void>[] = [];
    const updates: Partial<UserState> = {};
    if (nickname !== undefined) {
      tasks.push(SecureStore.setItemAsync('nickname', nickname));
      updates.nickname = nickname;
    }
    if (fullName !== undefined) {
      tasks.push(SecureStore.setItemAsync('full_name', fullName));
      updates.fullName = fullName;
    }
    if (shopName !== undefined) {
      tasks.push(SecureStore.setItemAsync('shop_name', shopName));
      updates.shopName = shopName;
    }
    set(updates);
    await Promise.all(tasks);
  },

  hydrate: async () => {
    const [nickname, fullName, shopName, avatarUrl] = await Promise.all([
      SecureStore.getItemAsync('nickname'),
      SecureStore.getItemAsync('full_name'),
      SecureStore.getItemAsync('shop_name'),
      SecureStore.getItemAsync('avatar_url'),
    ]);
    set({
      nickname: nickname ?? '',
      fullName: fullName ?? '',
      shopName: shopName ?? '',
      avatarUrl: avatarUrl ?? null,
    });
  },

  clear: async () => {
    await Promise.all([
      SecureStore.deleteItemAsync('nickname'),
      SecureStore.deleteItemAsync('full_name'),
      SecureStore.deleteItemAsync('shop_name'),
      SecureStore.deleteItemAsync('avatar_url'),
    ]);
    set({ nickname: '', fullName: '', shopName: '', avatarUrl: null });
  },
}));
