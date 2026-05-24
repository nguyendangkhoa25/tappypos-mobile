import { useState, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, TextInput } from 'react-native';
import * as LocalAuthentication from 'expo-local-authentication';
import * as SecureStore from 'expo-secure-store';
import { isAxiosError } from 'axios';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { PinPad } from '../../components/PinPad';
import { useTypography } from '../../hooks/useTypography';
import { authApi } from '../../services/api';
import { useAuthStore } from '../../store/authStore';
import { useAlertStore } from '../../store/alertStore';
import { useUserStore } from '../../store/userStore';
import { maskPhone } from '../../utils/format';
import type { AuthScreenProps } from '../../types/navigation';

const MAX_ATTEMPTS = 5;
const LOCKOUT_MS = 30 * 60 * 1000;

export function PinLoginScreen({ navigation }: AuthScreenProps<'PinLogin'>) {
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const typo = useTypography();
  const { show: showAlert } = useAlertStore();
  const [pin, setPin] = useState('');
  const [loading, setLoading] = useState(false);
  const [canBiometric, setCanBiometric] = useState(false);
  const [canEnableBiometric, setCanEnableBiometric] = useState(false);
  const [biometricType, setBiometricType] = useState<'face' | 'fingerprint'>('face');
  const [enablingBiometric, setEnablingBiometric] = useState(false);
  const [attempts, setAttempts] = useState(0);
  const [lockedUntil, setLockedUntil] = useState<number | null>(null);
  const [remainingSecs, setRemainingSecs] = useState(0);
  const { storedPhone, biometricEnabled, setAuthenticated, setBiometricEnabled } = useAuthStore();
  const nickname = useUserStore((s) => s.nickname);
  const autoPrompted = useRef(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const hiddenRef = useRef<TextInput>(null);

  useEffect(() => {
    checkBiometric();
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, []);

  useEffect(() => {
    if (lockedUntil) {
      timerRef.current = setInterval(() => {
        const secs = Math.ceil((lockedUntil - Date.now()) / 1000);
        if (secs <= 0) {
          setLockedUntil(null);
          setAttempts(0);
          setRemainingSecs(0);
          if (timerRef.current) clearInterval(timerRef.current);
        } else {
          setRemainingSecs(secs);
        }
      }, 1000);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [lockedUntil]);

  useEffect(() => {
    if (pin.length === 6) handlePinLogin(pin);
  }, [pin]);

  const checkBiometric = async () => {
    const [hasHardware, isEnrolled, hasRefresh, types] = await Promise.all([
      LocalAuthentication.hasHardwareAsync(),
      LocalAuthentication.isEnrolledAsync(),
      SecureStore.getItemAsync('refresh_token').then(Boolean),
      LocalAuthentication.supportedAuthenticationTypesAsync(),
    ]);

    // If the user previously enabled biometric but has since removed all biometrics
    // from the device (e.g. deleted all fingerprints in Settings), silently disable it.
    if (biometricEnabled && hasHardware && !isEnrolled) {
      await setBiometricEnabled(false);
    }

    const hwReady = hasHardware && isEnrolled && hasRefresh;
    const type = types.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION)
      ? 'face'
      : 'fingerprint';
    setBiometricType(type);
    const available = hwReady && biometricEnabled;
    setCanBiometric(available);
    // Hardware is ready but user hasn't enabled biometric yet — offer the shortcut
    setCanEnableBiometric(hwReady && !biometricEnabled);
    if (available && !autoPrompted.current) {
      autoPrompted.current = true;
      setTimeout(() => handleBiometric(), 400);
    }
  };

  const handlePinLogin = async (enteredPin: string) => {
    if (!storedPhone || lockedUntil) return;
    setLoading(true);
    try {
      const res = await authApi.loginWithPin(storedPhone, enteredPin);
      const { accessToken, refreshToken, setupComplete } = res.data.data;
      setAttempts(0);
      await setAuthenticated({ accessToken, refreshToken, setupComplete });
    } catch (err) {
      setPin('');
      const newAttempts = attempts + 1;
      setAttempts(newAttempts);

      if (isAxiosError(err) && err.response?.status === 423) {
        showAlert(t('auth.pinLogin.lockedTitle'), t('auth.pinLogin.lockedMsg'), [
          { label: t('auth.pinLoginExt.loginLabel'), onPress: () => navigation.navigate('Login') },
        ]);
      } else if (newAttempts >= MAX_ATTEMPTS) {
        const until = Date.now() + LOCKOUT_MS;
        setLockedUntil(until);
        showAlert(
          t('auth.pinLoginExt.lockAlertTitle'),
          t('auth.pinLoginExt.lockAlertMsg'),
          [
            { label: t('auth.pinLoginExt.loginLabel'), onPress: () => navigation.navigate('Login') },
            { label: t('auth.pinLoginExt.waitLabel'), style: 'cancel' },
          ],
        );
      } else {
        showAlert(
          t('auth.pinLogin.wrongPinTitle'),
          t('auth.pinLoginExt.wrongPinCountMsg', { count: MAX_ATTEMPTS - newAttempts }),
          [{ label: t('auth.pinLoginExt.retryLabel') }],
        );
      }
    } finally {
      setLoading(false);
    }
  };

  const handleBiometric = async () => {
    try {
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: t('auth.pinLogin.biometricPrompt'),
        cancelLabel: t('auth.pinLogin.biometricCancel'),
        disableDeviceFallback: false,
      });

      if (!result.success) {
        // 'error' is set when the OS rejects the request (not when the user cancels).
        // 'user_cancel' / 'system_cancel' → silent, the user tapped Cancel.
        // 'BiometryNotEnrolled' / 'biometryNotEnrolled' → all biometrics removed.
        // 'BiometryNotAvailable' / 'biometryNotAvailable' → hardware unavailable.
        const err = (result as { success: false; error?: string }).error ?? '';
        const isUnenrolled = /not.*enroll|BiometryNotEnrolled/i.test(err);
        const isUnavailable = /not.*available|BiometryNotAvailable/i.test(err);
        if (isUnenrolled || isUnavailable) {
          await setBiometricEnabled(false);
          setCanBiometric(false);
          setCanEnableBiometric(false);
          showAlert(
            t('auth.pinLoginExt.biometricRemovedTitle'),
            t('auth.pinLoginExt.biometricRemovedMsg'),
            [{ label: t('common.ok') }],
          );
        }
        return;
      }

      const refreshToken = await SecureStore.getItemAsync('refresh_token');
      if (!refreshToken) {
        setCanBiometric(false);
        showAlert(t('auth.pinLoginExt.biometricExpiredTitle'), t('auth.pinLoginExt.biometricExpiredMsg'));
        return;
      }

      setLoading(true);
      const res = await authApi.refresh(refreshToken, storedPhone ?? undefined);
      const { accessToken, refreshToken: newRefresh, setupComplete } = res.data.data;
      await setAuthenticated({ accessToken, refreshToken: newRefresh, setupComplete });
    } catch (err) {
      if (isAxiosError(err) && err.response?.status === 401) {
        await SecureStore.deleteItemAsync('refresh_token');
        setCanBiometric(false);
        showAlert(t('auth.pinLoginExt.sessionExpiredTitle'), t('auth.pinLoginExt.sessionExpiredMsg'));
      } else {
        showAlert(t('auth.pinLoginExt.biometricErrorTitle'), t('auth.pinLoginExt.biometricErrorMsg'));
      }
    } finally {
      setLoading(false);
    }
  };

  const handleEnableBiometric = async () => {
    if (enablingBiometric) return;
    setEnablingBiometric(true);
    try {
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: t('auth.biometricOffer.title', {
          type: t(biometricType === 'face'
            ? 'settings.securitySettings.faceId'
            : 'settings.securitySettings.fingerprint'),
        }),
        cancelLabel: t('auth.biometricOffer.notNow'),
        disableDeviceFallback: true,
      });
      if (!result.success) return;
      await setBiometricEnabled(true);
      setCanBiometric(true);
      setCanEnableBiometric(false);
      showAlert(
        t('auth.biometricOffer.title', {
          type: t(biometricType === 'face'
            ? 'settings.securitySettings.faceId'
            : 'settings.securitySettings.fingerprint'),
        }),
        t('auth.biometricOffer.hint'),
        [{ label: t('common.ok') }],
      );
    } catch {
      // user dismissed — no-op
    } finally {
      setEnablingBiometric(false);
    }
  };

  const handleChangeShop = async () => {
    navigation.replace('Login');
  };

  const isLocked = !!lockedUntil;

  const handleKeyInput = (text: string) => {
    if (text === 'l') { navigation.navigate('Login'); return; }
    const digit = text.slice(-1);
    if (!/^[0-9]$/.test(digit)) return;
    setPin((p) => (p + digit).slice(0, 6));
    hiddenRef.current?.setNativeProps({ text: '' });
  };

  return (
    <View
      className="flex-1 bg-white dark:bg-gray-900 px-6 items-center"
      style={{ paddingTop: insets.top + 32 }}
    >
      {/* Hidden input: digits → PIN, 'l' → Login screen */}
      <TextInput
        ref={hiddenRef}
        autoFocus
        keyboardType="number-pad"
        onChangeText={handleKeyInput}
        style={{ position: 'absolute', opacity: 0, width: 1, height: 1 }}
      />
      {/* Top bar */}
      <View className="w-full flex-row justify-between items-center mb-8">
        <View />
        <TouchableOpacity onPress={handleChangeShop}>
          <Text className={`${typo.label} text-primary`}>{t('auth.pinLoginExt.changeShop')}</Text>
        </TouchableOpacity>
      </View>

      <Text className={`${typo.heading} text-gray-900 dark:text-white mb-2`}>
        {nickname ? t('auth.pinLoginExt.greeting', { name: nickname }) : t('auth.pinLogin.title')}
      </Text>
      {storedPhone && (
        <Text className={`${typo.caption} text-gray-500 dark:text-gray-400 mb-12`}>
          {maskPhone(storedPhone)}
        </Text>
      )}

      {isLocked ? (
        <View className="items-center mt-8">
          <Text className="text-4xl mb-4">🔒</Text>
          <Text className={`${typo.body} text-gray-700 dark:text-gray-300 text-center mb-2`}>
            {t('auth.pinLoginExt.lockedTimer', {
              time: `${Math.floor(remainingSecs / 60)}:${String(remainingSecs % 60).padStart(2, '0')}`,
            })}
          </Text>
          <Text className={`${typo.caption} text-gray-500 dark:text-gray-400 text-center`}>
            {t('auth.pinLoginExt.lockedDesc')}
          </Text>
          <TouchableOpacity className="mt-6" onPress={() => navigation.navigate('Login')}>
            <Text className={`${typo.label} text-primary`}>{t('auth.pinLoginExt.loginByPassword')}</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <PinPad
          value={pin}
          onChange={setPin}
          loading={loading}
          onBiometric={canBiometric ? handleBiometric : undefined}
        />
      )}

      {!isLocked && (
        <>
          {/* "Enable Face ID" shortcut — shown when hardware is ready but user hasn't enabled it yet */}
          {canEnableBiometric && (
            <TouchableOpacity
              className="mt-6 flex-row items-center gap-1.5 px-4 py-2 rounded-full bg-indigo-50 dark:bg-indigo-900/30 active:opacity-70"
              onPress={handleEnableBiometric}
              disabled={enablingBiometric}
            >
              <MaterialCommunityIcons
                name={biometricType === 'face' ? 'face-recognition' : 'fingerprint'}
                size={16}
                color="#4f46e5"
              />
              <Text className={`${typo.caption} font-semibold text-indigo-600 dark:text-indigo-400`}>
                {enablingBiometric
                  ? t('common.loading')
                  : t('auth.biometricOffer.enable', {
                      type: t(
                        biometricType === 'face'
                          ? 'settings.securitySettings.faceId'
                          : 'settings.securitySettings.fingerprint',
                      ),
                    })}
              </Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity className="mt-6" onPress={() => navigation.navigate('ForgotPin')}>
            <Text className={`${typo.caption} text-primary`}>{t('auth.pinLogin.forgotPin')}</Text>
          </TouchableOpacity>
          <TouchableOpacity className="mt-4" onPress={() => navigation.navigate('Login')}>
            <Text className={`${typo.caption} text-gray-400 dark:text-gray-500`}>{t('auth.pinLoginExt.loginByPassword')}</Text>
          </TouchableOpacity>
        </>
      )}
    </View>
  );
}
