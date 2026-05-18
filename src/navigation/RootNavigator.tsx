import { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Animated,
  AppState,
  Linking,
  Platform,
} from 'react-native';
import { useTypography } from '../hooks/useTypography';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import * as Constants from 'expo-constants';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuthStore } from '../store/authStore';
import { useUserStore } from '../store/userStore';
import { usePrivacyStore } from '../store/privacyStore';
import { useThemeStore } from '../store/themeStore';
import { AuthNavigator } from './AuthNavigator';
import { OnboardingNavigator } from './OnboardingNavigator';
import { AppNavigator } from './AppNavigator';
import { FriendlyAlert } from '../components/FriendlyAlert';
import { UndoToast } from '../components/UndoToast';
import i18n from '../i18n';
import * as SecureStore from 'expo-secure-store';
import { APP_STORE_URL, PLAY_STORE_URL } from '../utils/constants';
import type { RootStackParamList } from '../types/navigation';
import { appApi } from '../services/api';
import { useSellingStore } from '../store/sellingStore';
import { useFontSizeStore } from '../store/fontSizeStore';

const Stack = createNativeStackNavigator<RootStackParamList>();

// ── SplashScreen ──────────────────────────────────────────────────────────────

function SplashScreen() {
  const dots = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(dots, { toValue: 1, duration: 400, useNativeDriver: true }),
        Animated.timing(dots, { toValue: 0, duration: 400, useNativeDriver: true }),
      ]),
    ).start();
  }, []);

  return (
    <View className="flex-1 bg-primary items-center justify-center">
      <View className="w-20 h-20 bg-white/20 rounded-3xl items-center justify-center mb-4">
        <Text className="text-4xl">🏪</Text>
      </View>
      <Text className="text-white text-3xl font-bold tracking-wide">TappyPOS</Text>
      <View className="flex-row mt-8 gap-2">
        {[0, 1, 2].map((i) => (
          <Animated.View
            key={i}
            className="w-2 h-2 bg-white rounded-full"
            style={{ opacity: dots }}
          />
        ))}
      </View>
    </View>
  );
}

// ── ForceUpdateScreen ─────────────────────────────────────────────────────────

function ForceUpdateScreen() {
  const storeUrl = Platform.OS === 'ios' ? APP_STORE_URL : PLAY_STORE_URL;
  const typo = useTypography();
  return (
    <View className="flex-1 bg-primary items-center justify-center px-8">
      <View className="w-20 h-20 bg-white/20 rounded-3xl items-center justify-center mb-6">
        <Text className="text-4xl">🔄</Text>
      </View>
      <Text className={`text-white ${typo.heading} text-center mb-3`}>
        Cần cập nhật ứng dụng
      </Text>
      <Text className={`text-white/80 ${typo.caption} text-center mb-8 leading-5`}>
        Phiên bản hiện tại không còn được hỗ trợ. Vui lòng cập nhật để tiếp tục sử dụng.
      </Text>
      <TouchableOpacity
        className="bg-white rounded-2xl px-8 py-4"
        onPress={() => Linking.openURL(storeUrl)}
      >
        <Text className={`text-primary ${typo.body}`}>Cập nhật ngay</Text>
      </TouchableOpacity>
    </View>
  );
}

// ── SoftUpdateBanner ─────────────────────────────────────────────────────────

function SoftUpdateBanner({ onDismiss }: { onDismiss: () => void }) {
  const storeUrl = Platform.OS === 'ios' ? APP_STORE_URL : PLAY_STORE_URL;
  const typo = useTypography();
  return (
    <View className="absolute top-0 left-0 right-0 bg-amber-400 flex-row items-center px-4 py-3 gap-3" style={{ zIndex: 999 }}>
      <Text className={`flex-1 ${typo.label} text-amber-900`}>
        Có phiên bản mới. Cập nhật để có trải nghiệm tốt hơn.
      </Text>
      <TouchableOpacity onPress={() => Linking.openURL(storeUrl)}>
        <Text className={`${typo.labelBold} text-amber-900 underline`}>Cập nhật</Text>
      </TouchableOpacity>
      <TouchableOpacity onPress={onDismiss} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
        <Text className={`text-amber-900 ${typo.body}`}>✕</Text>
      </TouchableOpacity>
    </View>
  );
}

// ── RootNavigator ─────────────────────────────────────────────────────────────

type AppState_ = 'splash' | 'force_update' | 'auth' | 'onboarding' | 'app';

export function RootNavigator() {
  const [appState, setAppState] = useState<AppState_>('splash');
  const [softUpdateAvailable, setSoftUpdateAvailable] = useState(false);
  const { isAuthenticated, tenantId, setupComplete, pinEnabled, hydrateFromStorage } = useAuthStore();
  const hydrateDone = useRef(false);
  const bgTimestamp = useRef<number | null>(null);

  useEffect(() => {
    const init = async () => {
      const splashStart = Date.now();
      // Guard: if SecureStore hangs or throws (e.g. missing Keychain entitlement
      // in a dev build), swallow per-promise errors and don't block splash forever.
      await Promise.race([
        Promise.all([
          hydrateFromStorage().catch(() => {}),
          useUserStore.getState().hydrate().catch(() => {}),
          usePrivacyStore.getState().hydrate().catch(() => {}),
          useThemeStore.getState().hydrate().catch(() => {}),
          useSellingStore.getState().hydrate().catch(() => {}),
          useFontSizeStore.getState().hydrate().catch(() => {}),
          SecureStore.getItemAsync('language').then((lang) => {
            if (lang && lang !== i18n.language) i18n.changeLanguage(lang);
          }).catch(() => {}),
        ]),
        delay(4_000),
      ]).catch(() => {});
      // Version check — plain axios instance (no auth interceptor) so a 401 or
      // missing endpoint never triggers forceLogout and never blocks startup.
      try {
        const res = await appApi.getVersionPublic();
        const { minVersion, latestVersion } = res.data.data;
        const current = Constants.default.expoConfig?.version ?? '1.0.0';
        if (compareVersions(current, minVersion) < 0) {
          const elapsed = Date.now() - splashStart;
          if (elapsed < 600) await delay(600 - elapsed);
          hydrateDone.current = true;
          setAppState('force_update');
          return;
        }
        if (compareVersions(current, latestVersion) < 0) {
          setSoftUpdateAvailable(true);
        }
      } catch {
        // Version check failure is non-blocking (endpoint may not exist yet)
      }
      const elapsed = Date.now() - splashStart;
      if (elapsed < 600) await delay(600 - elapsed);
      hydrateDone.current = true;
      resolveState();
    };
    init().catch(() => resolveState());
  }, []);

  // Resolve which stack to show after hydration
  function resolveState() {
    const { isAuthenticated, tenantId, setupComplete } = useAuthStore.getState();
    if (!isAuthenticated) {
      setAppState('auth');
    } else if (!setupComplete) {
      // Authenticated but shop setup not complete — show onboarding wizard.
      setAppState('onboarding');
    } else if (!tenantId) {
      // Authenticated, shop set up, but no tenant context on this device
      // (e.g. after "change shop" — need to re-enter shop ID).
      setAppState('auth');
    } else {
      setAppState('app');
    }
  }

  // Re-resolve when auth state changes (post-hydration only)
  useEffect(() => {
    if (!hydrateDone.current) return;
    if (appState === 'force_update') return;
    resolveState();
  }, [isAuthenticated, tenantId, setupComplete]);

  // Background PIN lock
  useEffect(() => {
    const sub = AppState.addEventListener('change', async (nextState) => {
      // Write on both 'inactive' and 'background': on iOS, force-closing via the
      // app switcher fires 'inactive' then kills the process — 'background' may
      // never fire, so the lock-timeout check in hydrateFromStorage would use a
      // stale timestamp from a much earlier session.
      if (nextState === 'inactive' || nextState === 'background') {
        bgTimestamp.current = Date.now();
        await AsyncStorage.setItem('backgroundTimestamp', String(Date.now()));
      } else if (nextState === 'active') {
        const stored = await AsyncStorage.getItem('backgroundTimestamp');
        if (!stored) return;
        const timeoutStr = await AsyncStorage.getItem('lock_timeout_minutes');
        // Default: 5 minutes. '0' means lock immediately.
        const timeoutMs = (timeoutStr !== null ? parseInt(timeoutStr, 10) : 5) * 60 * 1000;
        const elapsed = Date.now() - parseInt(stored, 10);
        const { pinEnabled, isAuthenticated } = useAuthStore.getState();
        if (pinEnabled && isAuthenticated && elapsed > timeoutMs) {
          useAuthStore.setState({ isAuthenticated: false });
        }
      }
    });
    return () => sub.remove();
  }, []);

  if (appState === 'splash') return <SplashScreen />;
  if (appState === 'force_update') return <ForceUpdateScreen />;

  return (
    <>
      <Stack.Navigator screenOptions={{ headerShown: false, animation: 'none' }}>
        {appState === 'auth' && <Stack.Screen name="Auth" component={AuthNavigator} />}
        {appState === 'onboarding' && (
          <Stack.Screen name="Onboarding" component={OnboardingNavigator} />
        )}
        {appState === 'app' && <Stack.Screen name="App" component={AppNavigator} />}
      </Stack.Navigator>
      <FriendlyAlert />
      <UndoToast />
      {softUpdateAvailable && <SoftUpdateBanner onDismiss={() => setSoftUpdateAvailable(false)} />}
    </>
  );
}

function delay(ms: number) {
  return new Promise<void>((r) => setTimeout(r, ms));
}

function compareVersions(a: string, b: string): number {
  const pa = a.split('.').map(Number);
  const pb = b.split('.').map(Number);
  for (let i = 0; i < 3; i++) {
    const diff = (pa[i] ?? 0) - (pb[i] ?? 0);
    if (diff !== 0) return diff;
  }
  return 0;
}
