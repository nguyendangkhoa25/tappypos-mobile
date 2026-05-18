import { useRef, useState, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { isAxiosError } from 'axios';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { ClearableInput } from '../../components/ClearableInput';
import { PasswordInput } from '../../components/PasswordInput';
import { LanguageChip } from '../../components/LanguageChip';
import { useTypography } from '../../hooks/useTypography';
import { authApi } from '../../services/api';
import { SUPPORT } from '../../utils/constants';
import { useAuthStore } from '../../store/authStore';
import { useAlertStore } from '../../store/alertStore';
import type { AuthScreenProps } from '../../types/navigation';

export function LoginScreen({ navigation, route }: AuthScreenProps<'Login'>) {
  const insets = useSafeAreaInsets();
  const { t, i18n } = useTranslation();
  const typo = useTypography();
  const { setAuthenticated, setStoredPhone } = useAuthStore();
  const { show: showAlert } = useAlertStore();

  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [phoneError, setPhoneError] = useState('');
  const [loading, setLoading] = useState(false);
  const passwordRef = useRef<TextInput>(null);

  const welcomeMessage = useMemo(() => {
    const messages = t('auth.login.welcomeMessages', { returnObjects: true }) as string[];
    return Array.isArray(messages) ? messages[Math.floor(Math.random() * messages.length)] : '';
  }, [i18n.language]);

  const handleLogin = async () => {
    const trimmedPhone = phone.trim();
    if (!trimmedPhone || !password) return;
    setPhoneError('');
    setLoading(true);
    try {
      const res = await authApi.login(trimmedPhone, password);
      const { accessToken, refreshToken, setupComplete } = res.data.data;
      await setStoredPhone(trimmedPhone);
      await setAuthenticated({ accessToken, refreshToken, setupComplete });
    } catch (err) {
      if (isAxiosError(err)) {
        if (err.response?.status === 409 || err.response?.data?.error === 'DEVICE_CONFLICT') {
          // Auto force-login on device conflict — common on mobile, no confirmation needed
          try {
            const r2 = await authApi.forceLogin(trimmedPhone, password);
            const { accessToken, refreshToken, setupComplete: sc } = r2.data.data;
            await setStoredPhone(trimmedPhone);
            await setAuthenticated({ accessToken, refreshToken, setupComplete: sc });
          } catch {
            setPhoneError(t('auth.login.forceLoginError'));
          }
        } else if (err.response?.status === 423 || err.response?.data?.error === 'ACCOUNT_LOCKED') {
          showAlert(t('auth.login.locked'), t('auth.login.lockedSupport', { phone: SUPPORT.phone }));
        } else if (!err.response) {
          setPhoneError(t('auth.login.networkError'));
        } else {
          setPhoneError(t('auth.login.wrongCredentials'));
        }
      } else {
        setPhoneError(t('auth.login.unexpectedError'));
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-white dark:bg-gray-900"
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={{ flexGrow: 1, paddingTop: insets.top + 16, paddingBottom: 32 }}
        keyboardShouldPersistTaps="handled"
      >
        <View className="flex-1 px-6">
          {/* Top bar */}
          <View className="items-end mb-8">
            <LanguageChip />
          </View>

          {/* Header */}
          <View className="items-center mb-10">
            <View className="w-16 h-16 rounded-2xl items-center justify-center mb-4" style={{ backgroundColor: '#4f46e5' }}>
              <MaterialCommunityIcons name="store" size={36} color="white" />
            </View>
            <Text className={`${typo.heading} text-gray-900 dark:text-white`}>{t('auth.login.title')}</Text>
            <Text className={`${typo.caption} text-gray-500 dark:text-gray-400 mt-1`}>
              {t('auth.login.subtitleFull')}
            </Text>
            {!!welcomeMessage && (
              <View className="mt-4 px-4 py-2.5 bg-indigo-50 dark:bg-indigo-900/30 rounded-2xl">
                <Text className={`${typo.caption} text-indigo-700 dark:text-indigo-300 text-center leading-5`}>
                  {welcomeMessage}
                </Text>
              </View>
            )}
          </View>

          {/* Phone */}
          <View className="mb-4">
            <Text className={`${typo.label} text-gray-700 dark:text-gray-300 mb-2`}>
              {t('auth.login.phoneLabel')}
            </Text>
            <ClearableInput
              testID="login-phone"
              value={phone}
              onChangeText={(v) => { setPhone(v); setPhoneError(''); }}
              onClear={() => { setPhone(''); setPhoneError(''); }}
              placeholder={t('auth.login.phoneInputHint')}
              autoFocus
              keyboardType="default"
              returnKeyType="next"
              onSubmitEditing={() => passwordRef.current?.focus()}
            />
          </View>

          {/* Password */}
          <View className="mb-2">
            <Text className={`${typo.label} text-gray-700 dark:text-gray-300 mb-2`}>
              {t('auth.login.passwordLabel')}
            </Text>
            <PasswordInput
              ref={passwordRef}
              testID="login-password"
              value={password}
              onChangeText={(v) => { setPassword(v); setPhoneError(''); }}
              placeholder={t('auth.login.passwordInput')}
              returnKeyType="done"
              onSubmitEditing={handleLogin}
              showStrength={false}
            />
          </View>

          {/* Inline error */}
          {phoneError ? (
            <Text testID="login-error" className={`${typo.caption} text-red-500 mt-1 mb-2`}>{phoneError}</Text>
          ) : null}

          {/* Forgot password */}
          <TouchableOpacity
            className="self-end mb-6"
            onPress={() => navigation.navigate('ForgotPassword', { prefillPhone: phone.trim() })}
          >
            <Text className={`${typo.caption} text-primary`}>{t('auth.login.forgotPassword')}</Text>
          </TouchableOpacity>

          {/* Login button */}
          <TouchableOpacity
            testID="login-submit"
            className={`rounded-2xl py-4 items-center justify-center ${
              loading || !phone || !password ? 'bg-gray-200 dark:bg-gray-700' : 'bg-primary active:opacity-80'
            }`}
            onPress={handleLogin}
            disabled={loading || !phone || !password}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text
                className={`${typo.labelBold} ${
                  !phone || !password ? 'text-gray-400 dark:text-gray-500' : 'text-white'
                }`}
              >
                {t('auth.login.loginButton')}
              </Text>
            )}
          </TouchableOpacity>

          {/* Register link */}
          <View className="flex-row justify-center mt-6">
            <Text className={`${typo.caption} text-gray-500 dark:text-gray-400`}>{t('auth.login.noAccount')} </Text>
            <TouchableOpacity onPress={() => navigation.navigate('Register')}>
              <Text className={`${typo.label} text-primary`}>{t('auth.login.registerLink')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
