import { useEffect, useRef } from 'react';
import { AppState, type AppStateStatus } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { msUntilExpiry } from '../utils/jwt';
import { authApi } from '../services/api';
import { useAuthStore } from '../store/authStore';

const REFRESH_BEFORE_EXPIRY_MS = 60_000;   // refresh 60 s before expiry
const IMMEDIATE_REFRESH_THRESHOLD_MS = 120_000; // on resume, refresh now if < 2 min left

async function doRefresh(setAuthenticated: (tokens: { accessToken: string; refreshToken?: string }) => Promise<void>) {
  const [refreshToken, phone] = await Promise.all([
    SecureStore.getItemAsync('refresh_token'),
    SecureStore.getItemAsync('phone'),
  ]);
  if (!refreshToken) return;
  const { data } = await authApi.refresh(refreshToken, phone ?? undefined);
  await setAuthenticated(data.data);
}

export function useTokenRefresh() {
  const setAuthenticated = useAuthStore((s) => s.setAuthenticated);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Stable ref so the AppState handler always calls the latest scheduleRefresh
  const scheduleRef = useRef<() => void>(() => {});

  useEffect(() => {
    async function scheduleRefresh() {
      if (timerRef.current) clearTimeout(timerRef.current);

      const token = await SecureStore.getItemAsync('access_token');
      if (!token) return;

      const ms = msUntilExpiry(token) - REFRESH_BEFORE_EXPIRY_MS;
      if (ms <= 0) return; // already at/past the refresh window; let the 401 path handle it

      timerRef.current = setTimeout(async () => {
        try {
          await doRefresh(setAuthenticated);
          scheduleRefresh(); // reschedule for the newly issued token
        } catch {
          // silent — the Axios 401 interceptor is the fallback
        }
      }, ms);
    }

    scheduleRef.current = scheduleRefresh;
    scheduleRefresh();

    const handleAppState = async (next: AppStateStatus) => {
      if (next !== 'active') return;

      if (timerRef.current) clearTimeout(timerRef.current);

      const token = await SecureStore.getItemAsync('access_token');
      if (!token) return;

      const remaining = msUntilExpiry(token);
      if (remaining <= 0) {
        // Fully expired while backgrounded — 401 path will handle the next request
        return;
      }
      if (remaining < IMMEDIATE_REFRESH_THRESHOLD_MS) {
        // Close to expiry — refresh immediately so the first user action doesn't stall
        try {
          await doRefresh(setAuthenticated);
        } catch {
          // silent
        }
      }

      scheduleRef.current();
    };

    const sub = AppState.addEventListener('change', handleAppState);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      sub.remove();
    };
  }, [setAuthenticated]);
}
