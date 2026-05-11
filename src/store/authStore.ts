import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';
import { extractFeatures, extractTenantId } from '../utils/jwt';
import { registerForceLogout } from '../services/authSession';

type AuthState = {
  isAuthenticated: boolean;
  storedPhone: string | null;
  pinEnabled: boolean;
  biometricEnabled: boolean;
  tenantId: string | null;
  features: string[];
  deviceSwitchedMessage: string | null;

  setAuthenticated: (tokens: { accessToken: string; refreshToken?: string }) => Promise<void>;
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
  deviceSwitchedMessage: null,

  setAuthenticated: async ({ accessToken, refreshToken }) => {
    const tasks: Promise<void>[] = [SecureStore.setItemAsync('access_token', accessToken)];
    if (refreshToken) tasks.push(SecureStore.setItemAsync('refresh_token', refreshToken));

    const jwtTenantId = extractTenantId(accessToken);
    const features = extractFeatures(accessToken);

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
    set({ isAuthenticated: true, tenantId, features });
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
    // Keep storedPhone, refresh_token, biometric_enabled so the user lands on PinLoginScreen
    // and biometric re-login still works after logout.
    await Promise.all([
      SecureStore.deleteItemAsync('access_token'),
      SecureStore.deleteItemAsync('pin_enabled'),
    ]);
    set({ isAuthenticated: false, pinEnabled: false, features: [] });
  },

  clearDeviceSwitchedMessage: () => set({ deviceSwitchedMessage: null }),

  hydrateFromStorage: async () => {
    const [accessToken, storedPhone, pinEnabled, biometricEnabled, tenantId] = await Promise.all([
      SecureStore.getItemAsync('access_token'),
      SecureStore.getItemAsync('phone'),
      SecureStore.getItemAsync('pin_enabled'),
      SecureStore.getItemAsync('biometric_enabled'),
      SecureStore.getItemAsync('tenant_id'),
    ]);

    const hasPinOnDevice = storedPhone !== null && pinEnabled === 'true';
    const features = accessToken ? extractFeatures(accessToken) : [];

    set({
      isAuthenticated: !hasPinOnDevice && !!accessToken,
      storedPhone: storedPhone ?? null,
      pinEnabled: pinEnabled === 'true',
      biometricEnabled: biometricEnabled === 'true',
      tenantId: tenantId ?? null,
      features,
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
