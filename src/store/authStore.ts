import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';
import { extractFeatures, extractTenantId, extractShopType } from '../utils/jwt';
import { registerForceLogout } from '../services/authSession';

type AuthState = {
  isAuthenticated: boolean;
  storedPhone: string | null;
  pinEnabled: boolean;
  biometricEnabled: boolean;
  tenantId: string | null;
  features: string[];
  shopTypeCode: string | null;
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

    if (shopTypeCode) tasks.push(SecureStore.setItemAsync('shop_type', shopTypeCode));

    let tenantId: string | null = jwtTenantId;
    if (jwtTenantId) {
      tasks.push(SecureStore.setItemAsync('tenant_id', jwtTenantId));
    } else {
      // JWT has no tenantId claim (backend sends it via X-Tenant-ID header instead).
      // Preserve whatever ShopIdScreen stored; only clear for registration (no tenant yet).
      const stored = await SecureStore.getItemAsync('tenant_id').catch(() => null);
      tenantId = stored ?? null;
      if (!stored) {
        // Registration flow: no shop selected yet — clear stale tenant so onboarding shows.
        tasks.push(SecureStore.deleteItemAsync('tenant_id'));
      }
    }

    await Promise.all(tasks);
    set({
      isAuthenticated: true,
      tenantId,
      features,
      shopTypeCode,
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
    await SecureStore.deleteItemAsync('access_token');
    set({ isAuthenticated: false, features: [], tenantId: null, shopTypeCode: null });
  },

  clearDeviceSwitchedMessage: () => set({ deviceSwitchedMessage: null }),

  hydrateFromStorage: async () => {
    const [accessToken, storedPhone, pinEnabled, biometricEnabled, tenantId, setupCompleteStr, shopTypeCode] = await Promise.all([
      SecureStore.getItemAsync('access_token'),
      SecureStore.getItemAsync('phone'),
      SecureStore.getItemAsync('pin_enabled'),
      SecureStore.getItemAsync('biometric_enabled'),
      SecureStore.getItemAsync('tenant_id'),
      SecureStore.getItemAsync('setup_complete'),
      SecureStore.getItemAsync('shop_type'),
    ]);

    const hasPinOnDevice = storedPhone !== null && pinEnabled === 'true';
    const features = accessToken ? extractFeatures(accessToken) : [];
    // Existing installs have no setup_complete key yet — default true so they aren't
    // incorrectly routed to the onboarding wizard on their first app update.
    const setupComplete = setupCompleteStr !== null ? setupCompleteStr === 'true' : true;

    set({
      isAuthenticated: !hasPinOnDevice && !!accessToken,
      storedPhone: storedPhone ?? null,
      pinEnabled: pinEnabled === 'true',
      biometricEnabled: biometricEnabled === 'true',
      tenantId: tenantId ?? null,
      features,
      shopTypeCode: shopTypeCode ?? null,
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
