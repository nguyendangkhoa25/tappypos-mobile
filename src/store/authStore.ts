import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { extractFeatures, extractTenantId, extractShopType, extractUserId } from '../utils/jwt';
import { registerForceLogout } from '../services/authSession';
import { queryClient } from '../lib/queryClient';

type AuthState = {
  isAuthenticated: boolean;
  storedPhone: string | null;
  pinEnabled: boolean;
  biometricEnabled: boolean;
  tenantId: string | null;
  features: string[];
  shopTypeCode: string | null;
  currentUserId: string | null;
  deviceSwitchedMessage: string | null;
  setupComplete: boolean;

  setAuthenticated: (tokens: { accessToken: string; refreshToken?: string; setupComplete?: boolean }) => Promise<void>;
  setStoredPhone: (phone: string) => Promise<void>;
  setPinEnabled: (value: boolean) => Promise<void>;
  setBiometricEnabled: (value: boolean) => Promise<void>;
  logout: () => Promise<void>;
  clearDeviceSwitchedMessage: () => void;
  hydrateFromStorage: () => Promise<void>;
};

export const useAuthStore = create<AuthState>((set) => ({
  isAuthenticated: false,
  storedPhone: null,
  pinEnabled: false,
  biometricEnabled: false,
  tenantId: null,
  features: [],
  shopTypeCode: null,
  currentUserId: null,
  deviceSwitchedMessage: null,
  setupComplete: false,

  setAuthenticated: async ({ accessToken, refreshToken, setupComplete }) => {
    const tasks: Promise<void>[] = [SecureStore.setItemAsync('access_token', accessToken)];
    if (refreshToken) tasks.push(SecureStore.setItemAsync('refresh_token', refreshToken));
    if (setupComplete !== undefined) {
      tasks.push(SecureStore.setItemAsync('setup_complete', setupComplete ? 'true' : 'false'));
    }

    const jwtTenantId = extractTenantId(accessToken);
    const features = extractFeatures(accessToken);
    const shopTypeCode = extractShopType(accessToken);
    const currentUserId = extractUserId(accessToken);

    if (shopTypeCode) tasks.push(SecureStore.setItemAsync('shop_type', shopTypeCode));

    let tenantId: string | null = jwtTenantId;
    if (jwtTenantId) {
      tasks.push(SecureStore.setItemAsync('tenant_id', jwtTenantId));
    } else {
      // JWT has no tenantId claim → registration flow (user has no shop yet).
      // Always clear any stale tenant_id left from a previous session so onboarding
      // requests don't carry an invalid X-Tenant-ID header.
      tasks.push(SecureStore.deleteItemAsync('tenant_id'));
      tenantId = null;
    }

    await Promise.all(tasks);
    // Flush all cached queries so a tenant switch never shows stale data from the
    // previous tenant (query keys are tenant-agnostic and the cache is a singleton).
    queryClient.clear();
    set({
      isAuthenticated: true,
      tenantId,
      features,
      shopTypeCode,
      currentUserId,
      ...(setupComplete !== undefined ? { setupComplete } : {}),
    });
  },

  setStoredPhone: async (phone) => {
    await SecureStore.setItemAsync('phone', phone);
    set({ storedPhone: phone });
  },

  setPinEnabled: async (value) => {
    if (value) {
      await SecureStore.setItemAsync('pin_enabled', 'true');
    } else {
      await SecureStore.deleteItemAsync('pin_enabled');
    }
    set({ pinEnabled: value });
  },

  setBiometricEnabled: async (value) => {
    if (value) {
      await SecureStore.setItemAsync('biometric_enabled', 'true');
    } else {
      await SecureStore.deleteItemAsync('biometric_enabled');
    }
    set({ biometricEnabled: value });
  },

  logout: async () => {
    // Keep storedPhone, pin_enabled, refresh_token, biometric_enabled, setup_complete so the
    // user lands on PinLoginScreen and biometric/PIN re-login still works after logout.
    // Clear tenant_id so the next login (or registration) starts with a clean slate —
    // setAuthenticated will restore it from the JWT on successful re-login.
    const { useOnboardingStore } = await import('./onboardingStore');
    const { useCartStore } = await import('./cartStore');
    const { useUserStore } = await import('./userStore');
    useOnboardingStore.getState().reset();
    useCartStore.getState().clearCart();
    await useUserStore.getState().clear();
    await Promise.all([
      SecureStore.deleteItemAsync('access_token'),
      SecureStore.deleteItemAsync('tenant_id'),
    ]);
    queryClient.clear();
    set({ isAuthenticated: false, features: [], tenantId: null, shopTypeCode: null, currentUserId: null });
  },

  clearDeviceSwitchedMessage: () => set({ deviceSwitchedMessage: null }),

  hydrateFromStorage: async () => {
    const [accessToken, storedPhone, pinEnabled, biometricEnabled, tenantId, setupCompleteStr, shopTypeCode, refreshToken] = await Promise.all([
      SecureStore.getItemAsync('access_token'),
      SecureStore.getItemAsync('phone'),
      SecureStore.getItemAsync('pin_enabled'),
      SecureStore.getItemAsync('biometric_enabled'),
      SecureStore.getItemAsync('tenant_id'),
      SecureStore.getItemAsync('setup_complete'),
      SecureStore.getItemAsync('shop_type'),
      SecureStore.getItemAsync('refresh_token'),
    ]);

    // Silent refresh: if access_token is missing but refresh_token exists, the
    // previous session ended with forceLogout deleting the access_token (e.g. the
    // refresh cycle completed mid-flight before force-close). Try to recover the
    // session now so the user isn't kicked to Login unnecessarily.
    let effectiveAccessToken = accessToken;
    if (!accessToken && refreshToken) {
      try {
        const { authApi } = await import('../services/api');
        const res = await authApi.refresh(refreshToken, storedPhone ?? undefined);
        const { accessToken: newAccess, refreshToken: newRefresh } = res.data.data;
        await Promise.all([
          SecureStore.setItemAsync('access_token', newAccess),
          ...(newRefresh ? [SecureStore.setItemAsync('refresh_token', newRefresh)] : []),
        ]);
        effectiveAccessToken = newAccess;
      } catch {
        // Refresh token also expired or server unreachable — user must log in again.
      }
    }

    const hasPinOnDevice = storedPhone !== null && pinEnabled === 'true';
    const features = effectiveAccessToken ? extractFeatures(effectiveAccessToken) : [];
    const currentUserId = effectiveAccessToken ? extractUserId(effectiveAccessToken) : null;
    // Existing installs have no setup_complete key yet — default true so they aren't
    // incorrectly routed to the onboarding wizard on their first app update.
    const setupComplete = setupCompleteStr !== null ? setupCompleteStr === 'true' : true;

    // For PIN users on cold start (force-close + reopen): bypass the PIN screen if
    // the user was still within the lock timeout. Without this check, PIN users are
    // always shown PinLoginScreen on every cold start, even if they closed the app
    // 1 second ago — because hydrateFromStorage can't know about the in-session lock.
    let isAuthenticated = !hasPinOnDevice && !!effectiveAccessToken;
    if (hasPinOnDevice && effectiveAccessToken) {
      try {
        const [bgTimestampStr, timeoutStr] = await Promise.all([
          AsyncStorage.getItem('backgroundTimestamp'),
          AsyncStorage.getItem('lock_timeout_minutes'),
        ]);
        if (bgTimestampStr) {
          const timeoutMs = (timeoutStr !== null ? parseInt(timeoutStr, 10) : 5) * 60 * 1000;
          const elapsed = Date.now() - parseInt(bgTimestampStr, 10);
          if (elapsed < timeoutMs) isAuthenticated = true;
        }
      } catch {
        // AsyncStorage unavailable — fall through and require PIN entry
      }
    }

    set({
      isAuthenticated,
      storedPhone: storedPhone ?? null,
      pinEnabled: pinEnabled === 'true',
      biometricEnabled: biometricEnabled === 'true',
      tenantId: tenantId ?? null,
      features,
      shopTypeCode: shopTypeCode ?? null,
      currentUserId,
      setupComplete,
    });
  },
}));

registerForceLogout(async (reason) => {
  const store = useAuthStore.getState();
  if (reason === 'device_switched') {
    await store.logout();
    useAuthStore.setState({ deviceSwitchedMessage: 'device_switched' });
  } else {
    await store.logout();
  }
});
