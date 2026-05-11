import { useRef, useState } from 'react';
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
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { ClearableInput } from '../../components/ClearableInput';
import { PasswordInput } from '../../components/PasswordInput';
import { authApi } from '../../services/api';
import { useAuthStore } from '../../store/authStore';
import { useAlertStore } from '../../store/alertStore';
import * as SecureStore from 'expo-secure-store';
import type { AuthScreenProps } from '../../types/navigation';

export function LoginScreen({ navigation }: AuthScreenProps<'Login'>) {
  const insets = useSafeAreaInsets();
  const { setAuthenticated, setStoredPhone, pinEnabled } = useAuthStore();
  const { show: showAlert } = useAlertStore();

  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [phoneError, setPhoneError] = useState('');
  const [loading, setLoading] = useState(false);
  const [shopName, setShopName] = useState('');
  const passwordRef = useRef<TextInput>(null);

  // Load saved shop name on mount
  useState(() => {
    SecureStore.getItemAsync('shop_name').then((v) => { if (v) setShopName(v); });
  });

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
      const { accessToken, refreshToken } = res.data.data;
      await setStoredPhone(trimmedPhone);
      if (pinEnabled) {
        await setAuthenticated({ accessToken, refreshToken });
      } else {
        navigation.replace('PinSetup', {
          isFirstSetup: true,
          pendingAccessToken: accessToken,
          pendingRefreshToken: refreshToken,
        });
      }
    } catch (err) {
      if (isAxiosError(err)) {
        if (err.response?.status === 409 || err.response?.data?.error === 'DEVICE_CONFLICT') {
          // Auto force-login on device conflict — common on mobile, no confirmation needed
          try {
            const r2 = await authApi.forceLogin(trimmedPhone, password);
            const { accessToken, refreshToken } = r2.data.data;
            await setStoredPhone(trimmedPhone);
            if (pinEnabled) {
              await setAuthenticated({ accessToken, refreshToken });
            } else {
              navigation.replace('PinSetup', {
                isFirstSetup: true,
                pendingAccessToken: accessToken,
                pendingRefreshToken: refreshToken,
              });
            }
          } catch {
            setPhoneError('Đăng nhập thất bại. Vui lòng thử lại.');
          }
        } else if (err.response?.status === 423 || err.response?.data?.error === 'ACCOUNT_LOCKED') {
          showAlert('Tài khoản bị khóa', 'Vui lòng liên hệ hỗ trợ: 0901 234 567');
        } else if (!err.response) {
          setPhoneError('Không thể kết nối. Kiểm tra mạng và thử lại.');
        } else {
          setPhoneError('Sai số điện thoại hoặc mật khẩu.');
        }
      } else {
        setPhoneError('Đã xảy ra lỗi. Vui lòng thử lại.');
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
          {/* Top bar: shop name + change shop */}
          <View className="flex-row items-center justify-between mb-8">
            <View className="flex-row items-center gap-2">
              <MaterialCommunityIcons name="store-outline" size={16} color="#9ca3af" />
              {shopName ? (
                <Text className="text-sm text-gray-600 dark:text-gray-400 font-medium">
                  {shopName}
                </Text>
              ) : (
                <Text className="text-sm text-gray-400 dark:text-gray-500">Cửa hàng</Text>
              )}
            </View>
            <TouchableOpacity onPress={handleChangeShop} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Text className="text-sm text-primary font-semibold">Đổi cửa hàng</Text>
            </TouchableOpacity>
          </View>

          {/* Header */}
          <View className="items-center mb-10">
            <View className="w-16 h-16 bg-primary/10 rounded-2xl items-center justify-center mb-4">
              <MaterialCommunityIcons name="cash-register" size={36} color="#4f46e5" />
            </View>
            <Text className="text-3xl font-bold text-gray-900 dark:text-white">Đăng nhập</Text>
            <Text className="text-base text-gray-500 dark:text-gray-400 mt-1">
              Quản lý cửa hàng của bạn
            </Text>
          </View>

          {/* Phone */}
          <View className="mb-4">
            <Text className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
              Số điện thoại
            </Text>
            <ClearableInput
              testID="login-phone"
              value={phone}
              onChangeText={(v) => { setPhone(v); setPhoneError(''); }}
              onClear={() => { setPhone(''); setPhoneError(''); }}
              placeholder="Số điện thoại hoặc tên đăng nhập"
              autoFocus
              keyboardType="default"
              returnKeyType="next"
              onSubmitEditing={() => passwordRef.current?.focus()}
            />
          </View>

          {/* Password */}
          <View className="mb-2">
            <Text className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
              Mật khẩu
            </Text>
            <PasswordInput
              ref={passwordRef}
              testID="login-password"
              value={password}
              onChangeText={(v) => { setPassword(v); setPhoneError(''); }}
              placeholder="Nhập mật khẩu"
              returnKeyType="done"
              onSubmitEditing={handleLogin}
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
            <Text className="text-sm text-primary">Quên mật khẩu?</Text>
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
                Đăng nhập
              </Text>
            )}
          </TouchableOpacity>

          {/* Register link */}
          <View className="flex-row justify-center mt-6">
            <Text className="text-gray-500 dark:text-gray-400 text-sm">Chưa có tài khoản? </Text>
            <TouchableOpacity onPress={() => navigation.navigate('Register')}>
              <Text className="text-primary font-semibold text-sm">Đăng ký ngay</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
