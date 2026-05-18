import { useRef, useState } from 'react';
import { View, Text, TouchableOpacity, TextInput, KeyboardAvoidingView, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { PinPad } from '../../components/PinPad';
import { useTypography } from '../../hooks/useTypography';
import { authApi } from '../../services/api';
import { useAuthStore } from '../../store/authStore';
import { useAlertStore } from '../../store/alertStore';

type Step = 'enter' | 'confirm';

// Used in both Auth stack (pendingAccessToken present) and Settings stack (mode present)
export function PinSetupScreen({ navigation, route }: any) {
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const typo = useTypography();
  const { show: showAlert } = useAlertStore();
  const { setAuthenticated, setPinEnabled } = useAuthStore();
  const { pendingAccessToken, pendingRefreshToken, isFirstSetup, mode } = route.params ?? {};
  const isSettingsMode = !!mode;

  const [step, setStep] = useState<Step>('enter');
  const [firstPin, setFirstPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [loading, setLoading] = useState(false);

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

  const handleSkip = async () => {
    if (isSettingsMode) { navigation.goBack(); return; }
    await setPinEnabled(false);
    if (pendingAccessToken) {
      await setAuthenticated({ accessToken: pendingAccessToken, refreshToken: pendingRefreshToken });
    }
  };

  const isConfirmStep = step === 'confirm';
  const hiddenRef = useRef<TextInput>(null);

  const handleKeyInput = (text: string) => {
    if (text === 'q') { handleSkip(); return; }
    const digit = text.slice(-1);
    if (!/^[0-9]$/.test(digit)) return;
    if (isConfirmStep) handleConfirmPin((confirmPin + digit).slice(0, 6));
    else handleFirstPin((firstPin + digit).slice(0, 6));
    hiddenRef.current?.setNativeProps({ text: '' });
  };

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
