import { useRef, useState, useEffect } from 'react';
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
import { authApi } from '../../services/api';
import { SUPPORT } from '../../utils/constants';
import { useAuthStore } from '../../store/authStore';
import { useAlertStore } from '../../store/alertStore';
import * as SecureStore from 'expo-secure-store';
import type { AuthScreenProps } from '../../types/navigation';

export function LoginScreen({ navigation, route }: AuthScreenProps<'Login'>) {
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const { setAuthenticated, setStoredPhone } = useAuthStore();
  const { show: showAlert } = useAlertStore();
  const noTenantRequired = route?.params?.noTenantRequired ?? false;

  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [phoneError, setPhoneError] = useState('');
  const [loading, setLoading] = useState(false);
  const [shopName, setShopName] = useState('');
  const passwordRef = useRef<TextInput>(null);

  useEffect(() => {
    if (!noTenantRequired) {
      SecureStore.getItemAsync('shop_name').then((v) => { if (v) setShopName(v); });
    }
  }, [noTenantRequired]);

  const handleChangeShop = async () => {
    await SecureStore.deleteItemAsync('tenant_id');
    await SecureStore.deleteItemAsync('shop_name');
    navigation.replace('ShopId');
  };

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
          <View className="mb-8">
            <View className="flex-row items-center justify-between">
              {noTenantRequired ? (
                <TouchableOpacity
                  onPress={() => navigation.goBack()}
                  className="flex-row items-center gap-1"
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <MaterialCommunityIcons name="chevron-left" size={20} color="#4f46e5" />
                  <Text className="text-sm text-primary font-semibold">{t('auth.login.backToShopId')}</Text>
                </TouchableOpacity>
              ) : (
                <View className="flex-row items-center gap-2">
                  <MaterialCommunityIcons name="store-outline" size={16} color="#9ca3af" />
                  {shopName ? (
                    <Text className="text-sm text-gray-600 dark:text-gray-400 font-medium">
                      {shopName}
                    </Text>
                  ) : (
                    <Text className="text-sm text-gray-400 dark:text-gray-500">{t('auth.login.shopLabel')}</Text>
                  )}
                </View>
              )}
              <View className="flex-row items-center gap-3">
                {!noTenantRequired && (
                  <TouchableOpacity onPress={handleChangeShop} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                    <Text className="text-sm text-primary font-semibold">{t('auth.login.changeShop')}</Text>
                  </TouchableOpacity>
                )}
                {noTenantRequired && <LanguageChip />}
              </View>
            </View>
            {/* Language chip drops below the row when Change Shop is visible */}
            {!noTenantRequired && (
              <View className="items-end mt-2">
                <LanguageChip />
              </View>
            )}
          </View>

          {/* Header */}
          <View className="items-center mb-10">
            <View className="w-16 h-16 rounded-2xl items-center justify-center mb-4" style={{ backgroundColor: '#4f46e5' }}>
              <MaterialCommunityIcons name="store" size={36} color="white" />
            </View>
            <Text className="text-3xl font-bold text-gray-900 dark:text-white">{t('auth.login.title')}</Text>
            <Text className="text-base text-gray-500 dark:text-gray-400 mt-1">
              {noTenantRequired ? t('auth.login.subtitleOnboarding') : t('auth.login.subtitleFull')}
            </Text>
          </View>

          {/* Phone */}
          <View className="mb-4">
            <Text className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
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
            <Text className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
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
            <Text testID="login-error" className="text-red-500 text-sm mt-1 mb-2">{phoneError}</Text>
          ) : null}

          {/* Forgot password */}
          <TouchableOpacity
            className="self-end mb-6"
            onPress={() => navigation.navigate('ForgotPassword', { prefillPhone: phone.trim() })}
          >
            <Text className="text-sm text-primary">{t('auth.login.forgotPassword')}</Text>
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
                className={`font-bold text-base ${
                  !phone || !password ? 'text-gray-400 dark:text-gray-500' : 'text-white'
                }`}
              >
                {t('auth.login.loginButton')}
              </Text>
            )}
          </TouchableOpacity>

          {/* Register link */}
          <View className="flex-row justify-center mt-6">
            <Text className="text-gray-500 dark:text-gray-400 text-sm">{t('auth.login.noAccount')} </Text>
            <TouchableOpacity onPress={() => navigation.navigate('Register')}>
              <Text className="text-primary font-semibold text-sm">{t('auth.login.registerLink')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
