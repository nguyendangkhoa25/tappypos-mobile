import { useRef, useState } from 'react';
import { View, Text, TouchableOpacity, TextInput, KeyboardAvoidingView, Platform } from 'react-native';
import * as LocalAuthentication from 'expo-local-authentication';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { PinPad } from '../../components/PinPad';
import { useTypography } from '../../hooks/useTypography';
import { authApi } from '../../services/api';
import { useAuthStore } from '../../store/authStore';
import { useAlertStore } from '../../store/alertStore';

type Step = 'enter' | 'confirm' | 'biometric';
type BiometryKind = 'face' | 'fingerprint' | 'generic';

// Used in both Auth stack (pendingAccessToken present) and Settings stack (mode present)
export function PinSetupScreen({ navigation, route }: any) {
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const typo = useTypography();
  const { show: showAlert } = useAlertStore();
  const { setAuthenticated, setPinEnabled, setBiometricEnabled, biometricEnabled } = useAuthStore();
  const { pendingAccessToken, pendingRefreshToken, isFirstSetup, mode } = route.params ?? {};
  const isSettingsMode = !!mode;
  const isChangePinMode = mode === 'change';

  const [step, setStep] = useState<Step>('enter');
  const [firstPin, setFirstPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [loading, setLoading] = useState(false);
  const [biometryKind, setBiometryKind] = useState<BiometryKind>('generic');

  // ── Helpers ──────────────────────────────────────────────────────────────────

  /** Detect biometric type and return whether the device supports it. */
  const checkBiometricAvailable = async (): Promise<boolean> => {
    const [hasHardware, isEnrolled, types] = await Promise.all([
      LocalAuthentication.hasHardwareAsync(),
      LocalAuthentication.isEnrolledAsync(),
      LocalAuthentication.supportedAuthenticationTypesAsync(),
    ]);
    if (!hasHardware || !isEnrolled) return false;
    if (types.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION)) {
      setBiometryKind('face');
    } else if (types.includes(LocalAuthentication.AuthenticationType.FINGERPRINT)) {
      setBiometryKind('fingerprint');
    }
    return true;
  };

  /** Called after PIN is successfully saved. Decides whether to show biometric offer. */
  const proceedAfterPin = async () => {
    // Don't offer biometric when user is just changing an existing PIN,
    // or when it's already enabled.
    if (!isChangePinMode && !biometricEnabled) {
      const available = await checkBiometricAvailable();
      if (available) {
        setLoading(false);
        setStep('biometric');
        return;
      }
    }
    await finalize();
  };

  /** Navigate away after the full setup (PIN ± biometric) is complete. */
  const finalize = async () => {
    if (isSettingsMode) {
      setLoading(false);
      navigation.goBack();
      return;
    }
    if (pendingAccessToken) {
      await setAuthenticated({ accessToken: pendingAccessToken, refreshToken: pendingRefreshToken });
    }
    setLoading(false);
  };

  // ── PIN handlers ─────────────────────────────────────────────────────────────

  const handleFirstPin = (value: string) => {
    setFirstPin(value);
    if (value.length === 6) setTimeout(() => setStep('confirm'), 200);
  };

  const handleConfirmPin = async (value: string) => {
    setConfirmPin(value);
    if (value.length !== 6) return;

    if (value !== firstPin) {
      showAlert(t('auth.pinSetupExt.mismatchTitle'), t('auth.pinSetupExt.mismatchMsg'), [
        { label: t('auth.pinSetupExt.ok'), onPress: () => { setStep('enter'); setFirstPin(''); setConfirmPin(''); } },
      ]);
      return;
    }

    setLoading(true);
    try {
      await authApi.setupPin(value, pendingAccessToken);
      await setPinEnabled(true);
    } catch {
      setLoading(false);
      showAlert(t('auth.pinSetupExt.errorTitle'), t('auth.pinSetupExt.errorMsg'), [
        { label: t('auth.pinSetupExt.ok'), onPress: () => { setStep('enter'); setFirstPin(''); setConfirmPin(''); } },
      ]);
      return;
    }

    await proceedAfterPin();
  };

  const handleSkip = async () => {
    if (isSettingsMode) { navigation.goBack(); return; }
    await setPinEnabled(false);
    if (pendingAccessToken) {
      await setAuthenticated({ accessToken: pendingAccessToken, refreshToken: pendingRefreshToken });
    }
  };

  // ── Biometric offer handlers ─────────────────────────────────────────────────

  const handleEnableBiometric = async () => {
    await setBiometricEnabled(true);
    await finalize();
  };

  const handleSkipBiometric = async () => {
    await finalize();
  };

  // ── Derived ──────────────────────────────────────────────────────────────────

  const isConfirmStep = step === 'confirm';
  const hiddenRef = useRef<TextInput>(null);

  const biometricLabel =
    biometryKind === 'face'
      ? t('settings.securitySettings.faceId')
      : biometryKind === 'fingerprint'
      ? t('settings.securitySettings.fingerprint')
      : t('settings.securitySettings.biometricTitle');

  const biometricIcon =
    biometryKind === 'face' ? 'face-recognition'
    : biometryKind === 'fingerprint' ? 'fingerprint'
    : 'shield-account-outline';

  const handleKeyInput = (text: string) => {
    if (step === 'biometric') return; // no PIN pad on biometric step
    if (text === 'q') { handleSkip(); return; }
    const digit = text.slice(-1);
    if (!/^[0-9]$/.test(digit)) return;
    if (isConfirmStep) handleConfirmPin((confirmPin + digit).slice(0, 6));
    else handleFirstPin((firstPin + digit).slice(0, 6));
    hiddenRef.current?.setNativeProps({ text: '' });
  };

  // ── Biometric offer UI ───────────────────────────────────────────────────────

  if (step === 'biometric') {
    return (
      <View
        className="flex-1 bg-white dark:bg-gray-900 px-6 items-center justify-center"
        style={{ paddingBottom: insets.bottom + 32 }}
      >
        {/* Icon */}
        <View className="w-24 h-24 rounded-3xl bg-indigo-50 dark:bg-indigo-900/30 items-center justify-center mb-8">
          <MaterialCommunityIcons name={biometricIcon as any} size={52} color="#4f46e5" />
        </View>

        {/* Text */}
        <Text className={`${typo.heading} text-gray-900 dark:text-white text-center mb-3`}>
          {t('auth.biometricOffer.title', { type: biometricLabel })}
        </Text>
        <Text className={`${typo.caption} text-gray-500 dark:text-gray-400 text-center leading-5 mb-10`}>
          {t('auth.biometricOffer.subtitle', { type: biometricLabel })}
        </Text>

        {/* Enable button */}
        <TouchableOpacity
          onPress={handleEnableBiometric}
          activeOpacity={0.8}
          className="w-full bg-indigo-600 rounded-2xl py-4 items-center mb-4"
        >
          <Text className={`${typo.labelBold} text-white`}>
            {t('auth.biometricOffer.enable', { type: biometricLabel })}
          </Text>
        </TouchableOpacity>

        {/* Not now */}
        <TouchableOpacity onPress={handleSkipBiometric} activeOpacity={0.7} className="py-2">
          <Text className={`${typo.caption} text-gray-400 dark:text-gray-500`}>
            {t('auth.biometricOffer.notNow')}
          </Text>
        </TouchableOpacity>

        {/* Footer hint */}
        <Text className={`${typo.caption} text-gray-300 dark:text-gray-700 text-center mt-8 px-4`}>
          {t('auth.biometricOffer.hint')}
        </Text>
      </View>
    );
  }

  // ── PIN enter / confirm UI ───────────────────────────────────────────────────

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-white dark:bg-gray-900"
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View
        className="flex-1 px-6 items-center"
        style={{ paddingTop: insets.top + (isSettingsMode ? 16 : 48) }}
      >
        {/* Settings mode back button */}
        {isSettingsMode && (
          <TouchableOpacity
            className="self-start mb-8"
            onPress={() => navigation.goBack()}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <MaterialCommunityIcons name="arrow-left" size={24} color="#374151" />
          </TouchableOpacity>
        )}

        {/* Hidden input so hardware keyboard digits route to PinPad; 'q' = skip */}
        <TextInput
          ref={hiddenRef}
          autoFocus
          keyboardType="number-pad"
          onChangeText={handleKeyInput}
          style={{ position: 'absolute', opacity: 0, width: 1, height: 1 }}
        />
        <Text className={`${typo.heading} text-gray-900 dark:text-white mb-2`}>
          {isConfirmStep ? t('auth.pinSetup.confirmTitle') : (mode === 'change' ? t('settings.securitySettings.changePinTitle') : t('auth.pinSetup.title'))}
        </Text>
        <Text className={`${typo.caption} text-gray-500 dark:text-gray-400 mb-12 text-center`}>
          {isConfirmStep ? t('auth.pinSetup.confirmSubtitle') : t('auth.pinSetup.subtitle')}
        </Text>

        <PinPad
          value={isConfirmStep ? confirmPin : firstPin}
          onChange={isConfirmStep ? handleConfirmPin : handleFirstPin}
          loading={loading}
        />

        {!isConfirmStep && isFirstSetup && !isSettingsMode && (
          <TouchableOpacity className="mt-8" onPress={handleSkip}>
            <Text className={`${typo.caption} text-gray-400 dark:text-gray-500`}>
              {t('auth.pinSetupExt.skipFull')}
            </Text>
          </TouchableOpacity>
        )}

        {isConfirmStep && (
          <TouchableOpacity
            className="mt-8"
            onPress={() => { setStep('enter'); setFirstPin(''); setConfirmPin(''); }}
          >
            <Text className={`${typo.caption} text-gray-400 dark:text-gray-500`}>{t('auth.pinSetupExt.back')}</Text>
          </TouchableOpacity>
        )}
      </View>
    </KeyboardAvoidingView>
  );
}
