import { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { isAxiosError } from 'axios';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { PasswordInput } from '../../components/PasswordInput';
import { useTypography } from '../../hooks/useTypography';
import { authApi } from '../../services/api';
import { useAuthStore } from '../../store/authStore';
import { useAlertStore } from '../../store/alertStore';
import { PinPad } from '../../components/PinPad';
import type { AuthScreenProps } from '../../types/navigation';

type Step = 'verify' | 'new_pin' | 'confirm_pin';

export function ForgotPinScreen({ navigation }: AuthScreenProps<'ForgotPin'>) {
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const typo = useTypography();
  const { show: showAlert } = useAlertStore();
  const { storedPhone, setAuthenticated, setPinEnabled } = useAuthStore();
  const [step, setStep] = useState<Step>('verify');
  const [password, setPassword] = useState('');
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [loading, setLoading] = useState(false);

  const handleVerifyPassword = async () => {
    if (!password || !storedPhone) return;
    setLoading(true);
    try {
      const res = await authApi.login(storedPhone, password);
      const { accessToken, refreshToken, setupComplete } = res.data.data;
      await setAuthenticated({ accessToken, refreshToken, setupComplete });
      setStep('new_pin');
    } catch (err) {
      if (isAxiosError(err) && err.response?.status === 401) {
        showAlert(t('auth.forgotPinExt.wrongPasswordTitle'), t('auth.forgotPinExt.wrongPasswordMsg'));
      } else {
        showAlert(t('auth.forgotPinExt.networkErrorTitle'), t('auth.forgotPinExt.networkErrorMsg'));
      }
    } finally {
      setLoading(false);
    }
  };

  const handleNewPin = (value: string) => {
    setNewPin(value);
    if (value.length === 6) setTimeout(() => setStep('confirm_pin'), 200);
  };

  const handleConfirmPin = async (value: string) => {
    setConfirmPin(value);
    if (value.length !== 6) return;

    if (value !== newPin) {
      showAlert(t('auth.forgotPinExt.mismatchTitle'), t('auth.forgotPinExt.mismatchMsg'), [
        { label: t('auth.forgotPinExt.ok'), onPress: () => { setStep('new_pin'); setNewPin(''); setConfirmPin(''); } },
      ]);
      return;
    }

    setLoading(true);
    try {
      await authApi.setupPin(value);
    } catch {
      // Proceed even if endpoint missing
    }
    await setPinEnabled(true);
    setLoading(false);
    // Navigation happens automatically via RootNavigator state change
  };

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-white dark:bg-gray-900"
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View
        className="flex-1 px-6"
        style={{ paddingTop: insets.top + 16 }}
      >
        <TouchableOpacity
          className="mb-8 self-start"
          onPress={() => navigation.goBack()}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <MaterialCommunityIcons name="arrow-left" size={24} color="#374151" />
        </TouchableOpacity>

        <Text className={`${typo.heading} text-gray-900 dark:text-white mb-2`}>{t('auth.forgotPin.title')}</Text>
        <Text className={`${typo.caption} text-gray-500 dark:text-gray-400 mb-10 leading-5`}>
          {t('auth.forgotPinExt.subtitle')}
        </Text>

        {step === 'verify' && (
          <>
            <View className="mb-6">
              <Text className={`${typo.label} text-gray-700 dark:text-gray-300 mb-2`}>
                {t('auth.forgotPinExt.passwordLabel')}
              </Text>
              <PasswordInput
                value={password}
                onChangeText={setPassword}
                placeholder={t('auth.forgotPinExt.passwordPlaceholder')}
                returnKeyType="done"
                onSubmitEditing={handleVerifyPassword}
              />
            </View>

            <TouchableOpacity
              className={`rounded-2xl py-4 items-center ${
                loading || !password ? 'bg-gray-200 dark:bg-gray-700' : 'bg-primary active:opacity-80'
              }`}
              onPress={handleVerifyPassword}
              disabled={loading || !password}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text
                  className={`${typo.labelBold} ${!password ? 'text-gray-400 dark:text-gray-500' : 'text-white'}`}
                >
                  {t('auth.forgotPinExt.verify')}
                </Text>
              )}
            </TouchableOpacity>
          </>
        )}

        {(step === 'new_pin' || step === 'confirm_pin') && (
          <View className="items-center mt-4">
            <Text className={`${typo.section} text-gray-800 dark:text-gray-200 mb-2`}>
              {step === 'new_pin' ? t('auth.forgotPinExt.newPinTitle') : t('auth.pinSetup.confirmTitle')}
            </Text>
            <Text className={`${typo.caption} text-gray-500 dark:text-gray-400 mb-8 text-center`}>
              {step === 'new_pin'
                ? t('auth.forgotPinExt.newPinSubtitle')
                : t('auth.pinSetup.confirmSubtitle')}
            </Text>
            <PinPad
              value={step === 'new_pin' ? newPin : confirmPin}
              onChange={step === 'new_pin' ? handleNewPin : handleConfirmPin}
              loading={loading}
            />
          </View>
        )}
      </View>
    </KeyboardAvoidingView>
  );
}
